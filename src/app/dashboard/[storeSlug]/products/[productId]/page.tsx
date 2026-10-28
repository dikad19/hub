import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { variantLabel } from "@/lib/pos";
import { Skeleton } from "@/components/ui/skeleton";
import { adjustStock, updateProduct } from "../actions";
import { ProductForm, type VariantExtras } from "../product-form";
import { AdjustStockForm } from "../adjust-stock-form";
import { addVariantUnit, deleteVariantUnit } from "../unit-actions";
import { addPriceTier, deletePriceTier } from "../tier-actions";
import { VariantUnitsForm } from "../variant-units-form";
import { VariantTiersForm } from "../variant-tiers-form";
import { saveRecipe } from "../recipe-actions";
import { RecipeForm } from "../recipe-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hub | Product Details",
};

type Params = Promise<{ storeSlug: string; productId: string }>;

const num = (v: { toString(): string }) =>
  Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const display = "font-[family-name:var(--font-display)]";
export default function EditProductPage({ params }: { params: Params }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      }
    >
      <EditProduct params={params} />
    </Suspense>
  );
}

async function EditProduct({ params }: { params: Params }) {
  const { storeSlug, productId } = await params;
  const { store, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER") redirect(`/dashboard/${storeSlug}/products`);

  // Jenis stok (langsung / resep) dan resep hanya relevan untuk kafe & resto.
  const hasRecipes = store.features.includes("recipes");

  const [product, ingredientRows] = await Promise.all([
    prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
      include: {
        variants: {
          orderBy: { createdAt: "asc" },
          include: {
            units: { orderBy: { name: "asc" } },
            priceTiers: true,
            recipeLines: true,
          },
        },
      },
    }),
    hasRecipes
      ? prisma.productVariant.findMany({
          where: { storeId: store.id, isActive: true, stockMode: "DIRECT" },
          include: { product: { select: { name: true } } },
          orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  if (!product) notFound();
  const ingredients = ingredientRows.map((i) => ({
    id: i.id,
    label: variantLabel(i.product.name, i.name),
    unit: i.unit,
  }));

  const ingById = new Map(ingredients.map((i) => [i.id, i]));

  // Form bawaan dipindah ke modal per varian.
  // Semua tab disiapkan; ProductForm yang memilih sesuai jenis stok.
  const extras: VariantExtras = {};
  for (const v of product.variants) {
    const tabs: VariantExtras[string] = [];

    tabs.push({
      id: "stock",
      label: "Stok",
      summary: `${num(v.stockQty)} ${v.unit}`,
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Stok saat ini{" "}
            <span className="font-medium text-(--ink)">
              {num(v.stockQty)} {v.unit}
            </span>
            . Stok hanya bisa diubah lewat penyesuaian, supaya tercatat di
            riwayat.
          </p>
          <AdjustStockForm
            action={adjustStock.bind(null, storeSlug, v.id)}
            unit={v.unit}
          />
        </div>
      ),
    });

    if (hasRecipes) {
      tabs.push({
        id: "recipe",
        label: "Resep",
        badge: v.recipeLines.length,
        summary: v.recipeLines
          .map((r) => {
            const g = ingById.get(r.ingredientVariantId);
            return `${g?.label ?? "Bahan"} ${num(r.qty)} ${g?.unit ?? ""}`.trim();
          })
          .join(" · "),
        content: (
          <div className="space-y-3">
            <p className="text-sm text-(--ink)/70">
              Jumlah bahan per 1 porsi, dalam satuan dasar bahan. Stok bahan
              berkurang otomatis saat menu terjual.
            </p>
            <RecipeForm
              action={saveRecipe.bind(null, storeSlug, v.id)}
              ingredients={ingredients}
              defaults={v.recipeLines.map((r) => ({
                ingredientVariantId: r.ingredientVariantId,
                qty: r.qty.toString(),
              }))}
            />
          </div>
        ),
      });
    }

    tabs.push({
      id: "units",
      label: "Satuan beli",
      badge: v.units.length,
      content: (
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
      ),
    });
    tabs.push({
      id: "tiers",
      label: "Harga grosir",
      badge: v.priceTiers.length,
      content: (
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
      ),
    });

    extras[v.id] = tabs;
  }

  return (
    <div className="mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className={`${display} text-2xl font-bold tracking-tight`}>
          Edit produk
        </h1>
        <p className="text-sm text-(--ink)/70">
          Ubah detail, harga, dan stok tiap varian.
        </p>
      </div>

      <ProductForm
        action={updateProduct.bind(null, storeSlug, product.id)}
        submitLabel="Simpan perubahan"
        key={product.variants.map((v) => `${v.id}:${v.stockMode}`).join("|")}
        businessType={store.businessType}
        features={store.features}
        extras={extras}
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
            stockMode: v.stockMode,
            isSellable: v.isSellable,
          })),
        }}
      />
    </div>
  );
}
