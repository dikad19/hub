'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { requireStoreAccess } from '@/lib/tenant'
import { normalizeDecimal } from './validation'
import type { FormState } from './actions'

const NOT_OWNER = 'Hanya pemilik toko yang bisa mengubah produk'
const FACTOR = /^\d{1,10}(\.\d{1,3})?$/

// Tambah satuan beli untuk satu varian. Contoh: name "karung", factor "50" (satuan dasar kg).
export async function addVariantUnit(
  storeSlug: string,
  variantId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { store, role } = await requireStoreAccess(storeSlug)
  if (role !== 'OWNER') return { error: NOT_OWNER }

  const name = String(fd.get('name') ?? '').trim().slice(0, 30)
  const factor = normalizeDecimal(fd.get('factor'))
  if (!name) return { error: 'Nama satuan wajib diisi' }
  if (!FACTOR.test(factor) || Number(factor) <= 0) {
    return { error: 'Faktor tidak valid (contoh: 50 atau 0,5)' }
  }

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, storeId: store.id },
  })
  if (!variant) return { error: 'Varian tidak ditemukan' }
  if (name.toLowerCase() === variant.unit.toLowerCase()) {
    return { error: `"${name}" sudah menjadi satuan dasar varian ini` }
  }
  if (!variant.allowDecimal && factor.includes('.')) {
    return { error: 'Varian ini bukan curah, faktor harus bilangan bulat' }
  }

  const dup = await prisma.productVariantUnit.findFirst({
    where: { variantId: variant.id, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  })
  if (dup) return { error: `Satuan "${name}" sudah ada` }

  try {
    await prisma.productVariantUnit.create({
      data: { storeId: store.id, variantId: variant.id, name, factor },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: `Satuan "${name}" sudah ada` }
    }
    throw e
  }

  revalidatePath(`/dashboard/${storeSlug}/products/${variant.productId}`)
  return { ok: true }
}

// Hapus satuan. Riwayat pembelian aman: nama & faktor sudah di-snapshot di PurchaseItem.
export async function deleteVariantUnit(storeSlug: string, unitId: string) {
  const { store, role } = await requireStoreAccess(storeSlug)
  if (role !== 'OWNER') return

  await prisma.productVariantUnit.deleteMany({ where: { id: unitId, storeId: store.id } })
  revalidatePath(`/dashboard/${storeSlug}/products`, 'layout')
}
