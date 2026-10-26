import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { BUSINESS_TYPES } from "@/lib/features";
import { BUSINESS_ICON } from "@/components/business-icon";
import { buttonVariants } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-6">Memuat...</p>}>
      <Stores />
    </Suspense>
  );
}

async function Stores() {
  const session = await requireSession();
  const memberships = await prisma.storeMember.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      store: { select: { slug: true, name: true, businessType: true } },
    },
  });

  if (memberships.length === 0) redirect("/dashboard/new");
  if (memberships.length === 1)
    redirect(`/dashboard/${memberships[0].store.slug}`);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pilih toko</h1>
          <p className="text-sm text-muted-foreground">
            Halo, {session.user.name.split(" ")[0]}. Toko mana yang mau dibuka?
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className={buttonVariants({ variant: "outline" })}
        >
          <Plus />
          Toko baru
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {memberships.map(({ store, role }) => {
          const Icon = BUSINESS_ICON[store.businessType];
          const label = BUSINESS_TYPES.find(
            (t) => t.value === store.businessType,
          )?.label;
          return (
            <li key={store.slug}>
              <Link
                href={`/dashboard/${store.slug}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:bg-accent"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {store.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {label} · {role === "OWNER" ? "Owner" : "Staf"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
