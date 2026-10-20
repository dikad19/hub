'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function ReceiptActions({
  canVoid,
  voidAction,
}: {
  canVoid: boolean
  voidAction: (reason: string) => Promise<{ error?: string; ok?: boolean }>
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onVoid() {
    const reason = window.prompt('Alasan membatalkan transaksi ini?')
    if (!reason) return
    setError(null)
    startTransition(async () => {
      const res = await voidAction(reason)
      if (res.error) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-2 print:hidden">
      <div className="flex gap-2">
        <Button type="button" onClick={() => window.print()}>
          Cetak
        </Button>
        {canVoid && (
          <Button type="button" variant="outline" disabled={pending} onClick={onVoid}>
            {pending ? 'Memproses...' : 'Batalkan (void)'}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
