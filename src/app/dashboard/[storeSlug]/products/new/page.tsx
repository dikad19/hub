import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireStoreAccess } from '@/lib/tenant'
import { createProduct } from '../actions'
import { ProductForm } from '../product-form'

type Params = Promise<{ storeSlug: string }>

export default function NewProductPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p>Memuat...</p>}>
      <NewProduct params={params} />
    </Suspense>
  )
}

async function NewProduct({ params }: { params: Params }) {
  const { storeSlug } = await params
  const { role } = await requireStoreAccess(storeSlug)
  if (role !== 'OWNER') redirect(`/dashboard/${storeSlug}/products`)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tambah produk</h1>
      <ProductForm action={createProduct.bind(null, storeSlug)} submitLabel="Simpan produk" />
    </div>
  )
}
