'use client'

import { useActionState, useState, type ReactNode } from 'react'
import type { FormState } from './actions'
import type { VariantInput } from './validation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Props = {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  submitLabel: string
  defaults?: { name: string; isActive: boolean; variants: VariantInput[] }
}

const emptyVariant = (name = ''): VariantInput => ({
  name,
  sku: '',
  barcode: '',
  unit: 'pcs',
  allowDecimal: false,
  price: '',
  costPrice: '',
  stock: '',
  minStock: '',
  isActive: true,
})

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function ProductForm({ action, submitLabel, defaults }: Props) {
  const [state, formAction, pending] = useActionState(action, {})
  const [variants, setVariants] = useState<VariantInput[]>(
    defaults?.variants ?? [emptyVariant('Standar')],
  )

  const patch = (i: number, p: Partial<VariantInput>) =>
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...p } : v)))

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />

      <Field label="Nama produk">
        <Input name="name" defaultValue={defaults?.name} required />
      </Field>

      {defaults && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={defaults.isActive} />
          Produk aktif (tampil di kasir)
        </label>
      )}

      <datalist id="units">
        {['pcs', 'kg', 'gram', 'ons', 'liter', 'bungkus', 'botol', 'pack', 'lusin'].map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <div className="space-y-3">
        <h2 className="font-medium">Varian</h2>
        {variants.map((v, i) => (
          <Card key={v.id ?? `new-${i}`}>
            <CardContent className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama varian">
                  <Input value={v.name} onChange={(e) => patch(i, { name: e.target.value })} />
                </Field>
                <Field label="Satuan">
                  <Input list="units" value={v.unit} onChange={(e) => patch(i, { unit: e.target.value })} />
                </Field>
                <Field label="Harga jual per satuan (Rp)">
                  <Input inputMode="numeric" value={v.price} onChange={(e) => patch(i, { price: e.target.value })} />
                </Field>
                <Field label="Harga modal per satuan (Rp)">
                  <Input inputMode="numeric" value={v.costPrice} onChange={(e) => patch(i, { costPrice: e.target.value })} />
                </Field>
                {!v.id && (
                  <Field label="Stok awal">
                    <Input inputMode="decimal" value={v.stock} onChange={(e) => patch(i, { stock: e.target.value })} />
                  </Field>
                )}
                <Field label="Stok minimum (peringatan)">
                  <Input inputMode="decimal" value={v.minStock} onChange={(e) => patch(i, { minStock: e.target.value })} />
                </Field>
                <Field label="SKU (opsional)">
                  <Input value={v.sku} onChange={(e) => patch(i, { sku: e.target.value })} />
                </Field>
                <Field label="Barcode (opsional)">
                  <Input value={v.barcode} onChange={(e) => patch(i, { barcode: e.target.value })} />
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={v.allowDecimal}
                    onChange={(e) => patch(i, { allowDecimal: e.target.checked })}
                  />
                  Curah (boleh desimal, mis. 0,5 kg)
                </label>
                {v.id && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={v.isActive}
                      onChange={(e) => patch(i, { isActive: e.target.checked })}
                    />
                    Varian aktif
                  </label>
                )}
                {!v.id && variants.length > 1 && (
                  <button
                    type="button"
                    className="text-red-600 underline"
                    onClick={() => setVariants((vs) => vs.filter((_, idx) => idx !== i))}
                  >
                    Hapus varian
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={() => setVariants((vs) => [...vs, emptyVariant()])}>
          + Tambah varian
        </Button>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Menyimpan...' : submitLabel}
      </Button>
    </form>
  )
}
