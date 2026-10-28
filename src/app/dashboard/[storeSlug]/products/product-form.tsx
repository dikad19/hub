"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Boxes, ChefHat, Package, Plus, Tags, Trash2 } from "lucide-react";
import type { FormState } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BusinessType } from "@/lib/features";
import type { StockModeValue, VariantInput } from "./validation";

// Form bawaan (stok, resep, satuan beli, harga grosir) dikirim dari server page
// sebagai ReactNode, dibuka lewat modal per varian.
export type ExtraTab = {
  id: "stock" | "recipe" | "units" | "tiers";
  label: string;
  badge?: number;
  summary?: string; // ringkasan singkat yang ditampilkan di kartu varian
  content: ReactNode;
};
export type VariantExtras = Record<string, ExtraTab[]>; // key = variantId

type Props = {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel: string;
  defaults?: { name: string; isActive: boolean; variants: VariantInput[] };
  businessType: BusinessType;
  features: string[];
  extras?: VariantExtras;
};
const display = "font-[family-name:var(--font-display)]";
const defaultMode = (t: BusinessType): StockModeValue =>
  t === "SERVICE" ? "NONE" : "DIRECT";

const emptyVariant = (
  name = "",
  mode: StockModeValue = "DIRECT",
): VariantInput => ({
  name,
  sku: "",
  barcode: "",
  unit: mode === "RECIPE" ? "porsi" : "pcs",
  allowDecimal: false,
  price: "",
  costPrice: "",
  stock: "",
  minStock: "",
  isActive: true,
  stockMode: mode,
  isSellable: true,
});

const TAB_ICON = {
  stock: Boxes,
  recipe: ChefHat,
  units: Package,
  tiers: Tags,
} as const;

const sectionTitle =
  "text-xs font-semibold uppercase tracking-wide text-(--ink)/55";
const cardClass =
  "rounded-lg border border-(--line) bg-white shadow-none ring-0";
const segWrap = "grid gap-1 rounded-sm bg-(--ink)/5 p-1";
const segBtn = (on: boolean) =>
  cn(
    "rounded-sm px-2 py-1.5 text-xs font-medium transition",
    on
      ? "bg-white text-(--ink) shadow-sm"
      : "text-(--ink)/60 hover:text-(--ink)",
  );

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Rp({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-(--ink)/55">
        Rp
      </span>
      {children}
    </div>
  );
}

function Check({
  checked,
  defaultChecked,
  name,
  onChange,
  children,
}: {
  checked?: boolean;
  defaultChecked?: boolean;
  name?: string;
  onChange?: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="size-4 rounded accent-(--teal)"
      />
      {children}
    </label>
  );
}

export function ProductForm({
  action,
  submitLabel,
  defaults,
  businessType,
  features,
  extras = {},
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {});
  const [variants, setVariants] = useState<VariantInput[]>(
    defaults?.variants ?? [emptyVariant("Standar", defaultMode(businessType))],
  );
  const [modal, setModal] = useState<{ id: string; tab: string } | null>(null);
  // Jenis stok yang sudah tersimpan di server (tab stok/resep hanya valid untuk ini)
  const [initialModes] = useState(
    () =>
      new Map<string, StockModeValue>(
        (defaults?.variants ?? []).flatMap((v) =>
          v.id ? [[v.id, v.stockMode] as [string, StockModeValue]] : [],
        ),
      ),
  );

  // Ambil data terbaru setiap kali modal dibuka
  const modalId = modal?.id;
  useEffect(() => {
    if (modalId) router.refresh();
  }, [modalId, router]);

  const tabsOf = (v: VariantInput) => {
    if (!v.id) return { tabs: [] as ExtraTab[], pendingLabel: "" };
    const changed = v.stockMode !== initialModes.get(v.id);
    const tabs = (extras[v.id] ?? []).filter((t) =>
      t.id === "stock"
        ? !changed && v.stockMode === "DIRECT"
        : t.id === "recipe"
          ? !changed && v.stockMode === "RECIPE"
          : true,
    );
    const pendingLabel =
      changed && v.stockMode === "RECIPE"
        ? "Simpan perubahan dulu untuk mengatur resep."
        : changed && v.stockMode === "DIRECT"
          ? "Simpan perubahan dulu untuk mengatur stok."
          : !changed && v.stockMode === "NONE"
            ? 'Varian ini "Tanpa stok". Ubah jenis stok ke "Stok langsung" lalu simpan untuk mengatur stok.'
            : !changed && v.stockMode === "RECIPE"
              ? "Stok menu ini dihitung dari bahan di resep. Atur stok pada produk bahannya."
              : "";
    return { tabs, pendingLabel };
  };

  const patch = (i: number, p: Partial<VariantInput>) =>
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...p } : v)));

  const hasNone =
    businessType === "SERVICE" || [...initialModes.values()].includes("NONE");

  const modes: { value: StockModeValue; label: string }[] = [
    { value: "DIRECT", label: "Tanpa resep (stok biasa)" },
    ...(features.includes("recipes")
      ? [{ value: "RECIPE" as const, label: "Dengan resep" }]
      : []),
    ...(hasNone ? [{ value: "NONE" as const, label: "Tanpa stok" }] : []),
  ];

  const mVariant = variants.find((v) => v.id === modal?.id);
  const mTabs = mVariant ? tabsOf(mVariant).tabs : [];
  const mActive = mTabs.find((t) => t.id === modal?.tab) ?? mTabs[0];

  return (
    <>
      <form action={formAction} className="space-y-5 pb-4">
        <input type="hidden" name="variants" value={JSON.stringify(variants)} />

        <datalist id="units">
          {[
            "pcs",
            "porsi",
            "kg",
            "gram",
            "ons",
            "liter",
            "bungkus",
            "botol",
            "pack",
            "lusin",
          ].map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>

        <Card className={cn(cardClass, "gap-4 py-5")}>
          <CardContent className="space-y-4 px-5">
            <div className="max-w-xl">
              <Field label="Nama produk">
                <Input
                  name="name"
                  defaultValue={defaults?.name}
                  placeholder="Contoh: Kopi Susu"
                  className="h-10"
                  required
                />
              </Field>
            </div>
            {defaults && (
              <Check name="isActive" defaultChecked={defaults.isActive}>
                Produk aktif (tampil di kasir)
              </Check>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`${display} text-lg font-semibold`}>Varian</h2>
              <p className="text-sm text-(--ink)/70">
                Tiap varian punya harga, stok, dan pengaturan sendiri.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-sm border-(--line)"
              onClick={() =>
                setVariants((vs) => [
                  ...vs,
                  emptyVariant("", defaultMode(businessType)),
                ])
              }
            >
              <Plus />
              Tambah varian
            </Button>
          </div>

          {variants.map((v, i) => {
            const isRecipe = v.stockMode === "RECIPE";
            const { tabs, pendingLabel } = tabsOf(v);
            const stockTab = tabs.find((t) => t.id === "stock");
            return (
              <Card
                key={v.id ?? `new-${i}`}
                className={cn(cardClass, "gap-0 overflow-hidden py-0")}
              >
                <div className="flex items-center gap-2 border-b border-(--line) bg-(--paper)/60 px-5 py-3">
                  <Badge className="rounded-full bg-(--mint) text-(--teal) hover:bg-(--mint)">
                    {i + 1}
                  </Badge>
                  <span className="truncate text-sm font-medium">
                    {v.name || "Varian baru"}
                  </span>
                  {!v.id && variants.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      aria-label="Hapus varian"
                      onClick={() =>
                        setVariants((vs) => vs.filter((_, idx) => idx !== i))
                      }
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>

                <div className="space-y-5 p-5">
                  {modes.length > 1 && (
                    <div className="space-y-2">
                      <p className={sectionTitle}>Jenis stok</p>
                      <div
                        className={cn(segWrap, "sm:max-w-md")}
                        style={{
                          gridTemplateColumns: `repeat(${modes.length}, 1fr)`,
                        }}
                      >
                        {modes.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            aria-pressed={v.stockMode === m.value}
                            onClick={() =>
                              patch(i, {
                                stockMode: m.value,
                                ...(m.value === "RECIPE" && v.unit === "pcs"
                                  ? { unit: "porsi" }
                                  : {}),
                              })
                            }
                            className={segBtn(v.stockMode === m.value)}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className={sectionTitle}>Harga</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Nama varian">
                        <Input
                          value={v.name}
                          onChange={(e) => patch(i, { name: e.target.value })}
                        />
                      </Field>
                      <Field label="Satuan">
                        <Input
                          list="units"
                          value={v.unit}
                          onChange={(e) => patch(i, { unit: e.target.value })}
                        />
                      </Field>
                      <Field label="Harga jual">
                        <Rp>
                          <Input
                            inputMode="numeric"
                            className="pl-9 tabular-nums"
                            value={v.price}
                            onChange={(e) =>
                              patch(i, { price: e.target.value })
                            }
                          />
                        </Rp>
                      </Field>
                      {!isRecipe && (
                        <Field label="Harga modal">
                          <Rp>
                            <Input
                              inputMode="numeric"
                              className="pl-9 tabular-nums"
                              value={v.costPrice}
                              onChange={(e) =>
                                patch(i, { costPrice: e.target.value })
                              }
                            />
                          </Rp>
                        </Field>
                      )}
                    </div>
                  </div>

                  {v.stockMode === "DIRECT" && (
                    <div className="space-y-3">
                      <p className={sectionTitle}>Stok</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {!v.id && (
                          <Field label="Stok awal">
                            <Input
                              inputMode="decimal"
                              className="tabular-nums"
                              value={v.stock}
                              onChange={(e) =>
                                patch(i, { stock: e.target.value })
                              }
                            />
                          </Field>
                        )}
                        {stockTab && (
                          <div className="space-y-1.5 text-sm">
                            <span className="font-medium">Stok saat ini</span>
                            <div className="flex h-9 items-center gap-2">
                              <span className="font-semibold tabular-nums">
                                {stockTab.summary}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setModal({ id: v.id!, tab: "stock" })
                                }
                              >
                                Atur stok
                              </Button>
                            </div>
                          </div>
                        )}
                        <Field label="Stok minimum">
                          <Input
                            inputMode="decimal"
                            className="tabular-nums"
                            value={v.minStock}
                            onChange={(e) =>
                              patch(i, { minStock: e.target.value })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className={sectionTitle}>Kode (opsional)</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="SKU">
                        <Input
                          value={v.sku}
                          onChange={(e) => patch(i, { sku: e.target.value })}
                        />
                      </Field>
                      <Field label="Barcode">
                        <Input
                          value={v.barcode}
                          onChange={(e) =>
                            patch(i, { barcode: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-(--line) pt-4">
                    {tabs.map((t) => {
                      const Icon = TAB_ICON[t.id];
                      return (
                        <Button
                          key={t.id}
                          type="button"
                          variant={
                            t.id === "recipe" && !t.badge
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setModal({ id: v.id!, tab: t.id })}
                        >
                          <Icon />
                          {t.label}
                          {t.badge ? (
                            <Badge
                              variant="secondary"
                              className="ml-0.5 h-4 min-w-4 rounded-full px-1 tabular-nums"
                            >
                              {t.badge}
                            </Badge>
                          ) : null}
                        </Button>
                      );
                    })}
                    {tabs.find((t) => t.id === "recipe")?.summary && (
                      <p className="basis-full truncate text-xs text-muted-foreground">
                        Resep: {tabs.find((t) => t.id === "recipe")?.summary}
                      </p>
                    )}
                    {pendingLabel && (
                      <p className="text-xs text-muted-foreground">
                        {pendingLabel}
                      </p>
                    )}
                    {!v.id && (
                      <p className="text-xs text-muted-foreground">
                        Resep, satuan beli, dan harga grosir diatur setelah
                        produk disimpan.
                      </p>
                    )}

                    <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
                      <Check
                        checked={v.isSellable}
                        onChange={(c) => patch(i, { isSellable: c })}
                      >
                        Dijual di kasir
                      </Check>
                      <Check
                        checked={v.allowDecimal}
                        onChange={(c) => patch(i, { allowDecimal: c })}
                      >
                        Curah (boleh desimal)
                      </Check>
                      {v.id && (
                        <Check
                          checked={v.isActive}
                          onChange={(c) => patch(i, { isActive: c })}
                        >
                          Varian aktif
                        </Check>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-lg border border-(--line) bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
          {state.error ? (
            <p className="min-w-0 flex-1 truncate text-sm text-red-700">
              {state.error}
            </p>
          ) : (
            <p className="flex-1 text-sm text-(--ink)/60">
              {variants.length} varian
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            className="rounded-sm"
            onClick={() => router.back()}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-(--teal) text-white hover:bg-(--ink)"
          >
            {pending ? "Menyimpan..." : submitLabel}
          </Button>
        </div>
      </form>

      {/* Modal ada di luar <form> utama: form di dalamnya punya action sendiri */}
      <Dialog
        open={modal !== null}
        onOpenChange={(o) => {
          if (!o) setModal(null);
        }}
      >
        <DialogContent className="max-h-[88svh] gap-4 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Pengaturan {mVariant?.name ? `“${mVariant.name}”` : "varian"}
            </DialogTitle>
            <DialogDescription>
              Di sini tersimpan langsung, terpisah dari tombol {submitLabel}.
            </DialogDescription>
          </DialogHeader>

          {mTabs.length > 1 && (
            <div
              className={segWrap}
              style={{ gridTemplateColumns: `repeat(${mTabs.length}, 1fr)` }}
            >
              {mTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={mActive?.id === t.id}
                  onClick={() => modal && setModal({ id: modal.id, tab: t.id })}
                  className={segBtn(mActive?.id === t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {mActive?.content}
        </DialogContent>
      </Dialog>
    </>
  );
}
