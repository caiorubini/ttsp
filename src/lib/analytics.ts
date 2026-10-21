// Análises (ver docs/SPEC.md, seção 7). Funções puras, testadas em analytics.test.ts.
import type { Entry } from './db'
import { addDays, dayRange, daysBetween } from './day'
import { INDEX_KEYS, type DimKey } from './dims'

export type SeriesKey = DimKey | 'indice' | 'sono_horas'

export type DayRow = {
  day: string
  entries: Entry[]
  morning?: Entry
  night?: Entry
  retro: boolean
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function entryIndex(e: Pick<Entry, 'values'>): number | null {
  const xs = INDEX_KEYS.map((k) => e.values[k]).filter((v): v is number => v != null)
  return mean(xs)
}

export function entryValue(e: Entry, key: SeriesKey): number | null {
  if (key === 'indice') return entryIndex(e)
  if (key === 'sono_horas') return e.sleep?.hours ?? null
  return e.values[key] ?? null
}

export function buildDays(entries: Entry[]): Map<string, DayRow> {
  const map = new Map<string, DayRow>()
  const sorted = [...entries].sort((a, b) => a.at.localeCompare(b.at))
  for (const e of sorted) {
    let row = map.get(e.day)
    if (!row) {
      row = { day: e.day, entries: [], retro: false }
      map.set(e.day, row)
    }
    row.entries.push(e)
    if (e.kind === 'morning') row.morning = e
    else row.night = e
    if (e.retro) row.retro = true
  }
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])))
}

export function dayValue(row: DayRow | undefined, key: SeriesKey): number | null {
  if (!row) return null
  return mean(row.entries.map((e) => entryValue(e, key)).filter((v): v is number => v != null))
}

export function series(days: Map<string, DayRow>, from: string, to: string, key: SeriesKey): (number | null)[] {
  return dayRange(from, to).map((d) => dayValue(days.get(d), key))
}

// média móvel de 7 dias corridos, contando só os dias com dado
export function rolling(vals: (number | null)[], window = 7): (number | null)[] {
  return vals.map((_, i) => {
    const xs: number[] = []
    for (let j = Math.max(0, i - window + 1); j <= i; j++) {
      const v = vals[j]
      if (v != null) xs.push(v)
    }
    return mean(xs)
  })
}

// seu normal: mediana dos valores diários dos últimos 90 dias
export function baseline(days: Map<string, DayRow>, lastDay: string, key: SeriesKey, window = 90): number | null {
  const xs = series(days, addDays(lastDay, -(window - 1)), lastDay, key).filter((v): v is number => v != null)
  return median(xs)
}

export type Phases = {
  runs: number[] // durações das fases já encerradas
  current: number // dias da fase em curso (0 se não há)
  lastEndedAgo: number | null // dias desde o fim da última fase encerrada
  lastEndedLength: number | null
}

// fase abaixo do normal: 3+ dias seguidos com média móvel < normal − gap
export function findPhases(roll: (number | null)[], base: number, gap = 6, minLen = 3): Phases {
  const runs: number[] = []
  let cur = 0
  let lastEndIdx: number | null = null
  let lastLen: number | null = null
  for (let i = 0; i < roll.length; i++) {
    const v = roll[i]
    if (v != null && v < base - gap) {
      cur++
    } else {
      if (cur >= minLen) {
        runs.push(cur)
        lastEndIdx = i - 1
        lastLen = cur
      }
      cur = 0
    }
  }
  const n = roll.length
  const current = cur >= minLen ? cur : 0
  return {
    runs,
    current,
    lastEndedAgo: lastEndIdx == null ? null : n - 1 - lastEndIdx,
    lastEndedLength: lastLen,
  }
}

export function morningNight(days: Map<string, DayRow>, key: SeriesKey = 'humor'): { diff: number | null; n: number } {
  const diffs: number[] = []
  for (const row of days.values()) {
    if (!row.morning || !row.night) continue
    const m = entryValue(row.morning, key)
    const n = entryValue(row.night, key)
    if (m != null && n != null) diffs.push(m - n)
  }
  return { diff: mean(diffs), n: diffs.length }
}

// instabilidade: média do quadrado das diferenças sucessivas
export function mssd(vals: (number | null)[]): number | null {
  const xs = vals.filter((v): v is number => v != null)
  if (xs.length < 3) return null
  let s = 0
  for (let i = 1; i < xs.length; i++) s += (xs[i] - xs[i - 1]) ** 2
  return s / (xs.length - 1)
}

export function daysWithData(days: Map<string, DayRow>): number {
  return days.size
}

export function spanDays(days: Map<string, DayRow>): number {
  const keys = [...days.keys()]
  if (!keys.length) return 0
  return daysBetween(keys[0], keys[keys.length - 1]) + 1
}
