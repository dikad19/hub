import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireStoreAccess } from '@/lib/tenant'
import { Button } from '@/components/ui/button'
import { setProductActive } from './actions'

type Params = Promise<{ storeSlug: string }>

const rp = (n: number) => 'Rp' + n.toLocaleString('id-ID')
const num = (v: { toString(): string }) =>
  Number(v.toString()).toLocaleString('id-ID', { maximumFractionDigits: 3 })

export default function ProductsPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p>Memuat...</p>}>
      <ProductList params={params} />
    </Suspense>
  )
}

async function ProductList({ params }: { params: Params }) {
  const { storeSlug } = await params
  const { store, role } = await requireStoreAccess(storeSlug)
  const isOwner = role === 'OWNER'

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: { variants: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produk</h1>
        {isOwner && (
          <Link
            href={`/dashboard/${storeSlug}/products/new`}
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
          >
            Tambah produk
          </Link>
        )}
      </div>

      {products.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada produk.</p>
      )}

      <ul className="space-y-3">
        {products.map((p) => (
          <li key={p.id} className="rounded-md border">
            <div className="flex items-center justify-between gap-2 border-b p-3">
              <p className={p.isActive ? 'font-medium' : 'font-medium text-muted-foreground'}>
                {p.name}
                {!p.isActive && <span className="ml-2 text-xs">(diarsipkan)</span>}
              </p>
              {isOwner && (
                <div className="flex items-center gap-1">
                  <Link href={`/dashboard/${storeSlug}/products/${p.id}`} className="px-2 text-sm underline">
                    Edit
                  </Link>
                  <form action={setProductActive.bind(null, storeSlug, p.id, !p.isActive)}>
                    <Button type="submit" variant="ghost" size="sm">
                      {p.isActive ? 'Arsipkan' : 'Aktifkan'}
                    </Button>
                  </form>
                </div>
              )}
            </div>

            <ul className="divide-y">
              {p.variants.map((v) => {
                const low = v.trackStock && v.minStock !== null && v.stockQty.lte(v.minStock)
                return (
                  <li key={v.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <span className={v.isActive ? '' : 'text-muted-foreground line-through'}>
                      {v.name}
                    </span>
                    <span className="text-right">
                      {rp(v.price)} / {v.unit}
                      {v.trackStock && (
                        <span className={low ? 'ml-3 font-medium text-red-600' : 'ml-3 text-muted-foreground'}>
                          stok {num(v.stockQty)} {v.unit}
                          {low && ' (menipis)'}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
