import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireStoreAccess } from '@/lib/tenant'
import { formatDateTime } from '@/lib/tz'
import { METHOD_LABEL } from '@/lib/pos'

type Params = Promise<{ storeSlug: string }>

export default function SalesPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p>Memuat...</p>}>
      <SalesList params={params} />
    </Suspense>
  )
}

async function SalesList({ params }: { params: Params }) {
  const { storeSlug } = await params
  const { store } = await requireStoreAccess(storeSlug)

  const sales = await prisma.sale.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { cashier: { select: { name: true } }, _count: { select: { items: true } } },
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Transaksi</h1>
      <p className="text-sm text-muted-foreground">50 transaksi terakhir.</p>

      {sales.length === 0 && <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>}

      <ul className="divide-y rounded-md border">
        {sales.map((s) => (
          <li key={s.id}>
            <Link
              href={`/dashboard/${storeSlug}/sales/${s.id}`}
              className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted"
            >
              <div>
                <p className="font-medium">
                  #{s.receiptNo}
                  {s.status === 'VOID' && (
                    <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">VOID</span>
                  )}
                </p>
                <p className="text-muted-foreground">
                  {formatDateTime(s.createdAt, store.timezone)}
                  {s.cashier && ` · ${s.cashier.name}`} · {s._count.items} item
                </p>
              </div>
              <div className="text-right">
                <p className={s.status === 'VOID' ? 'font-medium line-through' : 'font-medium'}>
                  Rp{s.total.toLocaleString('id-ID')}
                </p>
                <p className="text-muted-foreground">{METHOD_LABEL[s.paymentMethod]}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
