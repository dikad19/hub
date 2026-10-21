import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { variantLabel, type PosItem } from "@/lib/pos";
import { PosClient } from "./pos-client";

type Params = Promise<{ storeSlug: string }>;

export default function PosPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p>Memuat kasir...</p>}>
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
    where: { storeId: store.id, isActive: true, product: { isActive: true } },
    include: { product: { select: { name: true } }, priceTiers: true },
    orderBy: [{ product: { name: "asc" } }, { createdAt: "asc" }],
    take: 3000,
  });

  // Decimal -> string di batas server -> client
  const items: PosItem[] = variants.map((v) => ({
    id: v.id,
    label: variantLabel(v.product.name, v.name),
    unit: v.unit,
    allowDecimal: v.allowDecimal,
    price: v.price,
    sku: v.sku,
    barcode: v.barcode,
    stock: v.trackStock ? v.stockQty.toString() : null,
  }));

  return <PosClient storeSlug={storeSlug} items={items} />;
}
