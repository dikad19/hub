"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireStoreAccess } from "@/lib/tenant";
import { lineTotalOf, milliToString, toMilli, variantLabel } from "@/lib/pos";
import { normalizeDecimal } from "../products/validation";
import { priceForQty } from "@/lib/pricing";

export type PurchaseInput = {
  supplierName: string;
  invoiceNo: string;
  note: string;
  items: {
    variantId: string;
    unitName: string; // satuan beli: satuan dasar varian atau salah satu ProductVariantUnit
    qtyInput: string; // jumlah dalam satuan beli
    unitCost: string; // harga per satuan beli (rupiah)
  }[];
};

export type PurchaseResult =
  | { ok: true; purchaseId: string }
  | { ok: false; error: string };

const ZERO = BigInt(0);
const THOUSAND = BigInt(1000);
const MAX_RUPIAH = 2_000_000_000;
const MAX_QTY_MILLI = BigInt(1_000_000_000); // 1.000.000 satuan beli per baris
const MAX_BASE_MILLI = BigInt(1_000_000_000_000); // batas aman Decimal(14,3)

const fail = (error: string): PurchaseResult => ({ ok: false, error });
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
// Pembagian BigInt dibulatkan ke terdekat (setengah ke atas)
const divRound = (a: bigint, b: bigint) => (a + b / BigInt(2)) / b;

export async function createPurchase(
  storeSlug: string,
  input: PurchaseInput,
): Promise<PurchaseResult> {
  const { store, user, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER")
    return fail("Hanya pemilik toko yang bisa mencatat pembelian");

  if (
    !Array.isArray(input?.items) ||
    input.items.length === 0 ||
    input.items.length > 100
  ) {
    return fail("Belum ada barang yang dibeli");
  }

  // --- Validasi dasar tiap baris (faktor konversi TIDAK diambil dari client) ---
  const rows: {
    variantId: string;
    unitName: string;
    qtyInput: bigint;
    unitCost: number;
  }[] = [];
  for (const it of input.items) {
    const qtyInput = toMilli(normalizeDecimal(it.qtyInput));
    if (qtyInput === null || qtyInput <= ZERO || qtyInput > MAX_QTY_MILLI) {
      return fail("Jumlah tidak valid");
    }
    const cost = digits(it.unitCost);
    if (
      cost === "" ||
      cost.length > 10 ||
      Number(cost) <= 0 ||
      Number(cost) > MAX_RUPIAH
    ) {
      return fail("Harga beli tidak valid");
    }
    const unitName = String(it.unitName ?? "").trim();
    if (!unitName) return fail("Satuan beli wajib dipilih");
    rows.push({
      variantId: String(it.variantId),
      unitName,
      qtyInput,
      unitCost: Number(cost),
    });
  }

  const supplierName = String(input.supplierName ?? "")
    .trim()
    .slice(0, 80);
  const invoiceNo = String(input.invoiceNo ?? "")
    .trim()
    .slice(0, 60);
  const note = String(input.note ?? "")
    .trim()
    .slice(0, 200);

  try {
    const purchase = await prisma.$transaction(
      async (tx) => {
        // 1. Kunci baris varian (urut by id, sama seperti createSale) supaya
        //    penjualan yang bersamaan tidak merusak perhitungan HPP.
        const ids = [...new Set(rows.map((r) => r.variantId))].sort();
        await tx.$queryRaw`
          SELECT id FROM "ProductVariant"
          WHERE id IN (${Prisma.join(ids)}) AND "storeId" = ${store.id}
          ORDER BY id
          FOR UPDATE`;

        const variants = await tx.productVariant.findMany({
          where: {
            id: { in: ids },
            storeId: store.id,
            isActive: true,
            product: { isActive: true },
          },
          include: { product: { select: { name: true } }, units: true },
        });
        if (variants.length !== ids.length) throw new Error("UNAVAILABLE");
        const byId = new Map(variants.map((v) => [v.id, v]));

        // 2. Hitung tiap baris: konversi ke satuan dasar + harga modal per satuan dasar
        let total = 0;
        const computed = rows.map((r) => {
          const v = byId.get(r.variantId)!;
          const label = variantLabel(v.product.name, v.name);

          let unitName = v.unit;
          let factorMilli = THOUSAND; // satuan dasar: faktor 1
          if (r.unitName.toLowerCase() !== v.unit.toLowerCase()) {
            const u = v.units.find(
              (x) => x.name.toLowerCase() === r.unitName.toLowerCase(),
            );
            if (!u) throw new Error("UNIT:" + label);
            const f = toMilli(u.factor.toFixed(3));
            if (f === null || f <= ZERO) throw new Error("UNIT:" + label);
            unitName = u.name;
            factorMilli = f;
          }

          const qtyBase = divRound(r.qtyInput * factorMilli, THOUSAND);
          if (qtyBase <= ZERO || qtyBase > MAX_BASE_MILLI)
            throw new Error("TOO_BIG");
          if (!v.allowDecimal && qtyBase % THOUSAND !== ZERO)
            throw new Error("INTEGER:" + label);

          const qtyInputStr = milliToString(r.qtyInput);
          const lineTotal = lineTotalOf(r.unitCost, qtyInputStr);
          if (lineTotal === null || lineTotal > MAX_RUPIAH)
            throw new Error("TOO_BIG");
          total += lineTotal;

          return {
            v,
            unitName,
            factorStr: milliToString(factorMilli),
            qtyInputStr,
            unitCost: r.unitCost,
            qtyBaseMilli: qtyBase,
            qtyBaseStr: milliToString(qtyBase),
            lineTotal,
            // modal per satuan dasar pada pembelian ini
            costPerBase: Number(
              divRound(BigInt(lineTotal) * THOUSAND, qtyBase),
            ),
          };
        });
        if (total > MAX_RUPIAH) throw new Error("TOO_BIG");

        // 3. Supplier (cari berdasarkan nama, buat kalau belum ada)
        let supplierId: string | null = null;
        if (supplierName) {
          const s = await tx.supplier.upsert({
            where: { storeId_name: { storeId: store.id, name: supplierName } },
            update: {},
            create: { storeId: store.id, name: supplierName },
            select: { id: true },
          });
          supplierId = s.id;
        }

        // 4. Simpan pembelian + item (snapshot satuan, faktor, harga)
        const created = await tx.purchase.create({
          data: {
            storeId: store.id,
            supplierId,
            invoiceNo: invoiceNo || null,
            note: note || null,
            total,
            createdById: user.id,
            items: {
              create: computed.map((c) => ({
                variantId: c.v.id,
                unitName: c.unitName,
                unitFactor: c.factorStr,
                qtyInput: c.qtyInputStr,
                unitCost: c.unitCost,
                qty: c.qtyBaseStr,
                costPrice: c.costPerBase,
                lineTotal: c.lineTotal,
              })),
            },
          },
          select: { id: true },
        });

        // 5. Stok masuk + HPP rata-rata bergerak. Dibaca ulang per baris, jadi
        //    varian yang muncul dua kali (beda satuan) tetap dihitung berurutan.
        for (const c of computed) {
          const cur = await tx.productVariant.findUniqueOrThrow({
            where: { id: c.v.id },
            select: { stockQty: true, costPrice: true },
          });

          // Bobot stok lama hanya dihitung kalau stok > 0 dan modal lamanya diketahui
          // (costPrice 0 = belum pernah diisi, jangan menarik rata-rata ke bawah).
          const oldMilli = toMilli(cur.stockQty.toFixed(3)) ?? ZERO;
          const weight = oldMilli > ZERO && cur.costPrice > 0 ? oldMilli : ZERO;

          const newCost = Number(
            divRound(
              weight * BigInt(cur.costPrice) + BigInt(c.lineTotal) * THOUSAND,
              weight + c.qtyBaseMilli,
            ),
          );

          const updated = await tx.productVariant.update({
            where: { id: c.v.id },
            data: {
              costPrice: newCost,
              stockQty: { increment: c.qtyBaseStr },
            },
            select: { stockQty: true },
          });

          if (c.v.trackStock) {
            await tx.stockMovement.create({
              data: {
                storeId: store.id,
                variantId: c.v.id,
                type: "PURCHASE",
                qty: c.qtyBaseStr,
                balanceAfter: updated.stockQty,
                purchaseId: created.id,
                note: `${c.qtyInputStr} ${c.unitName}`,
                createdById: user.id,
              },
            });
          }
        }

        return created;
      },
      { timeout: 15000, maxWait: 10000 },
    );

    revalidatePath(`/dashboard/${storeSlug}/purchases`);
    revalidatePath(`/dashboard/${storeSlug}/products`);
    return { ok: true, purchaseId: purchase.id };
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "UNAVAILABLE")
        return fail("Ada produk yang tidak tersedia lagi. Muat ulang halaman.");
      if (e.message === "TOO_BIG")
        return fail("Nominal atau jumlah terlalu besar");
      if (e.message.startsWith("UNIT:"))
        return fail(`Satuan beli "${e.message.slice(5)}" tidak ditemukan`);
      if (e.message.startsWith("INTEGER:")) {
        return fail(
          `"${e.message.slice(8)}" tidak boleh desimal setelah konversi satuan`,
        );
      }
    }
    throw e;
  }
}
