"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { BUSINESS_ICON } from "@/components/business-icon";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/features";
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type StoreOption = {
  slug: string;
  name: string;
  businessType: BusinessType;
};

const typeLabel = (t: BusinessType) =>
  BUSINESS_TYPES.find((x) => x.value === t)?.label ?? t;

export function StoreSwitcher({
  stores,
  currentSlug,
  role,
}: {
  stores: StoreOption[];
  currentSlug: string;
  role: string;
}) {
  const { isMobile } = useSidebar();
  const current = stores.find((s) => s.slug === currentSlug) ?? stores[0];
  const Icon = BUSINESS_ICON[current.businessType];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{current.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {typeLabel(current.businessType)} ·{" "}
                {role === "OWNER" ? "Owner" : "Staf"}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-60 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Toko Anda</DropdownMenuLabel>
              {stores.map((s) => {
                const StoreIcon = BUSINESS_ICON[s.businessType];
                return (
                  <DropdownMenuItem
                    key={s.slug}
                    className="gap-2 p-2"
                    render={<Link href={`/dashboard/${s.slug}`} />}
                  >
                    <StoreIcon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{s.name}</span>
                    {s.slug === currentSlug && <Check className="size-4" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              render={<Link href="/dashboard/new" />}
            >
              <Plus className="size-4" />
              Buat toko baru
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
