'use client'

import { useActionState } from 'react'
import type { FormState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AdjustStockForm({
  action,
  unit,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  unit: string
}) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <Input
        name="delta"
        inputMode="decimal"
        placeholder={`+10 atau -2,5 (${unit})`}
        className="w-40"
        required
      />
      <Input name="note" placeholder="Catatan (opsional)" className="w-48" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? '...' : 'Sesuaikan'}
      </Button>
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      {state.ok && <span className="text-sm text-green-600">Tersimpan</span>}
    </form>
  )
}
