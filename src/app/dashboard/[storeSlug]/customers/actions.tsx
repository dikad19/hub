"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { getCustomerBalances } from "@/lib/credit";
import { rupiah } from "@/lib/format";

export type CustomerInput = {
  name: string;
  phone: string;
  note: string;
  creditLimit: string; // kosong = tanpa batas
};
export type PaymentInput = { amount: string; method: string; note: string };

export type CustomerResult =
  | { ok: true; customerId: string }
  | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_RUPIAH = 2_000_000_000;
const PAY_METHODS = ["CASH", "QRIS", "TRANSFER", "OTHER"] as const;
type PayMethod = (typeof PAY_METHODS)[number];

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

function parseCustomer(input: CustomerInput) {
  const name = String(input?.name ?? "")
    .trim()
    .slice(0, 80);
  if (!name) return { ok: false, error: "Nama pelanggan wajib diisi" } as const;

  const phone = String(input?.phone ?? "")
    .replace(/[^\d+]/g, "")
    .slice(0, 20);
  const note = String(input?.note ?? "")
    .trim()
    .slice(0, 200);

  const limit = digits(input?.creditLimit);
  if (limit.length > 10 || Number(limit) > MAX_RUPIAH) {
    return { ok: false, error: "Batas bon tidak valid" } as const;
  }

  return {
    ok: true,
    value: {
      name,
      phone: phone || null,
      note: note || null,
      creditLimit: limit === "" ? null : Number(limit),
    },
  } as const;
}

export async function createCustomer(
  storeSlug: string,
  input: CustomerInput,
): Promise<CustomerResult> {
  const { store, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER")
    return {
      ok: false,
      error: "Hanya pemilik toko yang bisa menambah pelanggan",
    };

  const parsed = parseCustomer(input);
  if (!parsed.ok) return parsed;

  const c = await prisma.customer.create({
    data: { storeId: store.id, ...parsed.value },
    select: { id: true },
  });

  revalidatePath(`/dashboard/${storeSlug}/customers`, "layout");
  return { ok: true, customerId: c.id };
}

export async function updateCustomer(
  storeSlug: string,
  customerId: string,
  input: CustomerInput,
): Promise<ActionResult> {
  const { store, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER")
    return {
      ok: false,
      error: "Hanya pemilik toko yang bisa mengubah pelanggan",
    };

  const parsed = parseCustomer(input);
  if (!parsed.ok) return parsed;

  const res = await prisma.customer.updateMany({
    where: { id: String(customerId), storeId: store.id },
    data: parsed.value,
  });
  if (res.count === 0) return { ok: false, error: "Pelanggan tidak ditemukan" };

  revalidatePath(`/dashboard/${storeSlug}/customers`, "layout");
  return { ok: true };
}

export async function recordPayment(
  storeSlug: string,
  customerId: string,
  input: PaymentInput,
): Promise<ActionResult> {
  const { store, user } = await requireStoreAccess(storeSlug);

  const amountStr = digits(input?.amount);
  if (
    amountStr === "" ||
    amountStr.length > 10 ||
    Number(amountStr) <= 0 ||
    Number(amountStr) > MAX_RUPIAH
  ) {
    return { ok: false, error: "Nominal tidak valid" };
  }
  const amount = Number(amountStr);

  const method = String(input?.method ?? "");
  if (!(PAY_METHODS as readonly string[]).includes(method)) {
    return { ok: false, error: "Metode pembayaran tidak valid" };
  }
  const note = String(input?.note ?? "")
    .trim()
    .slice(0, 200);

  try {
    await prisma.$transaction(async (tx) => {
      // Kunci baris pelanggan supaya dua pembayaran bersamaan tidak melebihi saldo
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Customer"
        WHERE id = ${customerId} AND "storeId" = ${store.id}
        FOR UPDATE`;
      if (locked.length === 0) throw new Error("NOT_FOUND");

      const balance =
        (await getCustomerBalances(tx, store.id, [customerId])).get(
          customerId,
        ) ?? 0;
      if (amount > balance) throw new Error("OVERPAY:" + balance);

      await tx.customerPayment.create({
        data: {
          storeId: store.id,
          customerId,
          amount,
          method: method as PayMethod,
          note: note || null,
          createdById: user.id,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "NOT_FOUND")
        return { ok: false, error: "Pelanggan tidak ditemukan" };
      if (e.message.startsWith("OVERPAY:")) {
        const left = Number(e.message.slice(8));
        return {
          ok: false,
          error:
            left > 0
              ? `Melebihi sisa bon (${rupiah(left)})`
              : "Pelanggan ini tidak punya sisa bon",
        };
      }
    }
    throw e;
  }

  revalidatePath(`/dashboard/${storeSlug}/customers`, "layout");
  return { ok: true };
}

export async function voidPayment(
  storeSlug: string,
  paymentId: string,
  reason: string,
): Promise<ActionResult> {
  const { store, user, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER")
    return {
      ok: false,
      error: "Hanya pemilik toko yang bisa membatalkan pembayaran",
    };

  const why = String(reason ?? "")
    .trim()
    .slice(0, 200);
  if (!why) return { ok: false, error: "Alasan wajib diisi" };

  // updateMany + voidedAt: null membuat pembatalan ganda mustahil
  const res = await prisma.customerPayment.updateMany({
    where: { id: String(paymentId), storeId: store.id, voidedAt: null },
    data: { voidedAt: new Date(), voidedById: user.id, voidReason: why },
  });
  if (res.count === 0)
    return {
      ok: false,
      error: "Pembayaran tidak ditemukan atau sudah dibatalkan",
    };

  revalidatePath(`/dashboard/${storeSlug}/customers`, "layout");
  return { ok: true };
}
