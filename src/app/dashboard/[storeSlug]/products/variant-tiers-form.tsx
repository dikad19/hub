"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { X } from "lucide-react";
import type { FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tier = { id: string; minQty: string; price: number };

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export function VariantTiersForm({
  unit,
  allowDecimal,
  basePrice,
  tiers,
  addAction,
  removeAction,
}: {
  unit: string;
  allowDecimal: boolean;
  basePrice: number;
  tiers: Tier[];
  addAction: (prev: FormState, fd: FormData) => Promise<FormState>;
  removeAction: (tierId: string) => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(addAction, {});
  const [removing, startRemove] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const sorted = [...tiers].sort((a, b) => Number(a.minQty) - Number(b.minQty));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Harga grosir</p>

      {sorted.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {sorted.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
            >
              ≥ {Number(t.minQty)} {unit} → {rupiah(t.price)} / {unit}
              <button
                type="button"
                aria-label={`Hapus harga grosir mulai ${Number(t.minQty)} ${unit}`}
                disabled={removing}
                onClick={() => startRemove(() => removeAction(t.id))}
                className="text-muted-foreground hover:text-red-600"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Belum ada. Harga normal {rupiah(basePrice)} / {unit} berlaku untuk
          semua jumlah.
        </p>
      )}

      <form
        ref={formRef}
        action={formAction}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-sm text-muted-foreground">Beli ≥</span>
        <Input
          name="minQty"
          inputMode="decimal"
          placeholder={`Jumlah (${unit})`}
          className="w-32"
          required
        />
        <span className="text-sm text-muted-foreground">harga</span>
        <Input
          name="price"
          inputMode="numeric"
          placeholder={`Rp per ${unit}`}
          className="w-36"
          required
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "..." : "Tambah harga grosir"}
        </Button>
        {state.error && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </form>
      <p className="text-xs text-muted-foreground">
        Harga grosir berlaku untuk seluruh jumlah di baris itu.
        {!allowDecimal && " Jumlah minimum harus bilangan bulat."}
      </p>
    </div>
  );
}
