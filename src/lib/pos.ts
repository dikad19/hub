export type PosItem = {
  id: string;
  label: string;
  unit: string;
  allowDecimal: boolean;
  price: number;
  sku: string | null;
  barcode: string | null;
  stockMode: "NONE" | "DIRECT" | "RECIPE";
  stock: string | null;
};

export const METHOD_LABEL = {
  CASH: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  OTHER: "Lainnya",
  CREDIT: "Bon",
} as const;

export const variantLabel = (productName: string, variantName: string) =>
  variantName === "Standar" ? productName : `${productName} · ${variantName}`;

const K = BigInt(1000);

export function toMilli(qty: string): bigint | null {
  const s = qty.trim().replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,3})?$/.test(s)) return null;
  const [i, f = ""] = s.split(".");
  return BigInt(i) * K + BigInt(f.padEnd(3, "0"));
}

export function milliToString(m: bigint): string {
  const i = m / K;
  const f = (m % K).toString().padStart(3, "0").replace(/0+$/, "");
  return f ? `${i}.${f}` : `${i}`;
}

export function lineTotalOf(price: number, qty: string): number | null {
  const m = toMilli(qty);
  if (m === null) return null;
  return Number((BigInt(price) * m + BigInt(500)) / K);
}
