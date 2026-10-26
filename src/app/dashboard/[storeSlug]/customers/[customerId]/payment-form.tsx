"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { METHOD_LABEL } from "@/lib/pos";
import { rupiah } from "@/lib/format";
import { recordPayment } from "../actions";

const selectClass =
  "h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PaymentForm({
  storeSlug,
  customerId,
  balance,
}: {
  storeSlug: string;
  customerId: string;
  balance: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await recordPayment(storeSlug, customerId, {
        amount,
        method,
        note,
      });
      if (!res.ok) return setError(res.error);
      setAmount("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-md border bg-background p-4">
      <h2 className="font-medium">Catat pembayaran bon</h2>
      <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_2fr_auto]">
        <div className="flex gap-2">
          <Input
            aria-label="Nominal"
            inputMode="numeric"
            placeholder="Nominal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setAmount(String(balance))}
            title={`Lunasi ${rupiah(balance)}`}
          >
            Lunas
          </Button>
        </div>
        <select
          aria-label="Metode"
          className={selectClass}
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {Object.entries(METHOD_LABEL)
            .filter(([value]) => value !== "CREDIT")
            .map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </select>
        <Input
          aria-label="Catatan"
          placeholder="Catatan (opsional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
        />
        <Button type="button" onClick={submit} disabled={pending || !amount}>
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
