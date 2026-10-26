import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { getCustomerBalances } from "@/lib/credit";
import { rupiah } from "@/lib/format";
import { METHOD_LABEL } from "@/lib/pos";
import { CustomerForm } from "../customer-form";
import { PaymentForm } from "./payment-form";
import { VoidPaymentButton } from "./void-payment-button";

export const instant = false;

type Entry = {
  key: string;
  at: Date;
  label: string;
  amount: number; // positif = menambah bon, negatif = mengurangi
  href?: string;
  paymentId?: string;
  voided?: boolean;
  voidReason?: string | null;
};

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ storeSlug: string; customerId: string }>;
}) {
  const { storeSlug, customerId } = await params;
  const { store, role } = await requireStoreAccess(storeSlug);

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId: store.id },
  });
  if (!customer) notFound();

  const [balances, sales, payments, returns] = await Promise.all([
    getCustomerBalances(prisma, store.id, [customer.id]),
    prisma.sale.findMany({
      where: {
        storeId: store.id,
        customerId: customer.id,
        status: "COMPLETED",
        creditAmount: { gt: 0 },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        receiptNo: true,
        createdAt: true,
        creditAmount: true,
      },
    }),
    prisma.customerPayment.findMany({
      where: { storeId: store.id, customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.saleReturn.findMany({
      where: {
        storeId: store.id,
        customerId: customer.id,
        creditOffset: { gt: 0 },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, returnNo: true, createdAt: true, creditOffset: true },
    }),
  ]);

  const balance = balances.get(customer.id) ?? 0;
  const base = `/dashboard/${storeSlug}`;

  const entries: Entry[] = [
    ...sales.map((s) => ({
      key: `s-${s.id}`,
      at: s.createdAt,
      label: `Bon dari struk #${s.receiptNo}`,
      amount: s.creditAmount,
      href: `${base}/sales/${s.id}`,
    })),
    ...payments.map((p) => ({
      key: `p-${p.id}`,
      at: p.createdAt,
      label: `Pembayaran (${METHOD_LABEL[p.method as keyof typeof METHOD_LABEL] ?? p.method})${
        p.note ? ` · ${p.note}` : ""
      }`,
      amount: -p.amount,
      paymentId: p.id,
      voided: p.voidedAt !== null,
      voidReason: p.voidReason,
    })),
    ...returns.map((r) => ({
      key: `r-${r.id}`,
      at: r.createdAt,
      label: `Retur #${r.returnNo} (potong bon)`,
      amount: -r.creditOffset,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const fmt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: store.timezone,
  });

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`${base}/customers`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Semua pelanggan
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{customer.name}</h1>
        <p className="text-sm text-muted-foreground">
          {[customer.phone, customer.note].filter(Boolean).join(" · ") ||
            "Tanpa kontak"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border bg-background p-4">
          <p className="text-sm text-muted-foreground">Sisa bon</p>
          <p
            className={`text-2xl font-semibold ${balance > 0 ? "text-red-600" : ""}`}
          >
            {balance > 0 ? rupiah(balance) : "Lunas"}
          </p>
        </div>
        <div className="rounded-md border bg-background p-4">
          <p className="text-sm text-muted-foreground">Batas bon</p>
          <p className="text-2xl font-semibold">
            {customer.creditLimit === null
              ? "Tanpa batas"
              : rupiah(customer.creditLimit)}
          </p>
          {customer.creditLimit !== null && (
            <p className="text-xs text-muted-foreground">
              Sisa kuota {rupiah(Math.max(customer.creditLimit - balance, 0))}
            </p>
          )}
        </div>
      </div>

      {balance > 0 && (
        <PaymentForm
          storeSlug={storeSlug}
          customerId={customer.id}
          balance={balance}
        />
      )}

      {role === "OWNER" && (
        <details className="rounded-md border bg-background p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Ubah data pelanggan
          </summary>
          <div className="pt-4">
            <CustomerForm
              storeSlug={storeSlug}
              customer={{
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                note: customer.note,
                creditLimit: customer.creditLimit,
              }}
            />
          </div>
        </details>
      )}

      <div className="space-y-2">
        <h2 className="font-medium">Riwayat</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada riwayat bon.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 font-medium">Tanggal</th>
                  <th className="p-2 font-medium">Keterangan</th>
                  <th className="p-2 text-right font-medium">Jumlah</th>
                  {role === "OWNER" && <th className="p-2" />}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.key} className="border-t align-top">
                    <td className="p-2 whitespace-nowrap">
                      {fmt.format(e.at)}
                    </td>
                    <td className="p-2">
                      <span
                        className={
                          e.voided ? "text-muted-foreground line-through" : ""
                        }
                      >
                        {e.href ? (
                          <Link href={e.href} className="hover:underline">
                            {e.label}
                          </Link>
                        ) : (
                          e.label
                        )}
                      </span>
                      {e.voided && (
                        <p className="text-xs text-muted-foreground">
                          Dibatalkan: {e.voidReason}
                        </p>
                      )}
                    </td>
                    <td
                      className={`p-2 text-right whitespace-nowrap ${
                        e.voided
                          ? "text-muted-foreground line-through"
                          : e.amount > 0
                            ? "text-red-600"
                            : "text-green-600"
                      }`}
                    >
                      {e.amount > 0 ? "+" : "-"} {rupiah(Math.abs(e.amount))}
                    </td>
                    {role === "OWNER" && (
                      <td className="p-2 text-right">
                        {e.paymentId && !e.voided && (
                          <VoidPaymentButton
                            storeSlug={storeSlug}
                            paymentId={e.paymentId}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
