import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { variantLabel, type PosItem } from "@/lib/pos";
import { PosClient } from "./pos-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Metadata } from "next";

type Params = Promise<{ storeSlug: string }>;

export default function PosPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PosSkeleton />}>
      <Pos params={params} />
    </Suspense>
  );
}

export const metadata: Metadata = {
  title: "Hub | Point of sale",
};

async function Pos({ params }: { params: Params }) {
  const { storeSlug } = await params;
  const { store } = await requireStoreAccess(storeSlug);

  // MVP: semua varian aktif dimuat sekaligus. Cukup untuk ribuan item;
  // kalau katalog sangat besar, ganti dengan pencarian ke server.
  const variants = await prisma.productVariant.findMany({
    where: {
      storeId: store.id,
      isActive: true,
      isSellable: true,
      product: { isActive: true },
    },
    include: {
      product: { select: { name: true } },
      priceTiers: true,
      recipeLines: { include: { ingredient: { select: { stockQty: true } } } },
    },

    orderBy: [{ product: { name: "asc" } }, { createdAt: "asc" }],
    take: 3000,
  });

  const stockOf = (v: (typeof variants)[number]): string | null => {
    if (v.stockMode === "DIRECT") return v.stockQty.toString();
    if (v.stockMode === "RECIPE") {
      if (v.recipeLines.length === 0) return "0";
      const portions = v.recipeLines.map((r) =>
        Math.floor(Number(r.ingredient.stockQty) / Number(r.qty)),
      );
      return String(Math.max(0, Math.min(...portions)));
    }
    return null;
  };

  // Decimal -> string di batas server -> client
  const items: PosItem[] = variants.map((v) => ({
    id: v.id,
    label: variantLabel(v.product.name, v.name),
    unit: v.unit,
    allowDecimal: v.allowDecimal,
    price: v.price,
    sku: v.sku,
    barcode: v.barcode,
    stockMode: v.stockMode,
    stock: stockOf(v),
  }));

  return <PosClient storeSlug={storeSlug} items={items} />;
}

// Meniru layout PosClient: kolom produk (kiri) + panel keranjang (kanan, desktop saja)
function PosSkeleton() {
  return (
    <div
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px]"
      aria-busy="true"
      aria-label="Memuat kasir"
    >
      {/* Kolom produk */}
      <div className="min-w-0 space-y-4">
        <Skeleton className="h-11 w-full rounded-md" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="flex min-h-28 flex-col items-start gap-2 rounded-lg bg-card p-3 ring-1 ring-foreground/8"
            >
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-auto h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>

      {/* Panel keranjang */}
      <section className="hidden flex-col overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10 lg:sticky lg:top-[4.5rem] lg:flex lg:max-h-[calc(100svh-6rem)]">
        <header className="flex items-center gap-2 px-4 pt-4 pb-3">
          <Skeleton className="h-5 w-24" />
        </header>
        <div className="flex items-center gap-3 px-4 pb-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-px flex-1" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 border-t px-4 py-10">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-3 border-t p-4">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </section>
    </div>
  );
}
