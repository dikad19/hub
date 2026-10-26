import { Suspense } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Package, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { setProductActive } from "./actions";

type Params = Promise<{ storeSlug: string }>;

const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");
const num = (v: { toString(): string }) =>
  Number(v.toString()).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const initials = (s: string) =>
  s
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

export default function ProductsPage({ params }: { params: Params }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      }
    >
      <ProductList params={params} />
    </Suspense>
  );
}

async function ProductList({ params }: { params: Params }) {
  const { storeSlug } = await params;
  const { store, role } = await requireStoreAccess(storeSlug);
  const isOwner = role === "OWNER";

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: {
      variants: {
        orderBy: { createdAt: "asc" },
        include: {
          recipeLines: {
            include: { ingredient: { select: { stockQty: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  type Variant = (typeof products)[number]["variants"][number];

  const portions = (v: Variant) =>
    v.recipeLines.length === 0
      ? null
      : Math.max(
          0,
          Math.min(
            ...v.recipeLines.map((r) =>
              Math.floor(Number(r.ingredient.stockQty) / Number(r.qty)),
            ),
          ),
        );

  // Satu tempat untuk menentukan teks + warna status stok tiap varian
  type Tone = "ok" | "warn" | "bad" | "muted";
  const stockInfo = (v: Variant): { text: string; tone: Tone } => {
    if (v.stockMode === "DIRECT") {
      if (v.stockQty.lte(0))
        return { text: `Habis (0 ${v.unit})`, tone: "bad" };
      if (v.minStock !== null && v.stockQty.lte(v.minStock))
        return { text: `${num(v.stockQty)} ${v.unit} · menipis`, tone: "warn" };
      return { text: `${num(v.stockQty)} ${v.unit}`, tone: "ok" };
    }
    if (v.stockMode === "RECIPE") {
      const left = portions(v);
      if (left === null) return { text: "Resep belum diisi", tone: "warn" };
      if (left === 0) return { text: "Habis (0 porsi)", tone: "bad" };
      return { text: `Sisa ${left} porsi`, tone: "ok" };
    }
    return { text: "Tanpa stok", tone: "muted" };
  };

  const attention = products
    .filter((p) => p.isActive)
    .flatMap((p) => p.variants)
    .filter(
      (v) => v.isActive && ["warn", "bad"].includes(stockInfo(v).tone),
    ).length;

  const toneDot: Record<Tone, string> = {
    ok: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-destructive",
    muted: "bg-muted-foreground/40",
  };
  const toneText: Record<Tone, string> = {
    ok: "text-foreground",
    warn: "text-amber-700 dark:text-amber-400",
    bad: "text-destructive",
    muted: "text-muted-foreground",
  };

  return (
    <div className="space-y-5">
      {/* ---------- Header ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Produk</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} produk
            {attention > 0 && (
              <span className="text-amber-700 dark:text-amber-400">
                , {attention} varian perlu dicek stoknya
              </span>
            )}
          </p>
        </div>
        {isOwner && (
          <Link
            href={`/dashboard/${storeSlug}/products/new`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Tambah produk
          </Link>
        )}
      </div>

      {/* ---------- Kosong ---------- */}
      {products.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Package className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">Belum ada produk</p>
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "Tambahkan produk pertama supaya bisa dijual di kasir."
                : "Pemilik toko belum menambahkan produk."}
            </p>
          </div>
        </div>
      )}

      {/* ---------- Daftar ---------- */}
      <ul className="space-y-3">
        {products.map((p) => (
          <li
            key={p.id}
            className={cn(
              "overflow-hidden rounded-lg bg-card ring-1 ring-foreground/8",
              !p.isActive && "bg-muted/30",
            )}
          >
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground",
                  !p.isActive && "opacity-60",
                )}
              >
                {initials(p.name)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "truncate font-medium",
                      !p.isActive && "text-muted-foreground",
                    )}
                  >
                    {p.name}
                  </p>
                  {!p.isActive && <Badge variant="outline">Diarsipkan</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.variants.length} varian
                </p>
              </div>

              {isOwner && (
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/dashboard/${storeSlug}/products/${p.id}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Link>
                  <form
                    action={setProductActive.bind(
                      null,
                      storeSlug,
                      p.id,
                      !p.isActive,
                    )}
                  >
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                    >
                      {p.isActive ? <Archive /> : <ArchiveRestore />}
                      <span className="max-sm:sr-only">
                        {p.isActive ? "Arsipkan" : "Aktifkan"}
                      </span>
                    </Button>
                  </form>
                </div>
              )}
            </div>

            <ul className="divide-y">
              {p.variants.map((v) => {
                const info = stockInfo(v);
                return (
                  <li
                    key={v.id}
                    className="flex flex-col gap-1.5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "font-medium",
                          !v.isActive && "text-muted-foreground",
                        )}
                      >
                        {v.name}
                      </span>
                      {v.stockMode === "RECIPE" && (
                        <Badge variant="secondary">Menu</Badge>
                      )}
                      {!v.isSellable && <Badge variant="outline">Bahan</Badge>}
                      {!v.isActive && <Badge variant="outline">Nonaktif</Badge>}
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className="font-semibold tabular-nums sm:w-32 sm:text-right">
                        {v.isSellable ? (
                          <>
                            {rp(v.price)}
                            <span className="text-xs font-normal text-muted-foreground">
                              /{v.unit}
                            </span>
                          </>
                        ) : (
                          <span className="font-normal text-muted-foreground">
                            Tidak dijual
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-1.5 tabular-nums sm:w-40",
                          toneText[info.tone],
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            toneDot[info.tone],
                          )}
                        />
                        {info.text}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
