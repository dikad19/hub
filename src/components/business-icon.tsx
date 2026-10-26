import {
  Briefcase,
  Scissors,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { BusinessType } from "@/lib/features";

export const BUSINESS_ICON: Record<BusinessType, LucideIcon> = {
  RETAIL: Store,
  FNB: UtensilsCrossed,
  SERVICE: Scissors,
  OTHER: Briefcase,
};
