import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/tenant";
import { SignOutButton } from "./sign-out-button";

type Params = Promise<{ storeSlug: string }>;
export const instant = false;
export default function StoreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  return (
    <Suspense fallback={<p className="p-6">Memuat...</p>}>
      <Shell params={params}>{children}</Shell>
    </Suspense>
  );
}

async function Shell({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const { storeSlug } = await params;
  const { store, role } = await requireStoreAccess(storeSlug);
  const base = `/dashboard/${store.slug}`;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b pb-3 print:hidden">
        <Link href={base} className="font-semibold">
          {store.name}
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href={`${base}/pos`}>Kasir</Link>
          <Link href={`${base}/sales`}>Transaksi</Link>
          <Link href={`${base}/products`}>Produk</Link>
          {role === "OWNER" && (
            <Link href={`${base}/purchases`}>Pembelian</Link>
          )}
          {role === "OWNER" && <Link href={`${base}/reports`}>Laporan</Link>}
          <SignOutButton />
        </nav>
      </header>
      {children}
    </div>
  );
}
