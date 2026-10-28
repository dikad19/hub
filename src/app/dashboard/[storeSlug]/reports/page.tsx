import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import {
  dayKey,
  dayRange,
  formatDateTime,
  formatDayKey,
  isDateStr,
  isMonthStr,
  monthLabel,
  monthRange,
  todayInTz,
} from "@/lib/tz";
import { METHOD_LABEL } from "@/lib/pos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hub | Reports",
};

type Params = Promise<{ storeSlug: string }>;
type SP = Promise<{ view?: string; date?: string; month?: string }>;

const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");
const qtyFmt = (n: number) =>
  n.toLocaleString("id-ID", { maximumFractionDigits: 3 });
const methodLabel = (m: string) =>
  METHOD_LABEL[m as keyof typeof METHOD_LABEL] ?? m;

export default function ReportsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  return (
    <Suspense fallback={<p>Memuat laporan...</p>}>
      <Report params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Report({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { storeSlug } = await params;
  const sp = await searchParams;
  const { store, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER") redirect(`/dashboard/${storeSlug}`);

  const tz = store.timezone;
  const today = todayInTz(tz);
  const view = sp.view === "monthly" ? "monthly" : "daily";
  const date = sp.date && isDateStr(sp.date) ? sp.date : today;
  const month = sp.month && isMonthStr(sp.month) ? sp.month : today.slice(0, 7);
  const { start, end } =
    view === "daily" ? dayRange(date, tz) : monthRange(month, tz);

  const [sales, voidCount] = await Promise.all([
    prisma.sale.findMany({
      where: {
        storeId: store.id,
        status: "COMPLETED",
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        receiptNo: true,
        total: true,
        discount: true,
        paymentLines: { select: { method: true, amount: true } },
        createdAt: true,
        items: {
          select: {
            productName: true,
            variantName: true,
            unit: true,
            qty: true,
            lineTotal: true,
            costTotal: true,
          },
        },
      },
    }),
    prisma.sale.count({
      where: {
        storeId: store.id,
        status: "VOID",
        createdAt: { gte: start, lt: end },
      },
    }),
  ]);

  // Agregasi di JS supaya pengelompokan per hari memakai zona waktu toko.
  // Kalau data sudah sangat besar, pindahkan ke SQL (date_trunc ... AT TIME ZONE).
  let revenue = 0;
  let cost = 0;
  let discountSum = 0;
  const byDay = new Map<
    string,
    { count: number; revenue: number; cost: number }
  >();
  const byMethod = new Map<string, { count: number; revenue: number }>();
  const byProduct = new Map<
    string,
    { name: string; unit: string; qty: number; revenue: number; profit: number }
  >();

  for (const s of sales) {
    const saleCost = s.items.reduce((a, i) => a + i.costTotal, 0);
    revenue += s.total;
    cost += saleCost;
    discountSum += s.discount;

    const dk = dayKey(s.createdAt, tz);
    const d = byDay.get(dk) ?? { count: 0, revenue: 0, cost: 0 };
    d.count += 1;
    d.revenue += s.total;
    d.cost += saleCost;
    byDay.set(dk, d);

    for (const line of s.paymentLines) {
      const m = byMethod.get(line.method) ?? { count: 0, revenue: 0 };
      m.count += 1;
      m.revenue += line.amount;
      byMethod.set(line.method, m);
    }

    for (const i of s.items) {
      const label =
        i.variantName === "Standar"
          ? i.productName
          : `${i.productName} · ${i.variantName}`;
      const k = `${label}|${i.unit}`;
      const p = byProduct.get(k) ?? {
        name: label,
        unit: i.unit,
        qty: 0,
        revenue: 0,
        profit: 0,
      };
      p.qty += Number(i.qty.toString());
      p.revenue += i.lineTotal;
      p.profit += i.lineTotal - i.costTotal;
      byProduct.set(k, p);
    }
  }

  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const avg = sales.length > 0 ? Math.round(revenue / sales.length) : 0;
  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const days = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1));

  const tab = (active: boolean) =>
    active
      ? "border-b-2 border-primary pb-1 font-medium"
      : "pb-1 text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Laporan penjualan</h1>
          <p className="text-sm text-muted-foreground">
            {view === "daily"
              ? formatDayKey(date) + " " + date.slice(0, 4)
              : monthLabel(month)}{" "}
            · zona waktu {tz}
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link
            href={`?view=daily&date=${date}`}
            className={tab(view === "daily")}
          >
            Harian
          </Link>
          <Link
            href={`?view=monthly&month=${month}`}
            className={tab(view === "monthly")}
          >
            Bulanan
          </Link>
        </div>
      </div>

      <form method="get" className="flex items-center gap-2 text-sm">
        <input type="hidden" name="view" value={view} />
        {view === "daily" ? (
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-md border px-2 py-1"
          />
        ) : (
          <input
            type="month"
            name="month"
            defaultValue={month}
            className="rounded-md border px-2 py-1"
          />
        )}
        <Button type="submit" size="sm">
          Lihat
        </Button>
        <Link
          href={
            view === "daily"
              ? `?view=daily&date=${today}`
              : `?view=monthly&month=${today.slice(0, 7)}`
          }
          className="underline"
        >
          {view === "daily" ? "Hari ini" : "Bulan ini"}
        </Link>
      </form>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {rp(revenue)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Laba kotor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{rp(profit)}</p>
            <p className="text-xs text-muted-foreground">
              margin {margin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{sales.length}</p>
            {voidCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {voidCount} dibatalkan
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rata-rata / transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{rp(avg)}</p>
            {discountSum > 0 && (
              <p className="text-xs text-muted-foreground">
                diskon {rp(discountSum)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {sales.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Belum ada penjualan pada periode ini.
        </p>
      )}

      {view === "monthly" && days.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Per hari</h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="p-2">Tanggal</th>
                  <th className="p-2 text-right">Transaksi</th>
                  <th className="p-2 text-right">Penjualan</th>
                  <th className="p-2 text-right">Laba kotor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {days.map(([k, d]) => (
                  <tr key={k}>
                    <td className="p-2">
                      <Link
                        href={`?view=daily&date=${k}`}
                        className="underline"
                      >
                        {formatDayKey(k)}
                      </Link>
                    </td>
                    <td className="p-2 text-right">{d.count}</td>
                    <td className="p-2 text-right">{rp(d.revenue)}</td>
                    <td className="p-2 text-right">{rp(d.revenue - d.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {sales.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-2">
            <h2 className="font-medium">Metode pembayaran</h2>
            <ul className="divide-y rounded-md border text-sm">
              {[...byMethod.entries()].map(([m, v]) => (
                <li key={m} className="flex justify-between p-2">
                  <span>
                    {methodLabel(m)} ({v.count})
                  </span>
                  <span>{rp(v.revenue)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">Produk terlaris</h2>
            <ul className="divide-y rounded-md border text-sm">
              {topProducts.map((p) => (
                <li
                  key={`${p.name}|${p.unit}`}
                  className="flex justify-between gap-2 p-2"
                >
                  <span>
                    {p.name}
                    <span className="block text-xs text-muted-foreground">
                      {qtyFmt(p.qty)} {p.unit} · laba {rp(p.profit)}
                    </span>
                  </span>
                  <span>{rp(p.revenue)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {view === "daily" && sales.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Transaksi</h2>
          <ul className="divide-y rounded-md border text-sm">
            {sales.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/${storeSlug}/sales/${s.id}`}
                  className="flex justify-between gap-2 p-2 hover:bg-muted"
                >
                  <span>
                    #{s.receiptNo} · {formatDateTime(s.createdAt, tz)} ·{" "}
                    {s.paymentLines
                      .map((l) => methodLabel(l.method))
                      .join(" + ") || "-"}
                  </span>
                  <span>{rp(s.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Laba kotor = penjualan (setelah diskon) − harga modal barang terjual.
        Transaksi yang dibatalkan tidak dihitung. Pengeluaran operasional belum
        termasuk.
      </p>
    </div>
  );
}
