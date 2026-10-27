import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, ReceiptText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { METHOD_LABEL } from "@/lib/pos";
import { Skeleton } from "@/components/ui/skeleton";

type Params = Promise<{ storeSlug: string }>;

const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");

export default function SalesPage({ params }: { params: Params }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Transaksi</h1>
        <p className="text-sm text-muted-foreground">50 transaksi terakhir.</p>
      </div>
      <Suspense fallback={<SalesSkeleton />}>
        <SalesList params={params} />
      </Suspense>
    </div>
  );
}

async function SalesList({ params }: { params: Params }) {
  const { storeSlug } = await params;
  const { store } = await requireStoreAccess(storeSlug);

  const sales = await prisma.sale.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      cashier: { select: { name: true } },
      paymentLines: { select: { method: true } },
      _count: { select: { items: true } },
    },
  });

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <ReceiptText className="size-8 text-muted-foreground" />
        <div>
          <p className="font-medium">Belum ada transaksi</p>
          <p className="text-sm text-muted-foreground">
            Transaksi akan muncul di sini setelah ada penjualan di kasir.
          </p>
        </div>
        <Link
          href={`/dashboard/${storeSlug}/pos`}
          className="text-sm font-medium underline underline-offset-4"
        >
          Buka kasir
        </Link>
      </div>
    );
  }

  const tz = store.timezone;
  const dayFmt = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: tz,
  });
  const timeFmt = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: tz,
  });

  const completed = sales.filter((s) => s.status !== "VOID");
  const voided = sales.length - completed.length;
  const revenue = completed.reduce((a, s) => a + s.total, 0);

  const groups = new Map<string, typeof sales>();
  for (const s of sales) {
    const key = dayFmt.format(s.createdAt);
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Penjualan" value={rp(revenue)} />
        <Stat
          label="Transaksi selesai"
          value={completed.length.toLocaleString("id-ID")}
        />
        <Stat label="Dibatalkan" value={voided.toLocaleString("id-ID")} />
      </div>

      {[...groups.entries()].map(([day, rows]) => {
        const dayTotal = rows
          .filter((s) => s.status !== "VOID")
          .reduce((a, s) => a + s.total, 0);
        return (
          <section key={day} className="space-y-2">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-sm font-medium">{day}</h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {rp(dayTotal)}
              </span>
            </div>
            <ul className="divide-y overflow-hidden rounded-lg border bg-card">
              {rows.map((s) => {
                const isVoid = s.status === "VOID";
                const methods = [
                  ...new Set(s.paymentLines.map((p) => p.method)),
                ];
                return (
                  <li key={s.id}>
                    <Link
                      href={`/dashboard/${storeSlug}/sales/${s.id}`}
                      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                    >
                      <div className="grid h-10 min-w-12 place-items-center rounded-md bg-muted px-2 font-mono text-xs">
                        #{s.receiptNo}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          {timeFmt.format(s.createdAt)}
                          {isVoid && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                              VOID
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.cashier ? `${s.cashier.name} · ` : ""}
                          {s._count.items} item
                          {s.customerName ? ` · ${s.customerName}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-medium tabular-nums ${isVoid ? "text-muted-foreground line-through" : ""}`}
                        >
                          {rp(s.total)}
                        </p>
                        <div className="mt-1 flex justify-end gap-1">
                          {methods.map((m) => (
                            <Chip key={m}>{METHOD_LABEL[m]}</Chip>
                          ))}
                          {s.creditAmount > 0 && (
                            <Chip>{METHOD_LABEL.CREDIT}</Chip>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border px-2 py-0.5 text-[11px] leading-none text-muted-foreground">
      {children}
    </span>
  );
}

function SalesSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat transaksi">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 rounded-lg border px-4 py-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
      {[5, 3].map((n, g) => (
        <div key={g} className="space-y-2">
          <div className="flex justify-between px-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="divide-y overflow-hidden rounded-lg border">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-10 w-12" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="ml-auto h-4 w-20" />
                  <Skeleton className="ml-auto h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
