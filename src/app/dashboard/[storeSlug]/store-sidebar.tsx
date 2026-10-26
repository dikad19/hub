"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Store,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StoreSwitcher, type StoreOption } from "./store-switcher";
import type { Feature } from "@/lib/features";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  feature?: Feature;
};
type NavGroup = { label: string; items: NavItem[] };

function getGroups(
  base: string,
  role: string,
  features?: readonly string[],
): NavGroup[] {
  const isOwner = role === "OWNER";
  const groups: NavGroup[] = [
    {
      label: "Operasional",
      items: [
        { href: base, label: "Ringkasan", icon: LayoutDashboard, exact: true },
        { href: `${base}/pos`, label: "Kasir", icon: ShoppingCart },
        { href: `${base}/sales`, label: "Transaksi", icon: Receipt },
        {
          href: `${base}/customers`,
          label: "Pelanggan",
          icon: Users,
          feature: "credit",
        },
      ],
    },
    {
      label: "Inventori",
      items: [
        { href: `${base}/products`, label: "Produk", icon: Package },
        ...(isOwner
          ? [
              {
                href: `${base}/purchases`,
                label: "Pembelian",
                icon: Truck,
                feature: "purchases" as const,
              },
            ]
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

  if (!features) return groups;
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.feature || features.includes(i.feature)),
    }))
    .filter((g) => g.items.length > 0);
}

function isActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

export function StoreSidebar({
  base,
  features,
  stores,
  currentSlug,
  role,
  user,
}: {
  base: string;
  features: string[];
  stores: StoreOption[];
  currentSlug: string;
  role: string;
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = getGroups(base, role, features);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader>
        <StoreSwitcher stores={stores} currentSlug={currentSlug} role={role} />
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    tooltip={item.label}
                    isActive={isActive(pathname, item)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[popup-open]:bg-sidebar-accent"
                  />
                }
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg text-xs font-medium">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="start"
                className="min-w-56"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="grid text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
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
