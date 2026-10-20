import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireStoreAccess } from '@/lib/tenant'
import { formatDateTime } from '@/lib/tz'
import { METHOD_LABEL } from '@/lib/pos'
import { voidSale } from '../actions'
import { ReceiptActions } from './receipt-actions'

type Params = Promise<{ storeSlug: string; saleId: string }>

const rp = (n: number) => 'Rp' + n.toLocaleString('id-ID')
const num = (v: { toString(): string }) =>
  Number(v.toString()).toLocaleString('id-ID', { maximumFractionDigits: 3 })

export default function ReceiptPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p>Memuat...</p>}>
      <Receipt params={params} />
    </Suspense>
  )
}

async function Receipt({ params }: { params: Params }) {
  const { storeSlug, saleId } = await params
  const { store, role } = await requireStoreAccess(storeSlug)

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, storeId: store.id },
    include: { items: true, cashier: { select: { name: true } } },
  })
  if (!sale) notFound()

  const isVoid = sale.status === 'VOID'

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div className="space-y-3 rounded-md border p-4 text-sm print:border-0 print:p-0">
        <div className="text-center">
          <p className="text-base font-semibold">{store.name}</p>
          <p className="text-muted-foreground">
            Struk #{sale.receiptNo} · {formatDateTime(sale.createdAt, store.timezone)}
          </p>
          {sale.cashier && <p className="text-muted-foreground">Kasir: {sale.cashier.name}</p>}
          {sale.customerName && <p className="text-muted-foreground">Pelanggan: {sale.customerName}</p>}
        </div>

        {isVoid && (
          <div className="rounded border border-red-300 bg-red-50 p-2 text-center text-red-700">
            <p className="font-semibold">TRANSAKSI DIBATALKAN</p>
            {sale.voidReason && <p>{sale.voidReason}</p>}
          </div>
        )}

        <ul className="divide-y border-y">
          {sale.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2 py-2">
              <div>
                <p>
                  {i.productName}
                  {i.variantName !== 'Standar' && ` · ${i.variantName}`}
                </p>
                <p className="text-muted-foreground">
                  {num(i.qty)} {i.unit} × {rp(i.price)}
                </p>
              </div>
              <p>{rp(i.lineTotal)}</p>
            </li>
          ))}
        </ul>

        <div className="space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{rp(sale.subtotal)}</span></div>
          {sale.discount > 0 && (
            <div className="flex justify-between"><span>Diskon</span><span>-{rp(sale.discount)}</span></div>
          )}
          <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{rp(sale.total)}</span></div>
          <div className="flex justify-between"><span>{METHOD_LABEL[sale.paymentMethod]}</span><span>{rp(sale.amountPaid)}</span></div>
          {sale.changeAmount > 0 && (
            <div className="flex justify-between"><span>Kembalian</span><span>{rp(sale.changeAmount)}</span></div>
          )}
        </div>
        {sale.note && <p className="text-muted-foreground">Catatan: {sale.note}</p>}
        <p className="text-center text-muted-foreground">Terima kasih</p>
      </div>

      <ReceiptActions
        canVoid={role === 'OWNER' && !isVoid}
        voidAction={voidSale.bind(null, storeSlug, sale.id)}
      />
      <Link href={`/dashboard/${storeSlug}/pos`} className="block text-sm underline print:hidden">
        ← Kembali ke kasir
      </Link>
    </div>
  )
}
