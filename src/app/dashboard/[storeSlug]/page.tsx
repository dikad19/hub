import { Suspense, cache, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  HandCoins,
  Receipt,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { dayRange, formatDayKey, todayInTz } from "@/lib/tz";
import { METHOD_LABEL } from "@/lib/pos";
import { getCustomerBalances } from "@/lib/credit";
import { rupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalesChart, type ChartPoint } from "./sales-chart";
import { hasFeature } from "@/lib/features";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hub | Dashboard",
};

type Params = Promise<{ storeSlug: string }>;
type Ctx = {
  storeId: string;
  tz: string;
  isOwner: boolean;
  base: string;
  features: string[];
};
const DAYS = 7;
const methodLabel = (m: string) =>
  METHOD_LABEL[m as keyof typeof METHOD_LABEL] ?? m;
const qtyFmt = (n: number) =>
  n.toLocaleString("id-ID", { maximumFractionDigits: 3 });

/* ------------------------------ data ------------------------------ */

function lastDayKeys(today: string, n: number) {
  const [y, m, d] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (n - 1 - i))).toISOString().slice(0, 10),
  );
}

function weekRange(tz: string, today: string) {
  const keys = lastDayKeys(today, DAYS);
  return { start: dayRange(keys[0], tz).start, end: dayRange(today, tz).end };
}

type DayRow = { day: string; count: number; revenue: number; cost: number };

// Satu query untuk KPI dan grafik. Pengelompokan hari memakai zona waktu toko,
// sama seperti halaman laporan. cache() mencegah query ganda dalam satu render.
const getWeekSeries = cache(
  async (storeId: string, tz: string, today: string) => {
    const keys = lastDayKeys(today, DAYS);
    const { start, end } = weekRange(tz, today);

    const rows = await prisma.$queryRaw<DayRow[]>`
      WITH s AS (
        SELECT id, total, "createdAt" FROM "Sale"
        WHERE "storeId" = ${storeId} AND status = 'COMPLETED'
          AND "createdAt" >= ${start} AND "createdAt" < ${end}
      ), c AS (
        SELECT "saleId", SUM("costTotal") AS cost FROM "SaleItem"
        WHERE "saleId" IN (SELECT id FROM s) GROUP BY "saleId"
      )
      SELECT to_char(s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${tz}::text, 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS count,
             COALESCE(SUM(s.total), 0)::float8 AS revenue,
             COALESCE(SUM(c.cost), 0)::float8 AS cost
      FROM s LEFT JOIN c ON c."saleId" = s.id
      GROUP BY 1`;

    const byDay = new Map(rows.map((r) => [r.day, r]));
    return keys.map((k) => ({
      day: k,
      count: byDay.get(k)?.count ?? 0,
      revenue: byDay.get(k)?.revenue ?? 0,
      cost: byDay.get(k)?.cost ?? 0,
    }));
  },
);

const getBalances = cache((storeId: string) =>
  getCustomerBalances(prisma, storeId),
);

const shortDay = (key: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00Z`));

/* ------------------------------ page ------------------------------ */

export default function StoreHome({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <Home params={params} />
    </Suspense>
  );
}

async function Home({ params }: { params: Params }) {
  const { storeSlug } = await params;
  const { store, role, user } = await requireStoreAccess(storeSlug);
  const ctx: Ctx = {
    storeId: store.id,
    tz: store.timezone,
    isOwner: role === "OWNER",
    base: `/dashboard/${storeSlug}`,
    features: store.features,
  };
  const today = todayInTz(ctx.tz);
  const firstName = user.name.split(" ")[0];
  const stock = hasFeature(ctx.features, "stock");
  const credit = hasFeature(ctx.features, "credit");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Halo, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {store.name} · {formatDayKey(today)} {today.slice(0, 4)}
        </p>
      </div>

      <Suspense fallback={<KpiSkeleton />}>
        <Kpis ctx={ctx} />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 *:min-w-0 lg:grid-cols-1">
        <div className="lg:col-span-2">
          <Suspense fallback={<PanelSkeleton />}>
            <WeekChart ctx={ctx} />
          </Suspense>
        </div>
        {/* <Suspense fallback={<PanelSkeleton />}>
          <PaymentMix ctx={ctx} />
        </Suspense> */}
      </div>

      <div className="grid grid-cols-1 gap-4 *:min-w-0 lg:grid-cols-3">
        <div className={stock ? "lg:col-span-2" : "lg:col-span-3"}>
          <Suspense fallback={<PanelSkeleton />}>
            <TopProducts ctx={ctx} />
          </Suspense>
        </div>
        {stock && (
          <Suspense fallback={<PanelSkeleton />}>
            <LowStock ctx={ctx} />
          </Suspense>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 *:min-w-0 lg:grid-cols-3">
        <div className={credit ? "lg:col-span-2" : "lg:col-span-3"}>
          <Suspense fallback={<PanelSkeleton />}>
            <RecentSales ctx={ctx} />
          </Suspense>
        </div>
        {credit && (
          <Suspense fallback={<PanelSkeleton />}>
            <Debtors ctx={ctx} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

/* --------------------------- small parts --------------------------- */

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

function PanelSkeleton() {
  return <Skeleton className="h-80 w-full rounded-xl" />;
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>
  );
}

function Kpi({
  title,
  icon: Icon,
  value,
  sub,
}: {
  title: string;
  icon: LucideIcon;
  value: string;
  sub: ReactNode;
}) {
  return (
    <Card className="gap-2 py-4 sm:gap-4 sm:py-6">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
          <span className="truncate">{title}</span>
          <Icon className="size-4 shrink-0" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-4 sm:px-6">
        <p className="text-lg font-semibold tracking-tight tabular-nums sm:text-2xl">
          {value}
        </p>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return <>Belum ada penjualan kemarin</>;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 ${
        up
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      <Icon className="size-3.5" />
      {Math.abs(pct).toFixed(1)}% dari kemarin
    </span>
  );
}

async function Kpis({ ctx }: { ctx: Ctx }) {
  const today = todayInTz(ctx.tz);
  const credit = hasFeature(ctx.features, "credit");
  const [series, balances] = await Promise.all([
    getWeekSeries(ctx.storeId, ctx.tz, today),
    credit
      ? getBalances(ctx.storeId)
      : Promise.resolve(new Map<string, number>()),
  ]);

  const t = series[series.length - 1];
  const y = series[series.length - 2];
  const delta =
    y.revenue > 0 ? ((t.revenue - y.revenue) / y.revenue) * 100 : null;
  const avg = t.count > 0 ? Math.round(t.revenue / t.count) : 0;

  let owed = 0;
  let owing = 0;
  for (const b of balances.values()) {
    if (b > 0) {
      owed += b;
      owing++;
    }
  }

  const profit = t.revenue - t.cost;
  const margin = t.revenue > 0 ? (profit / t.revenue) * 100 : 0;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Kpi
        title="Penjualan"
        icon={Banknote}
        value={rupiah(t.revenue)}
        sub={<Delta pct={delta} />}
      />
      {ctx.isOwner ? (
        <Kpi
          title="Laba kotor"
          icon={TrendingUp}
          value={rupiah(profit)}
          sub={`Margin ${margin.toFixed(1)}%`}
        />
      ) : (
        <Kpi
          title="Rata-rata / transaksi"
          icon={TrendingUp}
          value={rupiah(avg)}
          sub="Hari ini"
        />
      )}
      <Kpi
        title="Transaksi"
        icon={Receipt}
        value={String(t.count)}
        sub={`Kemarin ${y.count} transaksi`}
      />

      {credit ? (
        <Kpi
          title="Piutang bon"
          icon={HandCoins}
          value={rupiah(owed)}
          sub={owing > 0 ? `${owing} pelanggan berutang` : "Tidak ada bon"}
        />
      ) : ctx.isOwner ? (
        <Kpi
          title="Rata-rata"
          icon={Receipt}
          value={rupiah(avg)}
          sub="Per transaksi hari ini"
        />
      ) : null}
    </div>
  );
}

async function WeekChart({ ctx }: { ctx: Ctx }) {
  const today = todayInTz(ctx.tz);
  const series = await getWeekSeries(ctx.storeId, ctx.tz, today);

  const total = series.reduce((a, d) => a + d.revenue, 0);
  const count = series.reduce((a, d) => a + d.count, 0);
  const data: ChartPoint[] = series.map((d) => ({
    short: shortDay(d.day),
    label: formatDayKey(d.day),
    revenue: d.revenue,
    ...(ctx.isOwner ? { profit: d.revenue - d.cost } : {}),
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Penjualan {DAYS} hari terakhir</CardTitle>
        <CardDescription>
          {rupiah(total)} dari {count} transaksi
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <Empty>Belum ada penjualan dalam {DAYS} hari terakhir.</Empty>
        ) : (
          <SalesChart data={data} showProfit={ctx.isOwner} />
        )}
      </CardContent>
    </Card>
  );
}

// async function PaymentMix({ ctx }: { ctx: Ctx }) {
//   const { start, end } = dayRange(todayInTz(ctx.tz), ctx.tz);
//   const rows = await prisma.salePayment.groupBy({
//     by: ["method"],
//     where: {
//       storeId: ctx.storeId,
//       createdAt: { gte: start, lt: end },
//       sale: { status: "COMPLETED" },
//     },
//     _sum: { amount: true },
//     _count: true,
//     orderBy: { _sum: { amount: "desc" } },
//   });
//   const total = rows.reduce((a, r) => a + (r._sum.amount ?? 0), 0);

//   return (
//     <Card className="h-full">
//       <CardHeader>
//         <CardTitle>Metode pembayaran</CardTitle>
//         <CardDescription>Hari ini</CardDescription>
//       </CardHeader>
//       <CardContent>
//         {rows.length === 0 ? (
//           <Empty>Belum ada pembayaran hari ini.</Empty>
//         ) : (
//           <ul className="space-y-4">
//             {rows.map((r) => {
//               const amt = r._sum.amount ?? 0;
//               const pct = total > 0 ? (amt / total) * 100 : 0;
//               return (
//                 <li key={r.method} className="space-y-1.5">
//                   <div className="flex items-center justify-between text-sm">
//                     <span>
//                       {methodLabel(r.method)}{" "}
//                       <span className="text-muted-foreground">
//                         ({r._count})
//                       </span>
//                     </span>
//                     <span className="font-medium tabular-nums">
//                       {rupiah(amt)}
//                     </span>
//                   </div>
//                   <div className="h-2 overflow-hidden rounded-full bg-muted">
//                     <div
//                       className="h-full rounded-full bg-primary"
//                       style={{ width: `${pct}%` }}
//                     />
//                   </div>
//                 </li>
//               );
//             })}
//           </ul>
//         )}
//       </CardContent>
//     </Card>
//   );
// }

async function TopProducts({ ctx }: { ctx: Ctx }) {
  const { start, end } = weekRange(ctx.tz, todayInTz(ctx.tz));
  const rows = await prisma.saleItem.groupBy({
    by: ["productName", "variantName", "unit"],
    where: {
      sale: {
        storeId: ctx.storeId,
        status: "COMPLETED",
        createdAt: { gte: start, lt: end },
      },
    },
    _sum: { qty: true, lineTotal: true, costTotal: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: 5,
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Produk terlaris</CardTitle>
        <CardDescription>
          {DAYS} hari terakhir, berdasarkan omzet
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty>Belum ada produk terjual.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Terjual
                </TableHead>
                <TableHead className="text-right">Omzet</TableHead>
                {ctx.isOwner && (
                  <TableHead className="hidden text-right sm:table-cell">
                    Laba
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const label =
                  r.variantName === "Standar"
                    ? r.productName
                    : `${r.productName} · ${r.variantName}`;
                const revenue = r._sum.lineTotal ?? 0;
                const profit = revenue - (r._sum.costTotal ?? 0);
                const qty = `${qtyFmt(r._sum.qty?.toNumber() ?? 0)} ${r.unit}`;
                return (
                  <TableRow key={`${label}|${r.unit}`}>
                    <TableCell className="font-medium whitespace-normal">
                      {label}
                      <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                        {qty}
                        {ctx.isOwner && ` · laba ${rupiah(profit)}`}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {qty}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {rupiah(revenue)}
                    </TableCell>
                    {ctx.isOwner && (
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {rupiah(profit)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

type LowRow = {
  id: string;
  productName: string;
  variantName: string;
  unit: string;
  stockQty: number;
  minStock: number;
  total: number;
};

async function LowStock({ ctx }: { ctx: Ctx }) {
  const rows = await prisma.$queryRaw<LowRow[]>`
    SELECT v.id, p.name AS "productName", v.name AS "variantName", v.unit,
           v."stockQty"::float8 AS "stockQty", v."minStock"::float8 AS "minStock",
           (COUNT(*) OVER ())::int AS total
    FROM "ProductVariant" v
    JOIN "Product" p ON p.id = v."productId"
    WHERE v."storeId" = ${ctx.storeId} AND v."isActive" = true AND p."isActive" = true
      AND v."stockMode" = 'DIRECT' AND v."minStock" IS NOT NULL
      AND v."stockQty" <= v."minStock"
    ORDER BY (v."stockQty" - v."minStock") ASC
    LIMIT 6`;
  const total = rows[0]?.total ?? 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Stok menipis
          {total > 0 && <Badge variant="destructive">{total}</Badge>}
        </CardTitle>
        <CardDescription>Stok di bawah batas minimum</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty>Semua stok aman.</Empty>
        ) : (
          <>
            <ul className="divide-y text-sm">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span className="min-w-0 truncate">
                    {r.variantName === "Standar"
                      ? r.productName
                      : `${r.productName} · ${r.variantName}`}
                  </span>
                  {r.stockQty <= 0 ? (
                    <Badge variant="destructive">Habis</Badge>
                  ) : (
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {qtyFmt(r.stockQty)} / {qtyFmt(r.minStock)} {r.unit}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <Link
              href={`${ctx.base}/products`}
              className="mt-3 block text-xs text-muted-foreground hover:underline"
            >
              {total > rows.length
                ? `+${total - rows.length} lainnya, lihat semua produk`
                : "Lihat semua produk"}
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

async function RecentSales({ ctx }: { ctx: Ctx }) {
  const sales = await prisma.sale.findMany({
    where: { storeId: ctx.storeId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      receiptNo: true,
      total: true,
      status: true,
      createdAt: true,
      customerName: true,
      customer: { select: { name: true } },
      cashier: { select: { name: true } },
      paymentLines: { select: { method: true } },
    },
  });

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ctx.tz,
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Transaksi terbaru
          <Link
            href={`${ctx.base}/sales`}
            className="text-xs font-normal text-muted-foreground hover:underline"
          >
            Lihat semua
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <Empty>Belum ada transaksi.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Struk</TableHead>
                <TableHead className="hidden sm:table-cell">Waktu</TableHead>
                <TableHead className="hidden xl:table-cell">Kasir</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Pembayaran
                </TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => {
                const who = s.customer?.name ?? s.customerName;
                const pay =
                  s.paymentLines
                    .map((l) => methodLabel(l.method))
                    .join(" + ") || "-";
                const time = fmt.format(s.createdAt);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-normal">
                      <Link
                        href={`${ctx.base}/sales/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        #{s.receiptNo}
                      </Link>
                      <span className="block text-xs text-muted-foreground sm:hidden">
                        {time} · {pay}
                        {who && ` · ${who}`}
                      </span>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                      {time}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {s.cashier?.name ?? "-"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {pay}
                      {who && (
                        <span className="block text-xs text-muted-foreground">
                          {who}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.status === "VOID" ? (
                        <span className="inline-flex items-center gap-2">
                          <Badge variant="destructive">Batal</Badge>
                          <span className="text-muted-foreground line-through">
                            {rupiah(s.total)}
                          </span>
                        </span>
                      ) : (
                        rupiah(s.total)
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

async function Debtors({ ctx }: { ctx: Ctx }) {
  const balances = await getBalances(ctx.storeId);
  const top = [...balances.entries()]
    .filter(([, b]) => b > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const customers = top.length
    ? await prisma.customer.findMany({
        where: { storeId: ctx.storeId, id: { in: top.map(([id]) => id) } },
        select: { id: true, name: true },
      })
    : [];
  const names = new Map(customers.map((c) => [c.id, c.name]));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Bon terbesar
          <Link
            href={`${ctx.base}/customers?filter=owing`}
            className="text-xs font-normal text-muted-foreground hover:underline"
          >
            Lihat semua
          </Link>
        </CardTitle>
        <CardDescription>Pelanggan dengan sisa bon tertinggi</CardDescription>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <Empty>Tidak ada bon yang belum lunas.</Empty>
        ) : (
          <ul className="divide-y text-sm">
            {top.map(([id, balance]) => (
              <li
                key={id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <Link
                  href={`${ctx.base}/customers/${id}`}
                  className="min-w-0 truncate hover:underline"
                >
                  {names.get(id) ?? "Pelanggan"}
                </Link>
                <span className="shrink-0 font-medium tabular-nums text-red-600 dark:text-red-400">
                  {rupiah(balance)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
