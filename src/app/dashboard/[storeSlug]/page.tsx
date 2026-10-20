import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireStoreAccess } from '@/lib/tenant'
import { dayRange, todayInTz } from '@/lib/tz'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Params = Promise<{ storeSlug: string }>

export default function StoreHome({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p>Memuat...</p>}>
      <Summary params={params} />
    </Suspense>
  )
}

async function Summary({ params }: { params: Params }) {
  const { storeSlug } = await params
  const { store } = await requireStoreAccess(storeSlug)

  const { start, end } = dayRange(todayInTz(store.timezone), store.timezone)

  const [today, products, lowStockRows] = await Promise.all([
    prisma.sale.aggregate({
      where: { storeId: store.id, status: 'COMPLETED', createdAt: { gte: start, lt: end } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.product.count({ where: { storeId: store.id, isActive: true } }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM "ProductVariant"
      WHERE "storeId" = ${store.id} AND "isActive" = true AND "trackStock" = true
        AND "minStock" IS NOT NULL AND "stockQty" <= "minStock"`,
  ])
  const lowStock = Number(lowStockRows[0]?.count ?? 0)

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/${storeSlug}/pos`}
        className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        Buka Kasir
      </Link>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Penjualan hari ini</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            Rp{(today._sum.total ?? 0).toLocaleString('id-ID')}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Transaksi hari ini</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{today._count}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Produk aktif</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{products}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Stok menipis</CardTitle></CardHeader>
          <CardContent className={lowStock > 0 ? 'text-2xl font-semibold text-red-600' : 'text-2xl font-semibold'}>
            {lowStock}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
