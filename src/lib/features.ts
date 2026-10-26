export const BUSINESS_TYPES = [
  {
    value: "RETAIL",
    label: "Toko / Retail",
    description:
      "Kelontong, grosir, minimarket, toko bangunan, dan sejenisnya.",
  },
  {
    value: "FNB",
    label: "Restoran / Kafe",
    description: "Makanan dan minuman: restoran, kafe, warung makan.",
  },
  {
    value: "SERVICE",
    label: "Jasa",
    description: "Barbershop, laundry, salon, bengkel, dan sejenisnya.",
  },
  {
    value: "OTHER",
    label: "Lainnya",
    description: "Jenis usaha lain.",
  },
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

export const isBusinessType = (v: string): v is BusinessType =>
  BUSINESS_TYPES.some((t) => t.value === v);

export type Feature =
  | "stock"
  | "purchases"
  | "credit"
  | "shifts"
  | "stockCount"
  | "returns"
  | "units"
  | "priceTiers"
  | "recipes";

export const PRESETS: Record<BusinessType, readonly Feature[]> = {
  RETAIL: [
    "stock",
    "purchases",
    "credit",
    "shifts",
    "stockCount",
    "returns",
    "units",
    "priceTiers",
  ],
  FNB: ["stock", "purchases", "shifts", "returns", "recipes"],
  SERVICE: ["credit", "shifts", "returns"],
  OTHER: ["stock", "purchases", "credit", "shifts", "returns"],
};

export const hasFeature = (features: readonly string[], f: Feature) =>
  features.includes(f);
