'use client'

import { useActionState, useEffect, useRef, useTransition } from 'react'
import { X } from 'lucide-react'
import type { FormState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Unit = { id: string; name: string; factor: string }

export function VariantUnitsForm({
  baseUnit,
  allowDecimal,
  units,
  addAction,
  removeAction,
}: {
  baseUnit: string
  allowDecimal: boolean
  units: Unit[]
  addAction: (prev: FormState, fd: FormData) => Promise<FormState>
  removeAction: (unitId: string) => Promise<void>
}) {
  const [state, formAction, pending] = useActionState(addAction, {})
  const [removing, startRemove] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Satuan beli</p>

      {units.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {units.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
            >
              1 {u.name} = {Number(u.factor)} {baseUnit}
              <button
                type="button"
                aria-label={`Hapus satuan ${u.name}`}
                disabled={removing}
                onClick={() => startRemove(() => removeAction(u.id))}
                className="text-muted-foreground hover:text-red-600"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Belum ada. Tambahkan jika barang dibeli dalam kemasan lain, misalnya karung atau dus.
        </p>
      )}

      <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
        <Input name="name" placeholder="Satuan (karung, dus)" className="w-44" required />
        <span className="text-sm text-muted-foreground">=</span>
        <Input
          name="factor"
          inputMode="decimal"
          placeholder={`Isi dalam ${baseUnit}`}
          className="w-36"
          required
        />
        <span className="text-sm text-muted-foreground">{baseUnit}</span>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? '...' : 'Tambah satuan'}
        </Button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </form>
      {!allowDecimal && (
        <p className="text-xs text-muted-foreground">
          Varian ini bukan curah, jadi faktor harus bilangan bulat.
        </p>
      )}
    </div>
  )
}
