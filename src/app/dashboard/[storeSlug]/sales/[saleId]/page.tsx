import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { formatDateTime } from "@/lib/tz";
import { METHOD_LABEL } from "@/lib/pos";
import { Skeleton } from "@/components/ui/skeleton";
import { voidSale } from "../actions";
import { ReceiptActions } from "./receipt-actions";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hub | Sale Details",
};

type Params = Promise<{ storeSlug: string; saleId: string }>;

const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");
const num = (v: { toString(): string }) =>
  Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 3 });

const TEAR =
  "polygon(0 0,100% 0,100% 40%,96% 100%,92% 40%,88% 100%,84% 40%,80% 100%,76% 40%,72% 100%,68% 40%,64% 100%,60% 40%,56% 100%,52% 40%,48% 100%,44% 40%,40% 100%,36% 40%,32% 100%,28% 40%,24% 100%,20% 40%,16% 100%,12% 40%,8% 100%,4% 40%,0 100%)";

export default function ReceiptPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<ReceiptSkeleton />}>
      <Receipt params={params} />
    </Suspense>
  );
}

function Dash() {
  return <div className="border-t border-dashed border-foreground/30" />;
}

function Row({
  left,
  right,
  bold,
  muted,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 ${bold ? "text-base font-semibold" : ""} ${
        muted ? "text-muted-foreground" : ""
      }`}
    >
      <span>{left}</span>
      <span className="tabular-nums">{right}</span>
    </div>
  );
}

async function Receipt({ params }: { params: Params }) {
  const { storeSlug, saleId } = await params;
  const { store, role } = await requireStoreAccess(storeSlug);

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, storeId: store.id },
    include: {
      items: true,
      paymentLines: true,
      cashier: { select: { name: true } },
    },
  });
  if (!sale) notFound();

  const isVoid = sale.status === "VOID";

  return (
    <div className="mx-auto max-w-sm space-y-5">
      <Link
        href={`/dashboard/${storeSlug}/sales`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="size-4" /> Semua transaksi
      </Link>

      <div className="relative drop-shadow-sm print:drop-shadow-none">
        <div className="space-y-4 bg-card px-6 py-7 font-mono text-[13px] print:p-0">
          <div className="text-center">
            <p className="text-base font-semibold">{store.name}</p>
            <p className="text-muted-foreground">Struk #{sale.receiptNo}</p>
            <p className="text-muted-foreground">
              {formatDateTime(sale.createdAt, store.timezone)}
            </p>
            {sale.cashier && (
              <p className="text-muted-foreground">
                Kasir: {sale.cashier.name}
              </p>
            )}
            {sale.customerName && (
              <p className="text-muted-foreground">
                Pelanggan: {sale.customerName}
              </p>
            )}
          </div>

          {isVoid && (
            <div className="rounded border border-red-300 bg-red-50 p-2 text-center text-red-700">
              <p className="font-semibold">TRANSAKSI DIBATALKAN</p>
              {sale.voidReason && <p>{sale.voidReason}</p>}
            </div>
          )}

          <Dash />

          <ul className="space-y-3">
            {sale.items.map((i) => (
              <li key={i.id}>
                <Row
                  left={
                    <>
                      {i.productName}
                      {i.variantName !== "Standar" && ` · ${i.variantName}`}
                    </>
                  }
                  right={rp(i.lineTotal)}
                />
                <p className="text-muted-foreground">
                  {num(i.qty)} {i.unit} × {rp(i.price)}
                </p>
              </li>
            ))}
          </ul>

          <Dash />

          <div className="space-y-1">
            <Row left="Subtotal" right={rp(sale.subtotal)} muted />
            {sale.discount > 0 && (
              <Row left="Diskon" right={`-${rp(sale.discount)}`} muted />
            )}
            <Row left="Total" right={rp(sale.total)} bold />
          </div>

          <Dash />

          <div className="space-y-1">
            {sale.paymentLines.map((p) => (
              <Row
                key={p.id}
                left={METHOD_LABEL[p.method]}
                right={rp(p.amount)}
              />
            ))}
            {sale.creditAmount > 0 && (
              <Row left="Masuk bon" right={rp(sale.creditAmount)} />
            )}
            <Row left="Dibayar" right={rp(sale.amountPaid)} muted />
            {sale.changeAmount > 0 && (
              <Row left="Kembalian" right={rp(sale.changeAmount)} muted />
            )}
          </div>

          {sale.note && (
            <>
              <Dash />
              <p className="text-muted-foreground">Catatan: {sale.note}</p>
            </>
          )}

          <Dash />
          <p className="text-center text-muted-foreground">Terima kasih</p>
        </div>

        {isVoid && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded border-4 border-red-500/50 px-4 py-1 text-3xl font-bold tracking-widest text-red-500/50"
          >
            VOID
          </div>
        )}

        <div
          aria-hidden
          className="h-3 bg-card print:hidden"
          style={{ clipPath: TEAR }}
        />
      </div>

      <ReceiptActions
        canVoid={role === "OWNER" && !isVoid}
        voidAction={voidSale.bind(null, storeSlug, sale.id)}
      />
      <Link
        href={`/dashboard/${storeSlug}/pos`}
        className="block text-sm underline underline-offset-4 print:hidden"
      >
        ← Kembali ke kasir
      </Link>
    </div>
  );
}

function ReceiptSkeleton() {
  return (
    <div
      className="mx-auto max-w-sm space-y-5"
      aria-busy="true"
      aria-label="Memuat struk"
    >
      <Skeleton className="h-4 w-32" />
      <div className="space-y-4 rounded-md border bg-card px-6 py-7">
        <div className="space-y-2">
          <Skeleton className="mx-auto h-5 w-40" />
          <Skeleton className="mx-auto h-3 w-24" />
          <Skeleton className="mx-auto h-3 w-36" />
        </div>
        <Skeleton className="h-px w-full" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
        <Skeleton className="h-px w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-36" />
      </div>
    </div>
  );
}
