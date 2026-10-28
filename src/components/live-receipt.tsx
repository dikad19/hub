"use client";

import { useEffect, useState } from "react";

const rp = new Intl.NumberFormat("id-ID");

type Item = { name: string; qty: string; amount: number };
type Cart = {
  id: string;
  store: string;
  items: Item[];
  pay: [label: string, amount: number][];
};

const CARTS: Cart[] = [
  {
    id: "0142",
    store: "TOKO BERKAH JAYA",
    items: [
      { name: "Loose rice", qty: "2,5 kg × 14.000", amount: 35000 },
      { name: "Iced latte (Large)", qty: "2 × 18.000", amount: 36000 },
      { name: "Sugar", qty: "1 kg × 17.000", amount: 17000 },
    ],
    pay: [
      ["QRIS", 50000],
      ["Cash", 40000],
    ],
  },
  {
    id: "0143",
    store: "WARUNG BU TINI",
    items: [
      { name: "Cooking oil", qty: "0,75 L × 20.000", amount: 15000 },
      { name: "Instant noodles", qty: "5 × 3.500", amount: 17500 },
      { name: "Eggs", qty: "1,5 kg × 28.000", amount: 42000 },
    ],
    pay: [["Cash", 100000]],
  },
  {
    id: "0144",
    store: "KOPI SORE CAFÉ",
    items: [
      { name: "Fried rice", qty: "2 × 25.000", amount: 50000 },
      { name: "Iced tea", qty: "2 × 6.000", amount: 12000 },
    ],
    pay: [["On tab", 62000]],
  },
];

const sum = (n: number[]) => n.reduce((a, b) => a + b, 0);

export function LiveReceipt() {
  const [cart, setCart] = useState(0);
  const [step, setStep] = useState(0);

  const c = CARTS[cart];
  const len = c.items.length;
  const blocks = len + 2; // item-item, pembayaran, ucapan terima kasih

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(blocks);
      return;
    }
    const delay =
      step < blocks ? (step === 0 ? 600 : 850) : step === blocks ? 3200 : 450;
    const t = setTimeout(() => {
      if (step > blocks) {
        setCart((n) => (n + 1) % CARTS.length);
        setStep(0);
      } else {
        setStep((s) => s + 1);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [step, blocks]);

  const shown = Math.min(step, len);
  const subtotal = sum(c.items.slice(0, shown).map((i) => i.amount));
  const total = sum(c.items.map((i) => i.amount));
  const change = sum(c.pay.map(([, a]) => a)) - total;
  const leaving = step > blocks;

  return (
    <div
      aria-hidden="true"
      className="mx-auto min-h-[480px] w-full max-w-sm rotate-1"
    >
      {/* printer slot */}
      <div className="relative z-10 mx-2 h-3 rounded-full bg-(--ink)" />
      <div className="-mt-1.5 overflow-hidden px-4 pb-8">
        <div
          className={`drop-shadow-[0_14px_16px_#ebebeb] ${leaving ? "receipt-out" : ""}`}
        >
          <div className="bg-white px-6 py-7 font-[family-name:var(--font-receipt)] text-[13px] tabular-nums">
            <p className="text-center text-base font-medium">{c.store}</p>
            <p className="text-center text-(--ink)/60">Receipt #{c.id}</p>
            <div className="my-4 border-t border-dashed border-(--ink)/40" />

            <ul className="space-y-3">
              {c.items.slice(0, shown).map((it) => (
                <li key={`${c.id}-${it.name}`} className="line-in">
                  <div className="flex justify-between gap-3">
                    <span>{it.name}</span>
                    <span>{rp.format(it.amount)}</span>
                  </div>
                  <span className="text-(--ink)/60">{it.qty}</span>
                </li>
              ))}
            </ul>

            {step >= 1 && (
              <>
                <div className="my-4 border-t border-dashed border-(--ink)/40" />
                <div className="flex justify-between text-base font-medium">
                  <span>Total</span>
                  <span>{rp.format(subtotal)}</span>
                </div>
              </>
            )}

            {step > len && (
              <div className="line-in mt-3 space-y-1 text-(--ink)/70">
                {c.pay.map(([label, amount]) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span>{rp.format(amount)}</span>
                  </div>
                ))}
                {change > 0 && (
                  <div className="flex justify-between">
                    <span>Change</span>
                    <span>{rp.format(change)}</span>
                  </div>
                )}
              </div>
            )}

            {step >= blocks && (
              <>
                <div className="my-4 border-t border-dashed border-(--ink)/40" />
                <p className="line-in text-center text-(--ink)/60">
                  Thanks for shopping with us
                </p>
              </>
            )}
          </div>
          {/* torn edge */}
          <div
            className="h-3 bg-white"
            style={{
              clipPath:
                "polygon(0 0,100% 0,100% 40%,95% 100%,90% 40%,85% 100%,80% 40%,75% 100%,70% 40%,65% 100%,60% 40%,55% 100%,50% 40%,45% 100%,40% 40%,35% 100%,30% 40%,25% 100%,20% 40%,15% 100%,10% 40%,5% 100%,0 40%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
