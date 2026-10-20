'use client'

import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSale, type SaleInput } from './actions'
import { METHOD_LABEL, lineTotalOf, milliToString, toMilli, type PosItem } from '@/lib/pos'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Line = { id: string; qty: string }
type Method = SaleInput['paymentMethod']

const rp = (n: number) => 'Rp' + n.toLocaleString('id-ID')
const digits = (s: string) => s.replace(/\D/g, '')
const numStr = (s: string) => Number(s).toLocaleString('id-ID', { maximumFractionDigits: 3 })

// crypto.randomUUID hanya ada di konteks aman (https/localhost); beri fallback
function newKey() {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

export function PosClient({ storeSlug, items }: { storeSlug: string; items: PosItem[] }) {
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [discount, setDiscount] = useState('')
  const [method, setMethod] = useState<Method>('CASH')
  const [paid, setPaid] = useState('')
  const [customer, setCustomer] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState<{ saleId: string; receiptNo: number } | null>(null)
  const [key, setKey] = useState(newKey)

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            i.sku?.toLowerCase().includes(q) ||
            i.barcode?.toLowerCase().includes(q),
        )
      : items
    return list.slice(0, 30)
  }, [items, query])

  function add(item: PosItem) {
    if (item.stock !== null && Number(item.stock) <= 0) return
    setDone(null)
    setError(null)
    setLines((ls) => {
      const ex = ls.find((l) => l.id === item.id)
      if (!ex) return [...ls, { id: item.id, qty: '1' }]
      const next = (toMilli(ex.qty) ?? BigInt(0)) + BigInt(1000)
      return ls.map((l) => (l.id === item.id ? { ...l, qty: milliToString(next) } : l))
    })
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault() // scanner USB mengirim Enter setelah barcode
    const q = query.trim().toLowerCase()
    if (!q) return
    const exact = items.find(
      (i) => i.barcode?.toLowerCase() === q || i.sku?.toLowerCase() === q,
    )
    const target = exact ?? (results.length === 1 ? results[0] : undefined)
    if (target) {
      add(target)
      setQuery('')
    }
  }

  const computed = lines.flatMap((l) => {
    const item = byId.get(l.id)
    if (!item) return []
    const milli = toMilli(l.qty)
    const total = lineTotalOf(item.price, l.qty)
    const invalid =
      milli === null ||
      milli <= BigInt(0) ||
      total === null ||
      (!item.allowDecimal && milli % BigInt(1000) !== BigInt(0))
    const over =
      item.stock !== null && milli !== null && Number(l.qty.replace(',', '.')) > Number(item.stock)
    return [{ l, item, total: total ?? 0, invalid, over }]
  })

  const subtotal = computed.reduce((s, c) => s + c.total, 0)
  const discountNum = Number(digits(discount) || '0')
  const discountTooBig = discountNum > subtotal
  const total = Math.max(0, subtotal - discountNum)
  const paidNum = method === 'CASH' ? Number(digits(paid) || '0') : total
  const change = paidNum - total
  const hasInvalid = computed.some((c) => c.invalid)
  const canPay = computed.length > 0 && !hasInvalid && !discountTooBig && paidNum >= total

  function setQty(id: string, qty: string) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty } : l)))
  }
  function bump(c: (typeof computed)[number], delta: number) {
    const cur = toMilli(c.l.qty) ?? BigInt(0)
    const next = cur + BigInt(delta * 1000)
    if (next <= BigInt(0)) return setLines((ls) => ls.filter((l) => l.id !== c.l.id))
    setQty(c.l.id, milliToString(next))
  }

  async function submit() {
    setError(null)
    setPending(true)
    try {
      const res = await createSale(storeSlug, {
        items: lines.map((l) => ({ variantId: l.id, qty: l.qty })),
        discount,
        paymentMethod: method,
        amountPaid: paid,
        customerName: customer,
        note,
        idempotencyKey: key,
      })
      if (!res.ok) {
        setError(res.error)
        setKey(newKey()) // server menolak, tidak ada transaksi tercatat
        return
      }
      setDone({ saleId: res.saleId, receiptNo: res.receiptNo })
      setLines([])
      setDiscount('')
      setPaid('')
      setCustomer('')
      setNote('')
      setMethod('CASH')
      setKey(newKey())
      router.refresh() // muat ulang stok
      searchRef.current?.focus()
    } catch {
      // key sengaja TIDAK diganti: menekan Bayar lagi aman (tidak akan dobel)
      setError('Koneksi bermasalah. Tekan Bayar lagi (aman, tidak akan tercatat dobel).')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      {/* ---------- Kiri: cari & pilih produk ---------- */}
      <div className="space-y-3">
        <Input
          ref={searchRef}
          autoFocus
          placeholder="Cari produk, SKU, atau scan barcode lalu Enter"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
        />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {results.map((i) => {
            const soldOut = i.stock !== null && Number(i.stock) <= 0
            return (
              <button
                key={i.id}
                type="button"
                disabled={soldOut}
                onClick={() => add(i)}
                className="rounded-md border p-3 text-left text-sm transition hover:bg-muted disabled:opacity-40"
              >
                <p className="font-medium leading-tight">{i.label}</p>
                <p className="mt-1 text-muted-foreground">
                  {rp(i.price)} / {i.unit}
                </p>
                {i.stock !== null && (
                  <p className={soldOut ? 'text-red-600' : 'text-xs text-muted-foreground'}>
                    {soldOut ? 'Habis' : `stok ${numStr(i.stock)}`}
                  </p>
                )}
              </button>
            )
          })}
          {results.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">Tidak ada produk cocok.</p>
          )}
        </div>
      </div>

      {/* ---------- Kanan: keranjang & pembayaran ---------- */}
      <Card className="h-fit lg:sticky lg:top-4">
        <CardContent className="space-y-3 p-4">
          {done && (
            <div className="rounded-md border border-green-600/40 bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
              Transaksi #{done.receiptNo} berhasil.{' '}
              <Link href={`/dashboard/${storeSlug}/sales/${done.saleId}`} className="underline">
                Lihat struk
              </Link>
            </div>
          )}

          {computed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keranjang kosong.</p>
          ) : (
            <ul className="divide-y">
              {computed.map((c) => (
                <li key={c.l.id} className="space-y-1 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-tight">{c.item.label}</span>
                    <span className="whitespace-nowrap">{rp(c.total)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => bump(c, -1)}>
                      −
                    </Button>
                    <Input
                      inputMode="decimal"
                      value={c.l.qty}
                      onChange={(e) => setQty(c.l.id, e.target.value)}
                      className="h-8 w-20 text-center"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => bump(c, 1)}>
                      +
                    </Button>
                    <span className="text-muted-foreground">
                      {c.item.unit} × {rp(c.item.price)}
                    </span>
                    <button
                      type="button"
                      className="ml-auto px-1 text-red-600"
                      onClick={() => setLines((ls) => ls.filter((x) => x.id !== c.l.id))}
                      aria-label="Hapus"
                    >
                      ×
                    </button>
                  </div>
                  {c.invalid && (
                    <p className="text-xs text-red-600">
                      {c.item.allowDecimal ? 'Jumlah tidak valid' : 'Harus bilangan bulat'}
                    </p>
                  )}
                  {!c.invalid && c.over && (
                    <p className="text-xs text-red-600">Melebihi stok ({numStr(c.item.stock!)})</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{rp(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Diskon (Rp)</span>
              <Input
                inputMode="numeric"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="h-8 w-28 text-right"
              />
            </div>
            {discountTooBig && <p className="text-xs text-red-600">Diskon melebihi subtotal</p>}
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{rp(total)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {(Object.keys(METHOD_LABEL) as Method[]).map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={method === m ? 'default' : 'outline'}
                onClick={() => setMethod(m)}
              >
                {METHOD_LABEL[m]}
              </Button>
            ))}
          </div>

          {method === 'CASH' && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>Uang diterima</span>
                <Input
                  inputMode="numeric"
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  className="h-8 w-32 text-right"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => setPaid(String(total))}>
                  Uang pas
                </Button>
                {[20000, 50000, 100000].map((n) => (
                  <Button key={n} type="button" size="sm" variant="outline" onClick={() => setPaid(String(n))}>
                    {n.toLocaleString('id-ID')}
                  </Button>
                ))}
              </div>
              <div className="flex justify-between">
                <span>Kembalian</span>
                <span className={change < 0 ? 'text-red-600' : ''}>
                  {change < 0 ? `kurang ${rp(-change)}` : rp(change)}
                </span>
              </div>
            </div>
          )}

          <Input placeholder="Nama pelanggan (opsional)" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          <Input placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" size="lg" disabled={!canPay || pending} onClick={submit}>
            {pending ? 'Memproses...' : `Bayar ${rp(total)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
