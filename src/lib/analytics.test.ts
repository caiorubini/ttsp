import { describe, expect, it } from 'vitest'
import type { Entry } from './db'
import { addDays } from './day'
import { baseline, buildDays, entryIndex, findPhases, median, morningNight, mssd, rolling, series } from './analytics'
import { computeFacts } from './facts'

let n = 0
const entry = (day: string, kind: 'morning' | 'night', v: number, extra: Partial<Entry> = {}): Entry => ({
  id: `e${n++}`,
  kind,
  day,
  at: `${day}T${kind === 'morning' ? '07' : '22'}:00:00.000Z`,
  updatedAt: `${day}T23:00:00.000Z`,
  retro: false,
  schema: 1,
  values: { humor: v, calma: v, interesse: v, paciencia: v, clareza: v, energia: 50 },
  tags: [],
  meds: {},
  ...extra,
})

describe('análises', () => {
  it('índice ignora energia e valores pulados', () => {
    expect(entryIndex({ values: { humor: 80, calma: 40, energia: 0, interesse: null } })).toBe(60)
    expect(entryIndex({ values: { energia: 90 } })).toBeNull()
  })
  it('mediana', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(median([])).toBeNull()
  })
  it('média móvel conta só dias com dado', () => {
    expect(rolling([10, null, 30], 7)).toEqual([10, 10, 20])
    expect(rolling([null, null], 7)).toEqual([null, null])
  })
  it('valor do dia é a média de manhã e noite', () => {
    const days = buildDays([entry('2026-10-01', 'morning', 40), entry('2026-10-01', 'night', 60)])
    expect(series(days, '2026-10-01', '2026-10-02', 'indice')).toEqual([50, null])
  })
  it('encontra fases abaixo do normal', () => {
    const roll = [60, 60, 50, 50, 50, 60, 60, 50, 50, 50, 50]
    const ph = findPhases(roll, 60, 6, 3)
    expect(ph.runs).toEqual([3])
    expect(ph.current).toBe(4)
    expect(ph.lastEndedAgo).toBe(6)
  })
  it('ignora quedas menores que 3 dias', () => {
    expect(findPhases([60, 50, 50, 60], 60).runs).toEqual([])
  })
  it('manhã menos noite', () => {
    const days = buildDays([entry('2026-10-01', 'morning', 40), entry('2026-10-01', 'night', 60), entry('2026-10-02', 'morning', 50)])
    expect(morningNight(days)).toEqual({ diff: -20, n: 1 })
  })
  it('mssd', () => {
    expect(mssd([1, 3, 2])).toBe((4 + 1) / 2)
    expect(mssd([1, 2])).toBeNull()
  })
  it('linha de base usa os últimos 90 dias', () => {
    const es = Array.from({ length: 100 }, (_, i) => entry(addDays('2026-07-01', i), 'night', i < 10 ? 0 : 70))
    expect(baseline(buildDays(es), addDays('2026-07-01', 99), 'indice')).toBe(70)
  })
})

describe('fatos e frases', () => {
  const today = '2026-10-21'
  it('sem dados, convida a começar', () => {
    expect(computeFacts([], today)[0].id).toBe('start0')
  })
  it('fase em curso com histórico ganha prioridade', () => {
    const es: Entry[] = []
    for (let i = 0; i < 60; i++) {
      const d = addDays(today, -59 + i)
      const low = (i >= 15 && i < 25) || i >= 54
      es.push(entry(d, 'morning', low ? 30 : 70), entry(d, 'night', low ? 30 : 70))
    }
    const f = computeFacts(es, today)[0]
    expect(f.id).toBe('phase_current')
    expect(f.phrase).toMatch(/dia abaixo do seu normal/)
  })
  it('detecta manhãs piores que noites', () => {
    const es: Entry[] = []
    for (let i = 0; i < 20; i++) {
      const d = addDays(today, -19 + i)
      es.push(entry(d, 'morning', 50), entry(d, 'night', 62))
    }
    expect(computeFacts(es, today).some((f) => f.id === 'morning_night')).toBe(true)
  })
  it('três noites curtas', () => {
    const es = [0, 1, 2].map((i) => entry(addDays(today, -i), 'morning', 60, { sleep: { bed: '02:00', wake: '06:30', hours: 4.5 } }))
    expect(computeFacts(es, today)[0].id).toBe('short_sleep')
  })
})
