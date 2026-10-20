import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-6">Memuat...</p>}>
      <StoreList />
    </Suspense>
  );
}

async function StoreList() {
  const session = await requireSession();
  const memberships = await prisma.storeMember.findMany({
    where: { userId: session.user.id },
    include: { store: true },
  });

  if (memberships.length === 0) redirect("/dashboard/new");
  if (memberships.length === 1)
    redirect(`/dashboard/${memberships[0].store.slug}`);

  return (
    <main className="mx-auto max-w-md space-y-2 p-6">
      <h1 className="text-xl font-semibold">Toko kamu</h1>
      {memberships.map(({ store }) => (
        <Link
          key={store.id}
          href={`/dashboard/${store.slug}`}
          className="block rounded border p-3"
        >
          {store.name}
        </Link>
      ))}
    </main>
  );
}
