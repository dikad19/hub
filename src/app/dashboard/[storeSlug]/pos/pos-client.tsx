"use client";

import { Fragment, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  Landmark,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Trash2,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { createSale, type SaleInput } from "./actions";
import {
  METHOD_LABEL,
  lineTotalOf,
  milliToString,
  toMilli,
  type PosItem,
} from "@/lib/pos";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Line = { id: string; qty: string };
type Method = SaleInput["paymentMethod"];

// "Bon" (CREDIT) belum didukung createSale versi ini, jadi disembunyikan dulu
const METHODS = (Object.keys(METHOD_LABEL) as string[]).filter(
  (m) => m !== "CREDIT",
) as Method[];
const METHOD_ICON: Record<string, LucideIcon> = {
  CASH: Banknote,
  QRIS: QrCode,
  TRANSFER: Landmark,
  OTHER: Wallet,
};

const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");
const digits = (s: string) => s.replace(/\D/g, "");
const numStr = (s: string) =>
  Number(s).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const grouped = (s: string) => (s ? Number(s).toLocaleString("id-ID") : "");
const initials = (s: string) =>
  s
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

// Usulan uang diterima: pembulatan ke atas ke pecahan yang umum
function cashSuggestions(total: number) {
  if (total <= 0) return [];
  const set = new Set<number>();
  for (const step of [5000, 10000, 20000, 50000, 100000]) {
    set.add(Math.ceil(total / step) * step);
  }
  set.delete(total);
  return [...set].sort((a, b) => a - b).slice(0, 4);
}

// crypto.randomUUID hanya ada di konteks aman (https/localhost); beri fallback
function newKey() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export function PosClient({
  storeSlug,
  items,
}: {
  storeSlug: string;
  items: PosItem[];
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [paid, setPaid] = useState("");
  const [customer, setCustomer] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{
    saleId: string;
    receiptNo: number;
  } | null>(null);
  const [key, setKey] = useState(newKey);
  const [cartOpen, setCartOpen] = useState(false); // hanya dipakai di mobile
  const [step, setStep] = useState<1 | 2>(1);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const qtyInCart = useMemo(
    () => new Map(lines.map((l) => [l.id, l.qty])),
    [lines],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            i.sku?.toLowerCase().includes(q) ||
            i.barcode?.toLowerCase().includes(q),
        )
      : items;
    return list.slice(0, 30);
  }, [items, query]);

  function add(item: PosItem) {
    if (item.stock !== null && Number(item.stock) <= 0) return;
    setDone(null);
    setError(null);
    setStep(1);

    setLines((ls) => {
      const ex = ls.find((l) => l.id === item.id);
      if (!ex) return [...ls, { id: item.id, qty: "1" }];
      const next = (toMilli(ex.qty) ?? BigInt(0)) + BigInt(1000);
      return ls.map((l) =>
        l.id === item.id ? { ...l, qty: milliToString(next) } : l,
      );
    });
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault(); // scanner USB mengirim Enter setelah barcode
    const q = query.trim().toLowerCase();
    if (!q) return;
    const exact = items.find(
      (i) => i.barcode?.toLowerCase() === q || i.sku?.toLowerCase() === q,
    );
    const target = exact ?? (results.length === 1 ? results[0] : undefined);
    if (target) {
      add(target);
      setQuery("");
    }
  }

  const computed = lines.flatMap((l) => {
    const item = byId.get(l.id);
    if (!item) return [];
    const milli = toMilli(l.qty);
    const total = lineTotalOf(item.price, l.qty);
    const invalid =
      milli === null ||
      milli <= BigInt(0) ||
      total === null ||
      (!item.allowDecimal && milli % BigInt(1000) !== BigInt(0));
    const over =
      item.stock !== null &&
      milli !== null &&
      Number(l.qty.replace(",", ".")) > Number(item.stock);
    return [{ l, item, total: total ?? 0, invalid, over }];
  });

  const subtotal = computed.reduce((s, c) => s + c.total, 0);
  const discountNum = Number(digits(discount) || "0");
  const discountTooBig = discountNum > subtotal;
  const total = Math.max(0, subtotal - discountNum);
  const paidNum = method === "CASH" ? Number(digits(paid) || "0") : total;
  const change = paidNum - total;
  const hasInvalid = computed.some((c) => c.invalid);
  const canPay =
    computed.length > 0 && !hasInvalid && !discountTooBig && paidNum >= total;
  const itemCount = computed.length;
  // kalau keranjang kosong, selalu kembali ke langkah 1
  const activeStep = itemCount === 0 ? 1 : step;
  const canNext = itemCount > 0 && !hasInvalid;
  function setQty(id: string, qty: string) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty } : l)));
  }
  function bump(c: (typeof computed)[number], delta: number) {
    const cur = toMilli(c.l.qty) ?? BigInt(0);
    const next = cur + BigInt(delta * 1000);
    if (next <= BigInt(0))
      return setLines((ls) => ls.filter((l) => l.id !== c.l.id));
    setQty(c.l.id, milliToString(next));
  }
  function clearCart() {
    setLines([]);
    setDiscount("");
    setPaid("");
    setError(null);
    setStep(1);
  }

  async function submit() {
    setError(null);
    setPending(true);
    try {
      const res = await createSale(storeSlug, {
        items: lines.map((l) => ({ variantId: l.id, qty: l.qty })),
        discount,
        paymentMethod: method,
        amountPaid: paid,
        customerName: customer,
        note,
        idempotencyKey: key,
      });
      if (!res.ok) {
        setError(res.error);
        setKey(newKey()); // server menolak, tidak ada transaksi tercatat
        return;
      }
      setDone({ saleId: res.saleId, receiptNo: res.receiptNo });
      setLines([]);
      setDiscount("");
      setPaid("");
      setCustomer("");
      setNote("");
      setMethod("CASH");
      setKey(newKey());
      setCartOpen(false);
      router.refresh(); // muat ulang stok
      searchRef.current?.focus();
    } catch {
      // key sengaja TIDAK diganti: menekan Bayar lagi aman (tidak akan dobel)
      setError(
        "Koneksi bermasalah. Tekan Bayar lagi (aman, tidak akan tercatat dobel).",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px]">
      {/* ---------------- Kiri: katalog ---------------- */}
      <div className="min-w-0 space-y-4 pb-24 lg:pb-0">
        {done && (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="size-3.5" />
            </span>
            <span>Transaksi #{done.receiptNo} berhasil.</span>
            <Link
              href={`/dashboard/${storeSlug}/sales/${done.saleId}`}
              className="ml-auto font-medium hover:underline"
            >
              Lihat struk
            </Link>
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            autoFocus
            placeholder="Cari produk, SKU, atau scan barcode"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            className="h-11 rounded-md bg-muted/40 pr-10 pl-10 shadow-none focus-visible:bg-background"
          />
          {query && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
            <Search className="size-7 opacity-40" />
            Tidak ada produk yang cocok.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {results.map((i) => {
              const soldOut = i.stock !== null && Number(i.stock) <= 0;
              const inCart = qtyInCart.get(i.id);
              return (
                <button
                  key={i.id}
                  type="button"
                  disabled={soldOut}
                  onClick={() => add(i)}
                  className={cn(
                    "group relative flex min-h-28 flex-col items-start gap-2 rounded-lg bg-card p-3 text-left text-sm ring-1 ring-foreground/8 transition-all",
                    soldOut
                      ? "cursor-not-allowed opacity-50"
                      : "hover:-translate-y-px hover:shadow-md hover:ring-foreground/20 active:translate-y-0 active:scale-[0.98]",
                    inCart && "bg-primary/5 ring-2 ring-primary",
                  )}
                >
                  <span className="flex size-8 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    {initials(i.label)}
                  </span>
                  {inCart && (
                    <Badge className="absolute top-2.5 right-2.5 h-5 min-w-5 justify-center rounded-full px-1.5 tabular-nums">
                      {numStr(inCart)}
                    </Badge>
                  )}
                  <span className="line-clamp-2 leading-snug font-medium">
                    {i.label}
                  </span>
                  <span className="mt-auto flex w-full items-end justify-between gap-1">
                    <span className="font-semibold tabular-nums">
                      {rp(i.price)}
                      <span className="text-xs font-normal text-muted-foreground">
                        /{i.unit}
                      </span>
                    </span>
                  </span>
                  {soldOut ? (
                    <Badge variant="destructive">Habis</Badge>
                  ) : (
                    i.stock !== null && (
                      <span className="text-xs text-muted-foreground">
                        {i.stockMode === "RECIPE"
                          ? `Sisa ${numStr(i.stock)} porsi`
                          : `Stok ${numStr(i.stock)}`}
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {cartOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setCartOpen(false)}
        />
      )}

      <section
        className={cn(
          "hidden min-h-0 flex-col overflow-hidden bg-card lg:flex lg:rounded-lg lg:shadow-sm lg:ring-1 lg:ring-foreground/8",
          "lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100svh-6rem)]",
          cartOpen &&
            "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:flex max-lg:max-h-[92svh] max-lg:rounded-t-2xl",
        )}
      >
        {/* ---------- Header ---------- */}
        <header className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-3">
          <h2 className="text-base font-semibold tracking-tight">Keranjang</h2>
          {itemCount > 0 && (
            <Badge variant="secondary" className="rounded-full tabular-nums">
              {itemCount}
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1">
            {itemCount > 0 && activeStep === 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={clearCart}
              >
                Kosongkan
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              aria-label="Tutup keranjang"
              onClick={() => setCartOpen(false)}
            >
              <X />
            </Button>
          </div>
        </header>

        {/* ---------- Indikator langkah ---------- */}
        <nav className="flex shrink-0 items-center gap-3 px-4 pb-3 text-xs">
          {(
            [
              { n: 1, label: "Pesanan" },
              { n: 2, label: "Pembayaran" },
            ] as const
          ).map(({ n, label }, idx) => {
            const active = activeStep === n;
            const reached = activeStep > n;
            const disabled = n === 2 && !canNext;
            return (
              <Fragment key={n}>
                {idx === 1 && (
                  <span
                    className={cn(
                      "h-px flex-1 transition-colors",
                      activeStep > 1 ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setStep(n)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 font-medium transition-colors disabled:cursor-not-allowed",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[11px] tabular-nums",
                      active || reached
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {reached ? <Check className="size-3" /> : n}
                  </span>
                  {label}
                </button>
              </Fragment>
            );
          })}
        </nav>

        {/* ---------- Isi (scrollable) ---------- */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t">
          {activeStep === 1 ? (
            computed.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-4 py-10 text-center text-sm text-muted-foreground">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <ShoppingBag className="size-5" />
                </span>
                Belum ada item. Pilih produk untuk mulai.
              </div>
            ) : (
              <ul className="space-y-2 p-4">
                {computed.map((c) => (
                  <li
                    key={c.l.id}
                    className="rounded-lg bg-muted/40 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="leading-tight font-medium">
                          {c.item.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {rp(c.item.price)} / {c.item.unit}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="-mt-1 -mr-1 text-muted-foreground hover:text-destructive"
                        aria-label="Hapus"
                        onClick={() =>
                          setLines((ls) => ls.filter((x) => x.id !== c.l.id))
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="bg-background"
                          aria-label="Kurangi"
                          onClick={() => bump(c, -1)}
                        >
                          <Minus />
                        </Button>
                        <Input
                          inputMode="decimal"
                          value={c.l.qty}
                          onChange={(e) => setQty(c.l.id, e.target.value)}
                          className="h-8 w-14 bg-background px-1 text-center tabular-nums"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="bg-background"
                          aria-label="Tambah"
                          onClick={() => bump(c, 1)}
                        >
                          <Plus />
                        </Button>
                      </div>
                      <p className="font-semibold tabular-nums">
                        {rp(c.total)}
                      </p>
                    </div>
                    {c.invalid && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {c.item.allowDecimal
                          ? "Jumlah tidak valid"
                          : "Harus bilangan bulat"}
                      </p>
                    )}
                    {!c.invalid && c.over && (
                      <p className="mt-1.5 text-xs text-destructive">
                        Melebihi stok ({numStr(c.item.stock!)})
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="space-y-4 p-4 text-sm">
              {/* Ringkasan + diskon */}
              <div className="space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({itemCount} item)</span>
                  <span className="tabular-nums">{rp(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Diskon</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      inputMode="numeric"
                      value={grouped(digits(discount))}
                      onChange={(e) => setDiscount(digits(e.target.value))}
                      placeholder="0"
                      className="h-8 w-32 pl-8 text-right tabular-nums"
                    />
                  </div>
                </div>
                {discountTooBig && (
                  <p className="text-xs text-destructive">
                    Diskon melebihi subtotal
                  </p>
                )}
              </div>

              {/* Metode bayar */}
              <div
                className="grid gap-1 rounded-lg bg-muted p-1"
                style={{
                  gridTemplateColumns: `repeat(${METHODS.length}, 1fr)`,
                }}
              >
                {METHODS.map((m) => {
                  const Icon = METHOD_ICON[m] ?? Wallet;
                  const active = method === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      aria-pressed={active}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition",
                        active
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-3.5" />
                      {METHOD_LABEL[m]}
                    </button>
                  );
                })}
              </div>

              {method === "CASH" ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Uang diterima</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        inputMode="numeric"
                        value={grouped(digits(paid))}
                        onChange={(e) => setPaid(digits(e.target.value))}
                        placeholder="0"
                        className="h-10 w-40 pl-8 text-right text-base font-medium tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={total === 0}
                      onClick={() => setPaid(String(total))}
                    >
                      Uang pas
                    </Button>
                    {cashSuggestions(total).map((n) => (
                      <Button
                        key={n}
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setPaid(String(n))}
                      >
                        {n.toLocaleString("id-ID")}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5">
                    <span className="text-muted-foreground">Kembalian</span>
                    {paid === "" ? (
                      <span className="text-xs text-muted-foreground">
                        Masukkan uang diterima
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-base font-semibold tabular-nums",
                          change < 0
                            ? "text-destructive"
                            : "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {change < 0 ? `Kurang ${rp(-change)}` : rp(change)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-muted-foreground">
                  Terima {rp(total)} via {METHOD_LABEL[method]}.
                </p>
              )}

              {/* Pelanggan & catatan */}
              <div className="space-y-2">
                <Input
                  placeholder="Nama pelanggan (opsional)"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                />
                <Input
                  placeholder="Catatan (opsional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ---------- Footer (selalu terlihat) ---------- */}
        <div className="shrink-0 space-y-3 border-t bg-card p-4">
          <div className="flex items-baseline justify-between">
            <span className="font-medium">Total</span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {rp(activeStep === 1 ? subtotal : total)}
            </span>
          </div>

          {error && activeStep === 2 && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {activeStep === 1 ? (
            <Button
              className="h-10 w-full rounded-md text-sm font-semibold"
              size="lg"
              disabled={!canNext}
              onClick={() => setStep(2)}
            >
              Lanjut ke pembayaran
              <ArrowRight />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 rounded-lg"
                disabled={pending}
                onClick={() => setStep(1)}
                aria-label="Kembali ke pesanan"
              >
                <ArrowLeft />
              </Button>
              <Button
                className="h-12 flex-1 rounded-lg text-base font-semibold"
                size="lg"
                disabled={!canPay || pending}
                onClick={submit}
              >
                {pending ? "Memproses..." : `Bayar ${rp(total)}`}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Mobile: bar bawah pembuka keranjang ---------------- */}
      {itemCount > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <Button
            size="lg"
            className="h-12 w-full justify-between rounded-xl shadow-lg"
            onClick={() => setCartOpen(true)}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag />
              {itemCount} item
            </span>
            <span className="font-semibold tabular-nums">{rp(total)}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
