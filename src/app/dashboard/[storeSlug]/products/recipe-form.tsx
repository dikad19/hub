"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type IngredientOption = { id: string; label: string; unit: string };
type Line = { ingredientVariantId: string; qty: string };

export function RecipeForm({
  action,
  ingredients,
  defaults,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  ingredients: IngredientOption[];
  defaults: Line[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [lines, setLines] = useState<Line[]>(
    defaults.length ? defaults : [{ ingredientVariantId: "", qty: "" }],
  );
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const patch = (i: number, p: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...p } : l)));

  return (
    <form action={formAction} className="space-y-3">
      {ingredients.length === 0 && (
        <p className="rounded-sm bg-(--sun)/25 px-3 py-2 text-sm text-(--ink)/80">
          Belum ada bahan. Buat dulu produk dengan jenis stok &quot;Stok
          biasa&quot; (misalnya Kopi bubuk, Susu), lalu pilih di sini.
        </p>
      )}
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      {lines.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            className="h-9 flex-1 rounded-sm border border-(--line) bg-white px-2 text-sm"
            value={l.ingredientVariantId}
            onChange={(e) => patch(i, { ingredientVariantId: e.target.value })}
          >
            <option value="">Pilih bahan...</option>
            {ingredients.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <Input
            inputMode="decimal"
            className="w-24"
            placeholder="Jumlah"
            value={l.qty}
            onChange={(e) => patch(i, { qty: e.target.value })}
          />
          <span className="w-12 text-sm text-muted-foreground">
            {byId.get(l.ingredientVariantId)?.unit ?? ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Hapus bahan"
            onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setLines((ls) => [...ls, { ingredientVariantId: "", qty: "" }])
          }
        >
          <Plus className="mr-1 size-4" /> Tambah bahan
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan resep"}
        </Button>
        {state.error && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
        {state.ok && <span className="text-sm text-(--teal)">Tersimpan</span>}
      </div>
    </form>
  );
}
