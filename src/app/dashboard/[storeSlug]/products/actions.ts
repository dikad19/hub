'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { requireStoreAccess } from '@/lib/tenant'
import { normalizeDecimal, parseVariants, type CleanVariant } from './validation'

export type FormState = { error?: string; ok?: boolean }

const NOT_OWNER = 'Hanya pemilik toko yang bisa mengubah produk'
const DUPLICATE = 'SKU atau barcode sudah dipakai varian lain'

function isDuplicate(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
}

// Membuat varian + (kalau stok awal > 0) satu baris ledger INITIAL.
async function createVariant(
  tx: Prisma.TransactionClient,
  storeId: string,
  productId: string,
  userId: string,
  v: CleanVariant,
) {
  const created = await tx.productVariant.create({
    data: {
      storeId,
      productId,
      name: v.name,
      sku: v.sku,
      barcode: v.barcode,
      unit: v.unit,
      allowDecimal: v.allowDecimal,
      price: v.price,
      costPrice: v.costPrice,
      stockQty: v.stock,
      minStock: v.minStock,
      isActive: v.isActive,
    },
  })

  if (Number(v.stock) > 0) {
    await tx.stockMovement.create({
      data: {
        storeId,
        variantId: created.id,
        type: 'INITIAL',
        qty: v.stock,
        balanceAfter: v.stock,
        createdById: userId,
      },
    })
  }
}

export async function createProduct(
  storeSlug: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { store, user, role } = await requireStoreAccess(storeSlug)
  if (role !== 'OWNER') return { error: NOT_OWNER }

  const name = String(fd.get('name') ?? '').trim()
  if (!name) return { error: 'Nama produk wajib diisi' }

  const parsed = parseVariants(String(fd.get('variants') ?? ''))
  if ('error' in parsed) return { error: parsed.error }

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { storeId: store.id, name } })
      for (const v of parsed.variants) {
        await createVariant(tx, store.id, product.id, user.id, v)
      }
    })
  } catch (e) {
    if (isDuplicate(e)) return { error: DUPLICATE }
    throw e
  }

  revalidatePath(`/dashboard/${storeSlug}/products`)
  redirect(`/dashboard/${storeSlug}/products`)
}

export async function updateProduct(
  storeSlug: string,
  productId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { store, user, role } = await requireStoreAccess(storeSlug)
  if (role !== 'OWNER') return { error: NOT_OWNER }

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
  })
  if (!product) return { error: 'Produk tidak ditemukan' }

  const name = String(fd.get('name') ?? '').trim()
  if (!name) return { error: 'Nama produk wajib diisi' }
  const isActive = fd.get('isActive') === 'on'

  const parsed = parseVariants(String(fd.get('variants') ?? ''))
  if ('error' in parsed) return { error: parsed.error }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: product.id }, data: { name, isActive } })

      for (const v of parsed.variants) {
        if (v.id) {
          // Stok TIDAK diubah di sini; hanya lewat adjustStock (ledger).
          const r = await tx.productVariant.updateMany({
            where: { id: v.id, storeId: store.id, productId: product.id },
            data: {
              name: v.name,
              sku: v.sku,
              barcode: v.barcode,
              unit: v.unit,
              allowDecimal: v.allowDecimal,
              price: v.price,
              costPrice: v.costPrice,
              minStock: v.minStock,
              isActive: v.isActive,
            },
          })
          if (r.count === 0) throw new Error('VARIANT_NOT_FOUND')
        } else {
          await createVariant(tx, store.id, product.id, user.id, v)
        }
      }
    })
  } catch (e) {
    if (isDuplicate(e)) return { error: DUPLICATE }
    if (e instanceof Error && e.message === 'VARIANT_NOT_FOUND') {
      return { error: 'Varian tidak ditemukan' }
    }
    throw e
  }

  revalidatePath(`/dashboard/${storeSlug}/products`)
  redirect(`/dashboard/${storeSlug}/products`)
}

// Arsipkan / aktifkan produk (pengganti hapus, karena produk dengan riwayat tidak boleh dihapus)
export async function setProductActive(
  storeSlug: string,
  productId: string,
  isActive: boolean,
) {
  const { store, role } = await requireStoreAccess(storeSlug)
  if (role !== 'OWNER') return

  await prisma.product.updateMany({
    where: { id: productId, storeId: store.id },
    data: { isActive },
  })
  revalidatePath(`/dashboard/${storeSlug}/products`)
}

// Penyesuaian stok: tambah (+) atau kurangi (-). Selalu lewat ledger.
export async function adjustStock(
  storeSlug: string,
  variantId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { store, user, role } = await requireStoreAccess(storeSlug)
  if (role !== 'OWNER') return { error: NOT_OWNER }

  const delta = normalizeDecimal(fd.get('delta'))
  const note = String(fd.get('note') ?? '').trim().slice(0, 200)

  if (!/^[+-]?\d{1,10}(\.\d{1,3})?$/.test(delta) || Number(delta) === 0) {
    return { error: 'Jumlah tidak valid (contoh: 10 atau -2,5)' }
  }

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, storeId: store.id },
  })
  if (!variant) return { error: 'Varian tidak ditemukan' }
  if (!variant.allowDecimal && delta.includes('.')) {
    return { error: 'Varian ini tidak mengizinkan desimal' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // increment atomik: aman walau ada penjualan bersamaan
      const updated = await tx.productVariant.update({
        where: { id: variant.id },
        data: { stockQty: { increment: delta } },
        select: { stockQty: true },
      })
      if (updated.stockQty.isNegative()) throw new Error('NEGATIVE_STOCK')

      await tx.stockMovement.create({
        data: {
          storeId: store.id,
          variantId: variant.id,
          type: 'ADJUSTMENT',
          qty: delta,
          balanceAfter: updated.stockQty,
          note: note || null,
          createdById: user.id,
        },
      })
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'NEGATIVE_STOCK') {
      return { error: 'Stok tidak boleh menjadi minus' }
    }
    throw e
  }

  revalidatePath(`/dashboard/${storeSlug}/products`)
  revalidatePath(`/dashboard/${storeSlug}/products/${variant.productId}`)
  return { ok: true }
}
