"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};
type NavGroup = { label: string; items: NavItem[] };

function getGroups(base: string, role: string): NavGroup[] {
  const isOwner = role === "OWNER";
  const groups: NavGroup[] = [
    {
      label: "Operasional",
      items: [
        { href: base, label: "Ringkasan", icon: LayoutDashboard, exact: true },
        { href: `${base}/pos`, label: "Kasir", icon: ShoppingCart },
        { href: `${base}/sales`, label: "Transaksi", icon: Receipt },
      ],
    },
    {
      label: "Inventori",
      items: [
        { href: `${base}/products`, label: "Produk", icon: Package },
        ...(isOwner
          ? [{ href: `${base}/purchases`, label: "Pembelian", icon: Truck }]
          : []),
      ],
    },
  ];

  if (isOwner) {
    groups.push({
      label: "Analisis",
      items: [{ href: `${base}/reports`, label: "Laporan", icon: BarChart3 }],
    });
  }
  return groups;
}

function isActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function StoreSidebar({
  base,
  storeName,
  role,
  footer,
}: {
  base: string;
  storeName: string;
  role: string;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const groups = getGroups(base, role);

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={base}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Store className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{storeName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {role === "OWNER" ? "Owner" : "Staf"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={isActive(pathname, item)}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function PageTitle({ base, role }: { base: string; role: string }) {
  const pathname = usePathname();
  const items = getGroups(base, role).flatMap((g) => g.items);
  const current = items
    .filter((i) => isActive(pathname, i))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <h1 className="text-sm font-medium">{current?.label ?? "Dashboard"}</h1>
  );
}
