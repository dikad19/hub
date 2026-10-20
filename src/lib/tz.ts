// Semua waktu disimpan UTC; "per hari/bulan" dihitung memakai zona waktu toko.

const pad = (n: number) => String(n).padStart(2, '0')

export function dayKey(d: Date, tz: string) {
  // en-CA menghasilkan format YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export const todayInTz = (tz: string) => dayKey(new Date(), tz)

function tzOffsetMs(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - (date.getTime() - date.getUTCMilliseconds())
}

// Awal hari (00:00) di zona tz, dalam UTC
export function zonedStartOfDay(y: number, m: number, d: number, tz: string) {
  const guess = Date.UTC(y, m - 1, d)
  const off1 = tzOffsetMs(new Date(guess), tz)
  let utc = guess - off1
  const off2 = tzOffsetMs(new Date(utc), tz)
  if (off2 !== off1) utc = guess - off2
  return new Date(utc)
}

export const isDateStr = (s: string) => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s)
export const isMonthStr = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s)

export function dayRange(dateStr: string, tz: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return {
    start: zonedStartOfDay(y, m, d, tz),
    end: zonedStartOfDay(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), tz),
  }
}

export function monthRange(monthStr: string, tz: string) {
  const [y, m] = monthStr.split('-').map(Number)
  return {
    start: zonedStartOfDay(y, m, 1, tz),
    end: zonedStartOfDay(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1, tz),
  }
}

export const formatDateTime = (d: Date, tz: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(d)

export const formatDayKey = (key: string) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${key}T00:00:00Z`))

export const monthLabel = (monthStr: string) =>
  new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${monthStr}-01T00:00:00Z`),
  )

export { pad }
