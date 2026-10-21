import { rolling, series, type DayRow } from '../lib/analytics'
import { addDays } from '../lib/day'
import { moodCss, type Mood } from '../lib/color'
import { smooth } from './Chart'

// os últimos 30 dias do índice como uma onda, com o ponto de hoje na cor do dia
export function Horizon({ days, today, todayMood }: { days: Map<string, DayRow>; today: string; todayMood: Mood | null }) {
  const vals = rolling(series(days, addDays(today, -29), today, 'indice'))
  const known = vals.filter((v): v is number => v != null)
  const W = 320
  const H = 110
  if (known.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <line class="c-grid" x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} />
        {todayMood && <circle cx={W - 8} cy={H / 2} r={6} fill={moodCss(todayMood)} class="c-dot" />}
      </svg>
    )
  }
  const lo = Math.min(...known) - 8
  const hi = Math.max(...known) + 8
  const x = (i: number) => 4 + (i * (W - 18)) / 29
  const y = (v: number) => 10 + (1 - (v - lo) / (hi - lo)) * (H - 22)
  const pts = vals.map((v, i) => (v == null ? null : ([x(i), y(v)] as [number, number]))).filter((p): p is [number, number] => !!p)
  const line = smooth(pts)
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path class="c-area" d={`${line} L${last[0]},${H} L${pts[0][0]},${H} Z`} />
      <line class="c-grid" x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} />
      <path class="c-main" d={line} />
      {todayMood && (
        <>
          <circle cx={last[0]} cy={last[1]} r={10} fill={moodCss(todayMood, 0.3)} />
          <circle cx={last[0]} cy={last[1]} r={5} fill={moodCss(todayMood)} class="c-dot" />
        </>
      )}
    </svg>
  )
}
