"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { normalizeDecimal } from "./validation";
import type { FormState } from "./actions";

const NOT_OWNER = "Hanya pemilik toko yang bisa mengubah resep";
const QTY = /^\d{1,7}(\.\d{1,3})?$/;

// Simpan seluruh resep satu menu (ganti total). qty = jumlah bahan per 1 porsi,
// dalam SATUAN DASAR bahan (pakai satuan kecil seperti gram supaya presisi).
export async function saveRecipe(
  storeSlug: string,
  menuVariantId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { store, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER") return { error: NOT_OWNER };

  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("lines") ?? "[]"));
  } catch {
    return { error: "Data resep tidak valid" };
  }
  if (!Array.isArray(raw) || raw.length > 50)
    return { error: "Data resep tidak valid" };

  const seen = new Set<string>();
  const lines: { ingredientVariantId: string; qty: string }[] = [];
  for (const r of raw as { ingredientVariantId?: string; qty?: string }[]) {
    const id = String(r.ingredientVariantId ?? "");
    if (!id) continue; // baris kosong dilewati
    const qty = normalizeDecimal(r.qty);
    if (!QTY.test(qty) || Number(qty) <= 0) {
      return { error: "Jumlah bahan tidak valid (contoh: 15 atau 0,5)" };
    }
    if (id === menuVariantId)
      return { error: "Menu tidak bisa jadi bahan dirinya sendiri" };
    if (seen.has(id))
      return { error: "Bahan yang sama tidak boleh muncul dua kali" };
    seen.add(id);
    lines.push({ ingredientVariantId: id, qty });
  }

  const menu = await prisma.productVariant.findFirst({
    where: { id: menuVariantId, storeId: store.id },
    select: { id: true, productId: true, stockMode: true },
  });
  if (!menu) return { error: "Menu tidak ditemukan" };
  if (menu.stockMode !== "RECIPE") {
    return { error: 'Ubah mode stok varian ini ke "Stok dari resep" dulu' };
  }

  const valid = await prisma.productVariant.count({
    where: {
      id: { in: [...seen] },
      storeId: store.id,
      stockMode: "DIRECT",
      isActive: true,
    },
  });
  if (valid !== seen.size) {
    return {
      error:
        'Bahan harus berupa varian dengan mode "Stok langsung" di toko ini',
    };
  }

  await prisma.$transaction([
    prisma.recipeItem.deleteMany({
      where: { menuVariantId: menu.id, storeId: store.id },
    }),
    prisma.recipeItem.createMany({
      data: lines.map((l) => ({
        storeId: store.id,
        menuVariantId: menu.id,
        ingredientVariantId: l.ingredientVariantId,
        qty: l.qty,
      })),
    }),
  ]);

  revalidatePath(`/dashboard/${storeSlug}/products/${menu.productId}`);
  revalidatePath(`/dashboard/${storeSlug}/pos`);
  return { ok: true };
}
