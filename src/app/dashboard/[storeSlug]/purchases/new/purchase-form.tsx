'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createPurchase } from '../actions'

export type VariantOption = {
  id: string
  label: string
  unit: string // satuan dasar
  allowDecimal: boolean
  costPrice: number
  units: { name: string; factor: string }[]
}

type Row = {
  key: number
  variantId: string
  unitName: string
  qtyInput: string
  unitCost: string
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

const num = (s: string) => Number(s.trim().replace(',', '.')) || 0
const selectClass =
  'h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function PurchaseForm({
  storeSlug,
  variants,
  suppliers,
}: {
  storeSlug: string
  variants: VariantOption[]
  suppliers: string[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [note, setNote] = useState('')
  const [nextKey, setNextKey] = useState(2)
  const [rows, setRows] = useState<Row[]>([
    { key: 1, variantId: '', unitName: '', qtyInput: '', unitCost: '' },
  ])

  const byId = new Map(variants.map((v) => [v.id, v]))

  const patch = (key: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)))

  function pickVariant(key: number, variantId: string) {
    const v = byId.get(variantId)
    patch(key, {
      variantId,
      unitName: v?.unit ?? '',
      // Usulan harga: modal terakhir per satuan dasar (hanya masuk akal untuk satuan dasar)
      unitCost: v && v.costPrice > 0 ? String(v.costPrice) : '',
    })
  }

  function addRow() {
    setRows((rs) => [
      ...rs,
      { key: nextKey, variantId: '', unitName: '', qtyInput: '', unitCost: '' },
    ])
    setNextKey((k) => k + 1)
  }

  const lineTotal = (r: Row) => Math.round(num(r.qtyInput) * num(r.unitCost))
  const grandTotal = rows.reduce((s, r) => s + lineTotal(r), 0)

  function submit() {
    setError('')
    startTransition(async () => {
      const res = await createPurchase(storeSlug, {
        supplierName,
        invoiceNo,
        note,
        items: rows
          .filter((r) => r.variantId)
          .map((r) => ({
            variantId: r.variantId,
            unitName: r.unitName,
            qtyInput: r.qtyInput,
            unitCost: r.unitCost,
          })),
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push(`/dashboard/${storeSlug}/purchases`)
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Supplier</span>
          <Input
            list="supplier-list"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Opsional"
          />
          <datalist id="supplier-list">
            {suppliers.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">No. faktur</span>
          <Input
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="Opsional"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Catatan</span>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opsional"
          />
        </label>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const v = byId.get(r.variantId)
          const unitOptions = v ? [{ name: v.unit, factor: '1.000' }, ...v.units] : []
          const factor = Number(unitOptions.find((u) => u.name === r.unitName)?.factor ?? 1)
          const qty = num(r.qtyInput)
          const cost = num(r.unitCost)
          const isBase = v ? r.unitName === v.unit : true

          return (
            <div key={r.key} className="space-y-2 rounded-md border p-3">
              <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <select
                  aria-label="Barang"
                  className={selectClass}
                  value={r.variantId}
                  onChange={(e) => pickVariant(r.key, e.target.value)}
                >
                  <option value="">Pilih barang...</option>
                  {variants.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Satuan beli"
                  className={selectClass}
                  value={r.unitName}
                  disabled={!v}
                  onChange={(e) =>
                    patch(r.key, {
                      unitName: e.target.value,
                      // harga per satuan beli berbeda dengan harga per satuan dasar
                      unitCost: e.target.value === v?.unit && v.costPrice > 0 ? String(v.costPrice) : '',
                    })
                  }
                >
                  {unitOptions.map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>

                <Input
                  aria-label="Jumlah"
                  inputMode="decimal"
                  placeholder="Jumlah"
                  value={r.qtyInput}
                  onChange={(e) => patch(r.key, { qtyInput: e.target.value })}
                />

                <Input
                  aria-label="Harga per satuan beli"
                  inputMode="numeric"
                  placeholder="Harga / satuan"
                  value={r.unitCost}
                  onChange={(e) => patch(r.key, { unitCost: e.target.value.replace(/\D/g, '') })}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Hapus baris"
                  disabled={rows.length === 1}
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {v && qty > 0 && cost > 0 && (
                <p className="text-xs text-muted-foreground">
                  {isBase ? null : (
                    <>
                      Masuk stok {+(qty * factor).toFixed(3)} {v.unit}.{' '}
                    </>
                  )}
                  Modal sekitar {rupiah(Math.round(cost / factor))} per {v.unit} (sebelum dirata-rata
                  dengan stok lama). Subtotal {rupiah(lineTotal(r))}.
                </p>
              )}
            </div>
          )
        })}

        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-1 size-4" /> Tambah barang
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm">
          Total <span className="text-lg font-semibold">{rupiah(grandTotal)}</span>
        </p>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-600">{error}</span>}
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? 'Menyimpan...' : 'Simpan pembelian'}
          </Button>
        </div>
      </div>
    </div>
  )
}
