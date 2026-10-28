import { Suspense, type ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { requireStoreAccess } from "@/lib/tenant";
import { PageTitle, StoreSidebar } from "./store-sidebar";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HeaderActions } from "./header-actions";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ storeSlug: string }>;
export const instant = false;

export default function StoreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  return (
    <Suspense fallback={<LayoutSkeleton />}>
      <Shell params={params}>{children}</Shell>
    </Suspense>
  );
}

function LayoutSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-64 shrink-0 space-y-4 border-r p-4 md:block">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-14 w-full rounded-none" />
      </div>
    </div>
  );
}

async function Shell({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const { storeSlug } = await params;

  const { store, role, user } = await requireStoreAccess(storeSlug);
  const base = `/dashboard/${store.slug}`;
  const memberships = await prisma.storeMember.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      store: { select: { slug: true, name: true, businessType: true } },
    },
  });
  const stores = memberships.map((m) => m.store);
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <SidebarProvider>
      <StoreSidebar
        base={base}
        features={store.features}
        stores={stores}
        currentSlug={store.slug}
        role={role}
        user={{ name: user?.name ?? "", email: user?.email ?? "" }}
      />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur print:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-1 mr-2 data-[orientation=vertical]:h-full"
          />
          <PageTitle base={base} role={role} />
          <HeaderActions base={base} />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
