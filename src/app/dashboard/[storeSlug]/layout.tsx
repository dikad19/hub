import { Suspense, type ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { requireStoreAccess } from "@/lib/tenant";
import { SignOutButton } from "./sign-out-button";
import { PageTitle, StoreSidebar } from "./store-sidebar";

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
  const { store, role } = await requireStoreAccess(storeSlug);
  const base = `/dashboard/${store.slug}`;

  return (
    <SidebarProvider>
      <StoreSidebar
        base={base}
        storeName={store.name}
        role={role}
        footer={<SignOutButton />}
      />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur print:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <PageTitle base={base} role={role} />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
