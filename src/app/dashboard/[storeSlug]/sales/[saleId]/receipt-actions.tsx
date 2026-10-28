"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ReceiptActions({
  canVoid,
  voidAction,
}: {
  canVoid: boolean;
  voidAction: (reason: string) => Promise<{ error?: string; ok?: boolean }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setReason("");
      setError(null);
    }
  }

  function onConfirm() {
    if (!reason.trim()) return setError("Alasan wajib diisi");
    setError(null);
    startTransition(async () => {
      const res = await voidAction(reason);
      if (res.error) return setError(res.error);
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2 print:hidden">
      <Button type="button" onClick={() => window.print()}>
        <Printer className="mr-2 size-4" />
        Cetak
      </Button>

      {canVoid && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="text-red-600 hover:text-red-700"
              />
            }
          >
            <Ban className="mr-2 size-4" />
            Batalkan (void)
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Batalkan transaksi ini?</DialogTitle>
              <DialogDescription>
                Stok barang dikembalikan, dan transaksi tetap tercatat dengan
                status VOID. Tindakan ini tidak bisa diurungkan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="void-reason">Alasan pembatalan</Label>
              <Textarea
                id="void-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Contoh: salah input jumlah"
                autoFocus
              />
              <div className="flex justify-between text-xs">
                <span className="text-red-600" aria-live="polite">
                  {error}
                </span>
                <span className="text-muted-foreground">
                  {reason.length}/200
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Kembali
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onConfirm}
                disabled={pending}
              >
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {pending ? "Memproses..." : "Batalkan transaksi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
