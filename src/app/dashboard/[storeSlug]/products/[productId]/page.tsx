import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { adjustStock, updateProduct } from "../actions";
import { ProductForm } from "../product-form";
import { AdjustStockForm } from "../adjust-stock-form";
import { addVariantUnit, deleteVariantUnit } from "../unit-actions";
import { addPriceTier, deletePriceTier } from "../tier-actions";
import { VariantUnitsForm } from "../variant-units-form";
import { VariantTiersForm } from "../variant-tiers-form";

type Params = Promise<{ storeSlug: string; productId: string }>;

const num = (v: { toString(): string }) =>
  Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 3 });

export default function EditProductPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p>Memuat...</p>}>
      <EditProduct params={params} />
    </Suspense>
  );
}

async function EditProduct({ params }: { params: Params }) {
  const { storeSlug, productId } = await params;
  const { store, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER") redirect(`/dashboard/${storeSlug}/products`);

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    include: {
      variants: {
        orderBy: { createdAt: "asc" },
        include: { units: { orderBy: { name: "asc" } }, priceTiers: true },
      },
    },
  });
  if (!product) notFound();

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Edit produk</h1>
        <ProductForm
          action={updateProduct.bind(null, storeSlug, product.id)}
          submitLabel="Simpan perubahan"
          defaults={{
            name: product.name,
            isActive: product.isActive,
            // Decimal diubah ke string di batas server -> client
            variants: product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              sku: v.sku ?? "",
              barcode: v.barcode ?? "",
              unit: v.unit,
              allowDecimal: v.allowDecimal,
              price: String(v.price),
              costPrice: String(v.costPrice),
              stock: "",
              minStock: v.minStock?.toString() ?? "",
              isActive: v.isActive,
            })),
          }}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Penyesuaian stok</h2>
        <p className="text-sm text-muted-foreground">
          Stok hanya bisa diubah lewat penyesuaian, supaya tercatat di riwayat.
        </p>
        <ul className="space-y-3">
          {product.variants.map((v) => (
            <li key={v.id} className="space-y-2 rounded-md border p-3">
              <p className="text-sm">
                <span className="font-medium">{v.name}</span>
                <span className="ml-2 text-muted-foreground">
                  stok saat ini {num(v.stockQty)} {v.unit}
                </span>
              </p>
              <AdjustStockForm
                action={adjustStock.bind(null, storeSlug, v.id)}
                unit={v.unit}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Satuan beli &amp; harga grosir
        </h2>
        <ul className="space-y-3">
          {product.variants.map((v) => (
            <li key={v.id} className="space-y-4 rounded-md border p-3">
              <p className="text-sm font-medium">{v.name}</p>
              <VariantUnitsForm
                baseUnit={v.unit}
                allowDecimal={v.allowDecimal}
                units={v.units.map((u) => ({
                  id: u.id,
                  name: u.name,
                  factor: u.factor.toFixed(3),
                }))}
                addAction={addVariantUnit.bind(null, storeSlug, v.id)}
                removeAction={deleteVariantUnit.bind(null, storeSlug)}
              />
              <VariantTiersForm
                unit={v.unit}
                allowDecimal={v.allowDecimal}
                basePrice={v.price}
                tiers={v.priceTiers.map((t) => ({
                  id: t.id,
                  minQty: t.minQty.toFixed(3),
                  price: t.price,
                }))}
                addAction={addPriceTier.bind(null, storeSlug, v.id)}
                removeAction={deletePriceTier.bind(null, storeSlug)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
