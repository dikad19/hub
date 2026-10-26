import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { variantLabel, type PosItem } from "@/lib/pos";
import { PosClient } from "./pos-client";
import { Skeleton } from "@/components/ui/skeleton";

type Params = Promise<{ storeSlug: string }>;

export default function PosPage({ params }: { params: Params }) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>
          <Skeleton className="hidden h-96 rounded-lg lg:block" />
        </div>
      }
    >
      <Pos params={params} />
    </Suspense>
  );
}

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
