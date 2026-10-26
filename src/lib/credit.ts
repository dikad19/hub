import type { Prisma } from "@/generated/prisma/client";
import type { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;
export async function getCustomerBalances(
  db: Db,
  storeId: string,
  customerIds?: string[],
) {
  const [sales, payments, returns] = await Promise.all([
    db.sale.groupBy({
      by: ["customerId"],
      where: {
        storeId,
        status: "COMPLETED",
        customerId: customerIds ? { in: customerIds } : { not: null },
      },
      _sum: { creditAmount: true },
    }),
    db.customerPayment.groupBy({
      by: ["customerId"],
      where: {
        storeId,
        voidedAt: null,
        ...(customerIds ? { customerId: { in: customerIds } } : {}),
      },
      _sum: { amount: true },
    }),
    db.saleReturn.groupBy({
      by: ["customerId"],
      where: {
        storeId,
        customerId: customerIds ? { in: customerIds } : { not: null },
      },
      _sum: { creditOffset: true },
    }),
  ]);

  const map = new Map<string, number>();
  const add = (id: string | null, n: number) => {
    if (id) map.set(id, (map.get(id) ?? 0) + n);
  };
  for (const s of sales) add(s.customerId, s._sum.creditAmount ?? 0);
  for (const p of payments) add(p.customerId, -(p._sum.amount ?? 0));
  for (const r of returns) add(r.customerId, -(r._sum.creditOffset ?? 0));
  return map;
}
