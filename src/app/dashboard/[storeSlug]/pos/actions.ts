"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireStoreAccess } from "@/lib/tenant";
import { lineTotalOf, milliToString, toMilli, variantLabel } from "@/lib/pos";
import { priceForQty } from "@/lib/pricing";

export type SaleInput = {
  items: { variantId: string; qty: string }[];
  discount: string;
  paymentMethod: "CASH" | "QRIS" | "TRANSFER" | "OTHER";
  amountPaid: string;
  customerName: string;
  note: string;
  idempotencyKey: string;
};

export type SaleResult =
  | { ok: true; saleId: string; receiptNo: number }
  | { ok: false; error: string };

const METHODS = ["CASH", "QRIS", "TRANSFER", "OTHER"];
const MAX_RUPIAH = 2_000_000_000;
const MAX_MILLI = BigInt(1_000_000_000); // 1.000.000 satuan per baris
const ZERO = BigInt(0);
const THOUSAND = BigInt(1000);

// true  = menu RECIPE ditolak kalau stok bahan kurang
// false = boleh terjual walau stok bahan jadi minus (stok bahan sering telat dicatat)
const STRICT_INGREDIENTS = true;

const fail = (error: string): SaleResult => ({ ok: false, error });
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const divRound = (a: bigint, b: bigint) => (a + b / BigInt(2)) / b;
const need = <T>(x: T | null): T => {
  if (x === null) throw new Error("TOO_BIG");
  return x;
};
const addTo = (m: Map<string, bigint>, id: string, q: bigint) =>
  m.set(id, (m.get(id) ?? ZERO) + q);

export async function createSale(
  storeSlug: string,
  input: SaleInput,
): Promise<SaleResult> {
  const { store, user } = await requireStoreAccess(storeSlug);

  // --- Validasi dasar ---
  const key = String(input?.idempotencyKey ?? "");
  if (key.length < 16 || key.length > 64) return fail("Permintaan tidak valid");

  const existing = await prisma.sale.findUnique({
    where: {
      storeId_idempotencyKey: { storeId: store.id, idempotencyKey: key },
    },
    select: { id: true, receiptNo: true },
  });
  if (existing)
    return { ok: true, saleId: existing.id, receiptNo: existing.receiptNo };

  if (
    !Array.isArray(input.items) ||
    input.items.length === 0 ||
    input.items.length > 100
  ) {
    return fail("Keranjang kosong");
  }
  if (!METHODS.includes(input.paymentMethod))
    return fail("Metode pembayaran tidak valid");

  const milliById = new Map<string, bigint>();
  for (const it of input.items) {
    const m = toMilli(String(it.qty));
    if (m === null || m <= ZERO) return fail("Jumlah tidak valid");
    addTo(milliById, String(it.variantId), m);
  }
  for (const m of milliById.values()) {
    if (m > MAX_MILLI) return fail("Jumlah terlalu besar");
  }

  const customerName = String(input.customerName ?? "")
    .trim()
    .slice(0, 80);
  const note = String(input.note ?? "")
    .trim()
    .slice(0, 200);
  const method = input.paymentMethod;

  try {
    const sale = await prisma.$transaction(
      async (tx) => {
        // 1. Nomor struk
        const { receiptCounter } = await tx.store.update({
          where: { id: store.id },
          data: { receiptCounter: { increment: 1 } },
          select: { receiptCounter: true },
        });

        // 2. Ambil varian yang dijual (aktif + isSellable) beserta resepnya
        const ids = [...milliById.keys()];
        const variants = await tx.productVariant.findMany({
          where: {
            id: { in: ids },
            storeId: store.id,
            isActive: true,
            isSellable: true,
            product: { isActive: true },
          },
          include: {
            product: { select: { name: true } },
            priceTiers: true,
            recipeLines: {
              include: {
                ingredient: {
                  include: { product: { select: { name: true } } },
                },
              },
            },
          },
        });
        if (variants.length !== ids.length) throw new Error("UNAVAILABLE");
        const byId = new Map(variants.map((v) => [v.id, v]));

        // 3. Hitung baris + kebutuhan stok
        const labels = new Map<string, string>(); // untuk pesan error
        const saleDemand = new Map<string, bigint>(); // DIRECT: varian itu sendiri
        const consDemand = new Map<string, bigint>(); // RECIPE: bahan yang terpakai

        let subtotal = 0;
        const lines = ids.map((id) => {
          const v = byId.get(id)!;
          const milli = milliById.get(id)!;
          const label = variantLabel(v.product.name, v.name);
          labels.set(v.id, label);
          if (!v.allowDecimal && milli % THOUSAND !== ZERO) {
            throw new Error("INTEGER:" + label);
          }
          const qty = milliToString(milli);
          const tiers = v.priceTiers.flatMap((t) => {
            const m = toMilli(t.minQty.toFixed(3));
            return m === null ? [] : [{ minQtyMilli: m, price: t.price }];
          });
          const price = priceForQty(v.price, tiers, milli);
          const lineTotal = need(lineTotalOf(price, qty));
          if (lineTotal > MAX_RUPIAH) throw new Error("TOO_BIG");
          subtotal += lineTotal;

          // HPP + kebutuhan stok menurut mode stok
          let costTotal = 0;
          let costPrice = v.costPrice;
          if (v.stockMode === "RECIPE") {
            if (v.recipeLines.length === 0)
              throw new Error("NO_RECIPE:" + label);
            for (const r of v.recipeLines) {
              const perPortion = need(toMilli(r.qty.toFixed(3)));
              const used = divRound(perPortion * milli, THOUSAND);
              if (used <= ZERO) continue;
              addTo(consDemand, r.ingredientVariantId, used);
              labels.set(
                r.ingredientVariantId,
                variantLabel(r.ingredient.product.name, r.ingredient.name),
              );
              costTotal += need(
                lineTotalOf(r.ingredient.costPrice, milliToString(used)),
              );
            }
            costPrice = Number(divRound(BigInt(costTotal) * THOUSAND, milli));
          } else {
            costTotal = need(lineTotalOf(v.costPrice, qty));
            if (v.stockMode === "DIRECT") addTo(saleDemand, v.id, milli);
            // NONE: tidak ada stok yang berkurang
          }

          return { v, qty, price, lineTotal, costTotal, costPrice };
        });
        if (subtotal > MAX_RUPIAH) throw new Error("TOO_BIG");

        // 4. Diskon & pembayaran
        if (
          digits(input.discount).length > 10 ||
          digits(input.amountPaid).length > 10
        ) {
          throw new Error("TOO_BIG");
        }
        const discount = Number(digits(input.discount) || "0");
        if (discount > subtotal) throw new Error("DISCOUNT");
        const total = subtotal - discount;

        let amountPaid = total;
        let change = 0;
        if (method === "CASH") {
          amountPaid = Number(digits(input.amountPaid) || "0");
          if (amountPaid < total) throw new Error("PAID_LESS");
          change = amountPaid - total;
        }

        // 5. Kurangi stok secara atomik (urut by id agar urutan lock konsisten).
        //    Satu varian bisa kena dua jenis kebutuhan (dijual langsung + dipakai resep).
        const demandIds = [
          ...new Set([...saleDemand.keys(), ...consDemand.keys()]),
        ].sort();
        const moves: {
          variantId: string;
          type: "SALE" | "CONSUMPTION";
          qty: string;
          balanceAfter: Prisma.Decimal;
        }[] = [];

        for (const vid of demandIds) {
          const s = saleDemand.get(vid) ?? ZERO;
          const c = consDemand.get(vid) ?? ZERO;
          const after = await tx.productVariant.update({
            where: { id: vid, storeId: store.id },
            data: { stockQty: { decrement: milliToString(s + c) } },
            select: { stockQty: true },
          });
          if ((s > ZERO || STRICT_INGREDIENTS) && after.stockQty.isNegative()) {
            throw new Error("STOCK:" + (labels.get(vid) ?? "bahan"));
          }
          if (s > ZERO) {
            moves.push({
              variantId: vid,
              type: "SALE",
              qty: "-" + milliToString(s),
              balanceAfter: after.stockQty.plus(milliToString(c)),
            });
          }
          if (c > ZERO) {
            moves.push({
              variantId: vid,
              type: "CONSUMPTION",
              qty: "-" + milliToString(c),
              balanceAfter: after.stockQty,
            });
          }
        }

        // 6. Simpan transaksi + item (snapshot) + pembayaran
        const created = await tx.sale.create({
          data: {
            storeId: store.id,
            receiptNo: receiptCounter,
            cashierId: user.id,
            customerName: customerName || null,
            subtotal,
            discount,
            total,
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
                price: l.price,
                costPrice: l.costPrice,
                lineTotal: l.lineTotal,
                costTotal: l.costTotal,
              })),
            },
            ...(total > 0
              ? {
                  paymentLines: {
                    create: [{ storeId: store.id, method, amount: total }],
                  },
                }
              : {}),
          },
          select: { id: true, receiptNo: true },
        });

        // 7. Ledger stok
        if (moves.length > 0) {
          await tx.stockMovement.createMany({
            data: moves.map((m) => ({
              storeId: store.id,
              variantId: m.variantId,
              type: m.type,
              qty: m.qty,
              balanceAfter: m.balanceAfter,
              saleId: created.id,
              createdById: user.id,
            })),
          });
        }

        return created;
      },
      { timeout: 15000, maxWait: 10000 },
    );

    revalidatePath(`/dashboard/${storeSlug}/sales`);
    revalidatePath(`/dashboard/${storeSlug}/products`);
    return { ok: true, saleId: sale.id, receiptNo: sale.receiptNo };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const again = await prisma.sale.findUnique({
        where: {
          storeId_idempotencyKey: { storeId: store.id, idempotencyKey: key },
        },
        select: { id: true, receiptNo: true },
      });
      if (again)
        return { ok: true, saleId: again.id, receiptNo: again.receiptNo };
    }
    if (e instanceof Error) {
      if (e.message === "UNAVAILABLE")
        return fail("Ada produk yang tidak tersedia lagi. Muat ulang halaman.");
      if (e.message === "TOO_BIG") return fail("Nominal terlalu besar");
      if (e.message === "DISCOUNT") return fail("Diskon melebihi subtotal");
      if (e.message === "PAID_LESS") return fail("Uang yang dibayar kurang");
      if (e.message.startsWith("STOCK:"))
        return fail(`Stok tidak cukup: ${e.message.slice(6)}`);
      if (e.message.startsWith("INTEGER:"))
        return fail(`"${e.message.slice(8)}" tidak boleh desimal`);
      if (e.message.startsWith("NO_RECIPE:"))
        return fail(`Resep "${e.message.slice(10)}" belum diisi`);
    }
    throw e;
  }
}
