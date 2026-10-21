// Murni (tanpa import server-only): aman dipakai di server action maupun komponen klien
// untuk pratinjau. Harga yang SAH tetap dihitung ulang di server (createSale).

export type PriceTier = {
  minQtyMilli: bigint // jumlah minimum dalam satuan dasar x 1000
  price: number // harga per satuan dasar, rupiah
}

// Pilih tier dengan minQty tertinggi yang terpenuhi. Harga itu berlaku untuk
// SELURUH qty baris (bukan hanya selisihnya). Tidak ada tier terpenuhi: harga normal.
export function priceForQty(basePrice: number, tiers: PriceTier[], qtyMilli: bigint): number {
  let best: PriceTier | null = null
  for (const t of tiers) {
    if (qtyMilli >= t.minQtyMilli && (best === null || t.minQtyMilli > best.minQtyMilli)) {
      best = t
    }
  }
  return best ? best.price : basePrice
}
