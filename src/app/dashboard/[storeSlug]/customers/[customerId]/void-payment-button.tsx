"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { voidPayment } from "../actions";

export function VoidPaymentButton({
  storeSlug,
  paymentId,
}: {
  storeSlug: string;
  paymentId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Batalkan
      </Button>
    );
  }

  function confirm() {
    setError("");
    startTransition(async () => {
      const res = await voidPayment(storeSlug, paymentId, reason);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Input
        aria-label="Alasan pembatalan"
        placeholder="Alasan"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-8 w-40"
        maxLength={200}
      />
      <Button
        type="button"
        size="sm"
        onClick={confirm}
        disabled={pending || !reason.trim()}
      >
        {pending ? "..." : "Ya, batalkan"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(false)}
      >
        Tutup
      </Button>
      {error && (
        <span className="w-full text-right text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
