'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { requireStoreAccess } from '@/lib/tenant'
import { normalizeDecimal } from './validation'
import type { FormState } from './actions'

const NOT_OWNER = 'Hanya pemilik toko yang bisa mengubah produk'
const QTY = /^\d{1,10}(\.\d{1,3})?$/
const MAX_RUPIAH = 2_000_000_000

// Tambah tier grosir: "beli >= minQty (satuan dasar) -> harga per satuan dasar = price"
export async function addPriceTier(
  storeSlug: string,
  variantId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { store, role } = await requireStoreAccess(storeSlug)
  if (role !== 'OWNER') return { error: NOT_OWNER }

  const minQty = normalizeDecimal(fd.get('minQty'))
  const priceDigits = String(fd.get('price') ?? '').replace(/\D/g, '')

  if (!QTY.test(minQty) || Number(minQty) <= 0) {
    return { error: 'Jumlah minimum tidak valid (contoh: 12 atau 2,5)' }
  }
  if (
    priceDigits === '' ||
    priceDigits.length > 10 ||
    Number(priceDigits) <= 0 ||
    Number(priceDigits) > MAX_RUPIAH
  ) {
    return { error: 'Harga grosir tidak valid' }
  }
  const price = Number(priceDigits)

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, storeId: store.id },
  })
  if (!variant) return { error: 'Varian tidak ditemukan' }
  if (!variant.allowDecimal && minQty.includes('.')) {
    return { error: 'Varian ini bukan curah, jumlah minimum harus bilangan bulat' }
  }
  if (price >= variant.price) {
    return { error: 'Harga grosir harus lebih murah dari harga jual normal' }
  }

  try {
    await prisma.variantPriceTier.create({
      data: { storeId: store.id, variantId: variant.id, minQty, price },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Jumlah minimum itu sudah punya harga grosir' }
    }
    throw e
  }

  revalidatePath(`/dashboard/${storeSlug}/products/${variant.productId}`)
  revalidatePath(`/dashboard/${storeSlug}/pos`)
  return { ok: true }
}

// Penjualan lama aman: harga sudah di-snapshot di SaleItem.price.
export async function deletePriceTier(storeSlug: string, tierId: string) {
  const { store, role } = await requireStoreAccess(storeSlug)
  if (role !== 'OWNER') return

  await prisma.variantPriceTier.deleteMany({ where: { id: tierId, storeId: store.id } })
  revalidatePath(`/dashboard/${storeSlug}/products`, 'layout')
  revalidatePath(`/dashboard/${storeSlug}/pos`)
}
