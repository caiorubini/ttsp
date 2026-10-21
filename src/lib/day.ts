// Dia lógico: o dia vira às 5h (configurável). Um registro à 1h conta como noite do dia anterior.

export type Kind = 'morning' | 'night'

const pad = (n: number) => String(n).padStart(2, '0')

export function fmtDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function logicalDay(d: Date = new Date(), startHour = 5): string {
  const x = new Date(d)
  if (x.getHours() < startHour) x.setDate(x.getDate() - 1)
  return fmtDay(x)
}

export function addDays(s: string, n: number): string {
  const d = parseDay(s)
  d.setDate(d.getDate() + n)
  return fmtDay(d)
}

// diferença em dias de calendário (b − a), imune a horário de verão
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000)
}

export function dayRange(from: string, to: string): string[] {
  const out: string[] = []
  const n = daysBetween(from, to)
  for (let i = 0; i <= n; i++) out.push(addDays(from, i))
  return out
}

export function suggestKind(d: Date = new Date(), startHour = 5): Kind {
  const h = d.getHours()
  return h >= startHour && h < 14 ? 'morning' : 'night'
}

export const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MONTHS_FULL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function labelDay(s: string): string {
  const d = parseDay(s)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function shortDay(s: string): string {
  const d = parseDay(s)
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`
}

export function hhmm(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}h${pad(d.getMinutes())}`
}

export const kindLabel = (k: Kind) => (k === 'morning' ? 'manhã' : 'noite')

// horas entre deitar e acordar, cruzando a meia-noite quando preciso
export function sleepHours(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number)
  const [wh, wm] = wake.split(':').map(Number)
  let mins = wh * 60 + wm - (bh * 60 + bm)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 100) / 100
}
