import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { getCustomerBalances } from "@/lib/credit";
import { rupiah } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const instant = false;

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { storeSlug } = await params;
  const { q = "", filter } = await searchParams;
  const { store, role } = await requireStoreAccess(storeSlug);
  const base = `/dashboard/${storeSlug}/customers`;
  const term = q.trim().slice(0, 80);

  const [customers, balances] = await Promise.all([
    prisma.customer.findMany({
      where: {
        storeId: store.id,
        ...(term
          ? { name: { contains: term, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 200,
    }),
    getCustomerBalances(prisma, store.id),
  ]);

  let totalOwed = 0;
  let owingCount = 0;
  for (const b of balances.values()) {
    if (b > 0) {
      totalOwed += b;
      owingCount++;
    }
  }

  const rows = customers
    .map((c) => ({ ...c, balance: balances.get(c.id) ?? 0 }))
    .filter((c) => (filter === "owing" ? c.balance > 0 : true))
    .sort(
      (a, b) => b.balance - a.balance || a.name.localeCompare(b.name, "id"),
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Pelanggan &amp; Bon</h1>
        {role === "OWNER" && (
          <Link href={`${base}/new`} className={buttonVariants()}>
            Tambah pelanggan
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border bg-background p-4">
          <p className="text-sm text-muted-foreground">Total piutang</p>
          <p className="text-2xl font-semibold">{rupiah(totalOwed)}</p>
        </div>
        <div className="rounded-md border bg-background p-4">
          <p className="text-sm text-muted-foreground">Pelanggan berutang</p>
          <p className="text-2xl font-semibold">{owingCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form className="flex gap-2">
          {filter && <input type="hidden" name="filter" value={filter} />}
          <Input
            name="q"
            defaultValue={term}
            placeholder="Cari nama..."
            className="w-56"
          />
          <Button type="submit" variant="outline">
            Cari
          </Button>
        </form>
        <Link
          href={base}
          className={buttonVariants({
            variant: filter === "owing" ? "outline" : "secondary",
            size: "sm",
          })}
        >
          Semua
        </Link>
        <Link
          href={`${base}?filter=owing`}
          className={buttonVariants({
            variant: filter === "owing" ? "secondary" : "outline",
            size: "sm",
          })}
        >
          Berutang
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {term || filter
            ? "Tidak ada pelanggan yang cocok."
            : "Belum ada pelanggan. Tambahkan pelanggan untuk mulai mencatat bon."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2 font-medium">Nama</th>
                <th className="p-2 font-medium">Telepon</th>
                <th className="p-2 text-right font-medium">Batas bon</th>
                <th className="p-2 text-right font-medium">Sisa bon</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="p-2">
                    <Link
                      href={`${base}/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-2">{c.phone ?? "-"}</td>
                  <td className="p-2 text-right text-muted-foreground">
                    {c.creditLimit === null
                      ? "Tanpa batas"
                      : rupiah(c.creditLimit)}
                  </td>
                  <td
                    className={`p-2 text-right font-medium ${
                      c.balance > 0 ? "text-red-600" : "text-muted-foreground"
                    }`}
                  >
                    {c.balance > 0 ? rupiah(c.balance) : "Lunas"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
