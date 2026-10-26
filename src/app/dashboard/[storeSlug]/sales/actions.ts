"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";

export type VoidResult = { error?: string; ok?: boolean };

// Void = batalkan transaksi tanpa menghapusnya; stok dikembalikan lewat ledger.
// SALE (barang langsung) -> SALE_VOID, CONSUMPTION (bahan resep) -> CONSUMPTION_VOID.
export async function voidSale(
  storeSlug: string,
  saleId: string,
  reason: string,
): Promise<VoidResult> {
  const { store, user, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER")
    return { error: "Hanya pemilik toko yang bisa membatalkan transaksi" };

  const why = String(reason ?? "")
    .trim()
    .slice(0, 200);
  if (!why) return { error: "Alasan wajib diisi" };

  try {
    await prisma.$transaction(async (tx) => {
      const r = await tx.sale.updateMany({
        where: { id: saleId, storeId: store.id, status: "COMPLETED" },
        data: {
          status: "VOID",
          voidedAt: new Date(),
          voidReason: why,
          voidedById: user.id,
        },
      });
      if (r.count === 0) throw new Error("NOT_VOIDABLE");

      const moves = await tx.stockMovement.findMany({
        where: {
          saleId,
          storeId: store.id,
          type: { in: ["SALE", "CONSUMPTION"] },
        },
        orderBy: [{ variantId: "asc" }, { createdAt: "asc" }], // urutan lock konsisten
      });
      for (const m of moves) {
        const back = m.qty.negated(); // qty penjualan negatif -> kembalikan positif
        const updated = await tx.productVariant.update({
          where: { id: m.variantId },
          data: { stockQty: { increment: back } },
          select: { stockQty: true },
        });
        await tx.stockMovement.create({
          data: {
            storeId: store.id,
            variantId: m.variantId,
            type: m.type === "SALE" ? "SALE_VOID" : "CONSUMPTION_VOID",
            qty: back,
            balanceAfter: updated.stockQty,
            saleId,
            note: why,
            createdById: user.id,
          },
        });
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_VOIDABLE") {
      return { error: "Transaksi tidak ditemukan atau sudah dibatalkan" };
    }
    throw e;
  }

  revalidatePath(`/dashboard/${storeSlug}/sales`);
  revalidatePath(`/dashboard/${storeSlug}/sales/${saleId}`);
  revalidatePath(`/dashboard/${storeSlug}/products`);
  return { ok: true };
}
