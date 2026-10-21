import type { Entry, MoodEvent } from '../lib/db'
import { entryValue, rolling, type DayRow, type SeriesKey } from '../lib/analytics'
import { dayRange, daysBetween, MONTHS, parseDay } from '../lib/day'
import { moodCss } from '../lib/color'

type Props = {
  days: Map<string, DayRow>
  from: string
  to: string
  seriesKey: SeriesKey
  base: number | null
  events: MoodEvent[]
  yMax?: number
}

const W = 360
const H = 210
const P = { l: 26, r: 8, t: 22, b: 22 }

export function smooth(pts: [number, number][]): string {
  if (!pts.length) return ''
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

// quebra a linha onde não há dado
function segments(vals: (number | null)[], x: (i: number) => number, y: (v: number) => number) {
  const out: [number, number][][] = []
  let cur: [number, number][] = []
  vals.forEach((v, i) => {
    if (v == null) {
      if (cur.length) out.push(cur)
      cur = []
    } else cur.push([x(i), y(v)])
  })
  if (cur.length) out.push(cur)
  return out
}

export function Chart({ days, from, to, seriesKey, base, events, yMax = 100 }: Props) {
  const range = dayRange(from, to)
  const n = range.length
  const x = (i: number) => P.l + (n === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (n - 1))
  const y = (v: number) => P.t + (1 - v / yMax) * (H - P.t - P.b)
  const idxOf = (d: string) => daysBetween(from, d)

  const dayVals = range.map((d) => {
    const row = days.get(d)
    if (!row) return null
    const xs = row.entries.map((e) => entryValue(e, seriesKey)).filter((v): v is number => v != null)
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  })
  const roll = rolling(dayVals)

  // períodos de medicação: cada evento de medicação abre uma faixa até o próximo
  const meds = events.filter((e) => e.type === 'medicacao').sort((a, b) => a.day.localeCompare(b.day))
  const bands = meds
    .map((ev, i) => ({ ev, start: ev.day, end: meds[i + 1]?.day ?? to, alt: i % 2 === 1 }))
    .filter((b) => b.end >= from && b.start <= to)
  const pins = events.filter((e) => e.day >= from && e.day <= to)

  const dots: { cx: number; cy: number; e: Entry }[] = []
  range.forEach((d, i) => {
    const row = days.get(d)
    row?.entries.forEach((e) => {
      const v = entryValue(e, seriesKey)
      if (v != null) dots.push({ cx: x(i), cy: y(v), e })
    })
  })

  const ticks: { i: number; label: string }[] = []
  range.forEach((d, i) => {
    const dt = parseDay(d)
    if (n <= 31) {
      if (dt.getDay() === 1) ticks.push({ i, label: `${dt.getDate()} ${MONTHS[dt.getMonth()]}` })
    } else if (n <= 400) {
      if (dt.getDate() === 1) ticks.push({ i, label: MONTHS[dt.getMonth()] })
    } else if (dt.getDate() === 1 && dt.getMonth() === 0) ticks.push({ i, label: String(dt.getFullYear()) })
  })
  const r = n > 120 ? 1.3 : n > 40 ? 1.9 : 2.8
  const grid = yMax === 100 ? [25, 50, 75] : [yMax / 4, yMax / 2, (3 * yMax) / 4]
  const yLabels = yMax === 100 ? [0, 50, 100] : [0, yMax / 2, yMax]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico do período">
      {bands.map((b) => {
        const x0 = x(Math.max(0, idxOf(b.start)))
        const x1 = x(Math.min(n - 1, idxOf(b.end)))
        return <rect key={b.ev.id} class={`c-band${b.alt ? ' alt' : ''}`} x={x0} y={P.t - 6} width={Math.max(1, x1 - x0)} height={H - P.t - P.b + 6} />
      })}
      {grid.map((v) => (
        <line key={v} class="c-grid" x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} />
      ))}
      {yLabels.map((v) => (
        <text key={v} class="c-txt" x={P.l - 6} y={y(v) + 3} text-anchor="end">
          {Math.round(v)}
        </text>
      ))}
      {base != null && (
        <>
          <line class="c-base" x1={P.l} x2={W - P.r} y1={y(base)} y2={y(base)} />
          <text class="c-txt" x={P.l + 4} y={y(base) - 5}>
            seu normal
          </text>
        </>
      )}
      {dots.map((d) => (
        <circle key={d.e.id} class="c-dot" cx={d.cx} cy={d.cy} r={r} fill={moodCss(d.e.values)} fill-opacity={d.e.retro ? 0.4 : 0.85} />
      ))}
      {segments(roll, x, y).map((seg, i) =>
        seg.length > 1 ? <path key={i} class="c-main" d={smooth(seg)} /> : <circle key={i} cx={seg[0][0]} cy={seg[0][1]} r={2} fill="var(--ink)" />,
      )}
      {pins.map((ev) => {
        const px = x(idxOf(ev.day))
        return (
          <g key={ev.id}>
            <line class="c-ev" x1={px} x2={px} y1={P.t - 6} y2={H - P.b} />
            <text class="c-txt2" x={px} y={P.t - 9} text-anchor="middle">
              {ev.type === 'medicacao' ? '◆' : ev.type === 'bom' ? '●' : ev.type === 'dificil' ? '○' : '·'}
            </text>
          </g>
        )
      })}
      {ticks.map((t) => (
        <g key={t.i}>
          <line class="c-grid" x1={x(t.i)} x2={x(t.i)} y1={H - P.b} y2={H - P.b + 4} />
          <text class="c-txt" x={x(t.i)} y={H - P.b + 15} text-anchor="middle">
            {t.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
