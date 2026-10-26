"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCustomer, updateCustomer } from "./actions";

export type CustomerFormValue = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  creditLimit: number | null;
};

export function CustomerForm({
  storeSlug,
  customer,
}: {
  storeSlug: string;
  customer?: CustomerFormValue;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [note, setNote] = useState(customer?.note ?? "");
  const [creditLimit, setCreditLimit] = useState(
    customer?.creditLimit != null ? String(customer.creditLimit) : "",
  );

  function submit() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const input = { name, phone, note, creditLimit };
      if (customer) {
        const res = await updateCustomer(storeSlug, customer.id, input);
        if (!res.ok) return setError(res.error);
        setSaved(true);
        router.refresh();
      } else {
        const res = await createCustomer(storeSlug, input);
        if (!res.ok) return setError(res.error);
        router.push(`/dashboard/${storeSlug}/customers/${res.customerId}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Nama</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Telepon</span>
          <Input
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Opsional"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Batas bon (Rp)</span>
          <Input
            inputMode="numeric"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value.replace(/\D/g, ""))}
            placeholder="Kosongkan = tanpa batas"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Catatan</span>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opsional"
            maxLength={200}
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending
            ? "Menyimpan..."
            : customer
              ? "Simpan perubahan"
              : "Simpan pelanggan"}
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        {saved && (
          <span className="text-sm text-muted-foreground">Tersimpan</span>
        )}
      </div>
    </div>
  );
}
