'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { requireStoreAccess } from '@/lib/tenant'
import { lineTotalOf, milliToString, toMilli, variantLabel } from '@/lib/pos'

export type SaleInput = {
  items: { variantId: string; qty: string }[]
  discount: string
  paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER' | 'OTHER'
  amountPaid: string
  customerName: string
  note: string
  idempotencyKey: string
}

export type SaleResult =
  | { ok: true; saleId: string; receiptNo: number }
  | { ok: false; error: string }

const METHODS = ['CASH', 'QRIS', 'TRANSFER', 'OTHER']
const MAX_RUPIAH = 2_000_000_000
const MAX_MILLI = BigInt(1_000_000_000) // 1.000.000 satuan per baris
const fail = (error: string): SaleResult => ({ ok: false, error })
const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '')

export async function createSale(storeSlug: string, input: SaleInput): Promise<SaleResult> {
  const { store, user } = await requireStoreAccess(storeSlug)

  // --- Validasi dasar ---
  const key = String(input?.idempotencyKey ?? '')
  if (key.length < 16 || key.length > 64) return fail('Permintaan tidak valid')

  // Sudah pernah diproses (retry / tap ganda)? Kembalikan hasil yang sama.
  const existing = await prisma.sale.findUnique({
    where: { storeId_idempotencyKey: { storeId: store.id, idempotencyKey: key } },
    select: { id: true, receiptNo: true },
  })
  if (existing) return { ok: true, saleId: existing.id, receiptNo: existing.receiptNo }

  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 100) {
    return fail('Keranjang kosong')
  }
  if (!METHODS.includes(input.paymentMethod)) return fail('Metode pembayaran tidak valid')

  // Gabungkan baris yang varian-nya sama
  const milliById = new Map<string, bigint>()
  for (const it of input.items) {
    const m = toMilli(String(it.qty))
    if (m === null || m <= BigInt(0)) return fail('Jumlah tidak valid')
    milliById.set(String(it.variantId), (milliById.get(String(it.variantId)) ?? BigInt(0)) + m)
  }
  for (const m of milliById.values()) {
    if (m > MAX_MILLI) return fail('Jumlah terlalu besar')
  }

  const customerName = String(input.customerName ?? '').trim().slice(0, 80)
  const note = String(input.note ?? '').trim().slice(0, 200)
  const method = input.paymentMethod

  try {
    const sale = await prisma.$transaction(
      async (tx) => {
        // 1. Nomor struk. Meng-update baris toko = penjualan satu toko berurutan.
        const { receiptCounter } = await tx.store.update({
          where: { id: store.id },
          data: { receiptCounter: { increment: 1 } },
          select: { receiptCounter: true },
        })

        // 2. Ambil varian (hanya milik toko ini dan aktif)
        const ids = [...milliById.keys()]
        const variants = await tx.productVariant.findMany({
          where: { id: { in: ids }, storeId: store.id, isActive: true, product: { isActive: true } },
          include: { product: { select: { name: true } } },
        })
        if (variants.length !== ids.length) throw new Error('UNAVAILABLE')
        const byId = new Map(variants.map((v) => [v.id, v]))

        // 3. Hitung baris (harga selalu dari database, bukan dari client)
        let subtotal = 0
        const lines = ids.map((id) => {
          const v = byId.get(id)!
          const milli = milliById.get(id)!
          const label = variantLabel(v.product.name, v.name)
          if (!v.allowDecimal && milli % BigInt(1000) !== BigInt(0)) {
            throw new Error('INTEGER:' + label)
          }
          const qty = milliToString(milli)
          const lineTotal = lineTotalOf(v.price, qty)!
          const costTotal = lineTotalOf(v.costPrice, qty)!
          if (lineTotal > MAX_RUPIAH) throw new Error('TOO_BIG')
          subtotal += lineTotal
          return { v, qty, lineTotal, costTotal, label }
        })
        if (subtotal > MAX_RUPIAH) throw new Error('TOO_BIG')

        // 4. Diskon & pembayaran
        if (digits(input.discount).length > 10 || digits(input.amountPaid).length > 10) {
          throw new Error('TOO_BIG')
        }
        const discount = Number(digits(input.discount) || '0')
        if (discount > subtotal) throw new Error('DISCOUNT')
        const total = subtotal - discount

        let amountPaid = total
        let change = 0
        if (method === 'CASH') {
          amountPaid = Number(digits(input.amountPaid) || '0')
          if (amountPaid < total) throw new Error('PAID_LESS')
          change = amountPaid - total
        }

        // 5. Kurangi stok secara atomik (urut by id agar urutan lock konsisten)
        const tracked = lines
          .filter((l) => l.v.trackStock)
          .sort((a, b) => (a.v.id < b.v.id ? -1 : 1))
        for (const l of tracked) {
          const r = await tx.productVariant.updateMany({
            where: { id: l.v.id, storeId: store.id, stockQty: { gte: l.qty } },
            data: { stockQty: { decrement: l.qty } },
          })
          if (r.count === 0) throw new Error('STOCK:' + l.label)
        }

        // 6. Simpan transaksi + item (snapshot nama, harga, modal)
        const created = await tx.sale.create({
          data: {
            storeId: store.id,
            receiptNo: receiptCounter,
            cashierId: user.id,
            customerName: customerName || null,
            subtotal,
            discount,
            total,
            paymentMethod: method,
            amountPaid,
            changeAmount: change,
            note: note || null,
            idempotencyKey: key,
            items: {
              create: lines.map((l) => ({
                variantId: l.v.id,
                productName: l.v.product.name,
                variantName: l.v.name,
                unit: l.v.unit,
                qty: l.qty,
                price: l.v.price,
                costPrice: l.v.costPrice,
                lineTotal: l.lineTotal,
                costTotal: l.costTotal,
              })),
            },
          },
          select: { id: true, receiptNo: true },
        })

        // 7. Catat ledger stok
        for (const l of tracked) {
          const { stockQty } = await tx.productVariant.findUniqueOrThrow({
            where: { id: l.v.id },
            select: { stockQty: true },
          })
          await tx.stockMovement.create({
            data: {
              storeId: store.id,
              variantId: l.v.id,
              type: 'SALE',
              qty: '-' + l.qty,
              balanceAfter: stockQty,
              saleId: created.id,
              createdById: user.id,
            },
          })
        }

        return created
      },
      { timeout: 15000, maxWait: 10000 },
    )

    revalidatePath(`/dashboard/${storeSlug}/sales`)
    revalidatePath(`/dashboard/${storeSlug}/products`)
    return { ok: true, saleId: sale.id, receiptNo: sale.receiptNo }
  } catch (e) {
    // Dua request dengan key yang sama berbarengan: salah satunya kalah di unique constraint
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const again = await prisma.sale.findUnique({
        where: { storeId_idempotencyKey: { storeId: store.id, idempotencyKey: key } },
        select: { id: true, receiptNo: true },
      })
      if (again) return { ok: true, saleId: again.id, receiptNo: again.receiptNo }
    }
    if (e instanceof Error) {
      if (e.message === 'UNAVAILABLE') return fail('Ada produk yang tidak tersedia lagi. Muat ulang halaman.')
      if (e.message === 'TOO_BIG') return fail('Nominal terlalu besar')
      if (e.message === 'DISCOUNT') return fail('Diskon melebihi subtotal')
      if (e.message === 'PAID_LESS') return fail('Uang yang dibayar kurang')
      if (e.message.startsWith('STOCK:')) return fail(`Stok tidak cukup: ${e.message.slice(6)}`)
      if (e.message.startsWith('INTEGER:')) return fail(`"${e.message.slice(8)}" tidak boleh desimal`)
    }
    throw e
  }
}
