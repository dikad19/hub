// Tanpa import server-only, jadi aman dipakai di client maupun server.

export type VariantInput = {
  id?: string
  name: string
  sku: string
  barcode: string
  unit: string
  allowDecimal: boolean
  price: string
  costPrice: string
  stock: string // stok awal, hanya dipakai untuk varian baru
  minStock: string
  isActive: boolean
}

export type CleanVariant = {
  id?: string
  name: string
  sku: string | null
  barcode: string | null
  unit: string
  allowDecimal: boolean
  price: number
  costPrice: number
  stock: string
  minStock: string | null
  isActive: boolean
}

const DEC = /^\d{1,10}(\.\d{1,3})?$/
const MAX_RUPIAH = 2_000_000_000

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '')

// Terima koma sebagai pemisah desimal ("2,5" -> "2.5")
export const normalizeDecimal = (v: unknown) =>
  String(v ?? '').trim().replace(',', '.')

export function parseVariants(
  json: string,
): { error: string } | { variants: CleanVariant[] } {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { error: 'Data varian tidak valid' }
  }
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) {
    return { error: 'Minimal satu varian' }
  }

  const out: CleanVariant[] = []
  for (const r of raw as Partial<VariantInput>[]) {
    const name = String(r.name ?? '').trim()
    if (!name) return { error: 'Nama varian wajib diisi' }

    if (digits(r.price) === '') return { error: `Harga jual "${name}" wajib diisi` }
    const price = Number(digits(r.price))
    const costPrice = Number(digits(r.costPrice) || '0')
    if (price > MAX_RUPIAH || costPrice > MAX_RUPIAH) {
      return { error: `Harga "${name}" terlalu besar` }
    }

    const allowDecimal = Boolean(r.allowDecimal)
    const stock = normalizeDecimal(r.stock) || '0'
    const minStock = normalizeDecimal(r.minStock) || null

    for (const [label, v] of [
      ['Stok awal', stock],
      ['Stok minimum', minStock],
    ] as const) {
      if (v === null) continue
      if (!DEC.test(v)) return { error: `${label} "${name}" tidak valid` }
      if (!allowDecimal && v.includes('.')) {
        return {
          error: `${label} "${name}" harus bilangan bulat (centang "Curah" untuk desimal)`,
        }
      }
    }

    out.push({
      id: r.id || undefined,
      name,
      sku: String(r.sku ?? '').trim() || null,
      barcode: String(r.barcode ?? '').trim() || null,
      unit: String(r.unit ?? '').trim() || 'pcs',
      allowDecimal,
      price,
      costPrice,
      stock,
      minStock,
      isActive: r.isActive !== false,
    })
  }

  const names = out.map((v) => v.name.toLowerCase())
  if (new Set(names).size !== names.length) {
    return { error: 'Nama varian tidak boleh sama dalam satu produk' }
  }
  return { variants: out }
}
