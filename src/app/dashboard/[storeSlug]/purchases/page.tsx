import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess } from "@/lib/tenant";
import { buttonVariants } from "@/components/ui/button";
export const instant = false;
const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export default async function PurchasesPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const { store, role } = await requireStoreAccess(storeSlug);
  if (role !== "OWNER") redirect(`/dashboard/${storeSlug}`);

  const purchases = await prisma.purchase.findMany({
    where: { storeId: store.id },
    orderBy: { purchasedAt: "desc" },
    take: 50,
    include: {
      supplier: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });

  const fmt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: store.timezone,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pembelian</h1>
        <Link
          href={`/dashboard/${storeSlug}/purchases/new`}
          className={buttonVariants()}
        >
          Catat pembelian
        </Link>
      </div>

      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada pembelian. Catat pembelian pertama untuk menambah stok dan
          menghitung harga modal.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2 font-medium">Tanggal</th>
                <th className="p-2 font-medium">Supplier</th>
                <th className="p-2 font-medium">No. faktur</th>
                <th className="p-2 text-right font-medium">Item</th>
                <th className="p-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{fmt.format(p.purchasedAt)}</td>
                  <td className="p-2">{p.supplier?.name ?? "-"}</td>
                  <td className="p-2">{p.invoiceNo ?? "-"}</td>
                  <td className="p-2 text-right">{p._count.items}</td>
                  <td className="p-2 text-right">{rupiah(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
