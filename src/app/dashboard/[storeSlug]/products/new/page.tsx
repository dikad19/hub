import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStoreAccess } from "@/lib/tenant";
import { Skeleton } from "@/components/ui/skeleton";
import { createProduct } from "../actions";
import { ProductForm } from "../product-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hub | New Product",
};

type Params = Promise<{ storeSlug: string }>;

export default function NewProductPage({ params }: { params: Params }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      }
    >
      <NewProduct params={params} />
    </Suspense>
  );
}

async function NewProduct({ params }: { params: Params }) {
  const { storeSlug } = await params;
  const { store, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER") redirect(`/dashboard/${storeSlug}/products`);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/dashboard/${storeSlug}/products`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Produk
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Tambah produk</h1>
        <p className="text-sm text-muted-foreground">
          Isi data produk dan varian. Resep, satuan beli, dan harga grosir bisa
          diatur setelah produk disimpan.
        </p>
      </div>

      <ProductForm
        action={createProduct.bind(null, storeSlug)}
        submitLabel="Simpan produk"
        businessType={store.businessType}
        features={store.features}
      />
    </div>
  );
}
