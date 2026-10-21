import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { variantLabel } from "@/lib/pos";
import { PurchaseForm, type VariantOption } from "./purchase-form";
export const instant = false;
export default async function NewPurchasePage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const { store, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER") redirect(`/dashboard/${storeSlug}`);

  const [variants, suppliers] = await Promise.all([
    prisma.productVariant.findMany({
      where: { storeId: store.id, isActive: true, product: { isActive: true } },
      include: {
        product: { select: { name: true } },
        units: { orderBy: { name: "asc" } },
      },
      orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.supplier.findMany({
      where: { storeId: store.id },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Decimal tidak bisa dikirim ke client component, jadi diubah jadi string.
  const options: VariantOption[] = variants.map((v) => ({
    id: v.id,
    label: variantLabel(v.product.name, v.name),
    unit: v.unit,
    allowDecimal: v.allowDecimal,
    costPrice: v.costPrice,
    units: v.units.map((u) => ({ name: u.name, factor: u.factor.toFixed(3) })),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Catat pembelian</h1>
      <PurchaseForm
        storeSlug={storeSlug}
        variants={options}
        suppliers={suppliers.map((s) => s.name)}
      />
    </div>
  );
}
