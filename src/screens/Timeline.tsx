import { useMemo, useState } from 'preact/hooks'
import { db, loadSettings, type Entry, type MoodEvent } from '../lib/db'
import { useLive } from '../lib/live'
import { baseline, buildDays, entryIndex, findPhases, morningNight, rolling, series, type SeriesKey } from '../lib/analytics'
import { addDays, dayRange, hhmm, kindLabel, logicalDay, MONTHS_FULL, parseDay, shortDay, type Kind } from '../lib/day'
import { DIMS, type DimKey } from '../lib/dims'
import { moodCss } from '../lib/color'
import { Chart } from '../ui/Chart'
import { MomentPicker } from '../ui/MomentPicker'
import { dayMood } from './Home'

type Props = { onLog: (kind: Kind, day: string, existing?: Entry, retro?: boolean) => void }

const RANGES = [
  { key: '14', label: '2 sem', days: 14 },
  { key: '90', label: '3 meses', days: 90 },
  { key: '365', label: '1 ano', days: 365 },
  { key: 'all', label: 'tudo', days: 0 },
] as const

const KEYS: { key: SeriesKey; label: string }[] = [
  { key: 'indice', label: 'índice' },
  ...(['humor', 'calma', 'energia', 'interesse', 'paciencia', 'clareza', 'sono_qualidade', 'descanso', 'satisfacao', 'conexao'] as DimKey[]).map((k) => ({
    key: k as SeriesKey,
    label: DIMS[k].label,
  })),
  { key: 'sono_horas', label: 'horas de sono' },
]

export function Timeline({ onLog }: Props) {
  const entries = useLive(() => db.entries.toArray(), [], [] as Entry[])
  const events = useLive(() => db.events.toArray(), [], [] as MoodEvent[])
  const settings = useLive(loadSettings, [], { dayStartHour: 5, tags: [], lastBackupAt: null as string | null, textScale: 1 })
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('90')
  const [key, setKey] = useState<SeriesKey>('indice')
  const [open, setOpen] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [retroOpen, setRetroOpen] = useState(false)
  const [limit, setLimit] = useState(14)

  const today = logicalDay(new Date(), settings.dayStartHour)
  const days = useMemo(() => buildDays(entries), [entries])
  const first = days.size ? [...days.keys()][0] : today
  const r = RANGES.find((x) => x.key === range)!
  const from = r.days ? addDays(today, -(r.days - 1)) : first < today ? first : addDays(today, -13)

  const base = useMemo(() => baseline(days, today, key), [days, today, key])
  const isHours = key === 'sono_horas'

  const pass = useMemo(() => {
    if (days.size < 14) return null
    const start = first < addDays(today, -364) ? addDays(today, -364) : first
    const idxBase = baseline(days, today, 'indice')
    if (idxBase == null) return null
    const ph = findPhases(rolling(series(days, start, today, 'indice')), idxBase)
    const sorted = [...ph.runs].sort((a, b) => a - b)
    return { ...ph, typ: sorted.length ? sorted[sorted.length >> 1] : null, max: sorted.length ? sorted[sorted.length - 1] : null, since: start }
  }, [days, today, first])

  const mn = useMemo(() => morningNight(days, 'humor'), [days])
  const inRange = entries.filter((e) => e.day >= from && e.day <= today).sort((a, b) => b.at.localeCompare(a.at))

  const sinceLabel = (d: string) => {
    const dt = parseDay(d)
    return `${MONTHS_FULL[dt.getMonth()]}${dt.getFullYear() !== new Date().getFullYear() ? ` de ${dt.getFullYear()}` : ''}`
  }

  return (
    <>
      <div class="top mono">
        <b>ttsp</b>
        <span>{days.size} dias com registro</span>
      </div>
      <h1 class="title">Linha do tempo</h1>

      <div class="seg">
        {RANGES.map((x) => (
          <button key={x.key} type="button" aria-pressed={range === x.key} onClick={() => setRange(x.key)}>
            {x.label}
          </button>
        ))}
      </div>

      <div class="skyband" aria-hidden="true">
        {dayRange(from, today).map((d) => {
          const row = days.get(d)
          const m = row ? dayMood(row.entries) : null
          return <i key={d} style={{ background: m ? moodCss(m) : 'transparent' }} />
        })}
      </div>

      <div class="section" style={{ gap: '6px' }}>
        <div class="chart">
          <Chart days={days} from={from} to={today} seriesKey={key} base={base} events={events} yMax={isHours ? 12 : 100} />
        </div>
        <div class="seg">
          {KEYS.map((k) => (
            <button key={k.key} type="button" aria-pressed={key === k.key} onClick={() => setKey(k.key)}>
              {k.label}
            </button>
          ))}
        </div>
        <p class="mono faint" style={{ marginTop: '6px' }}>
          pontos: registros na cor de cada um · linha: média de 7 dias · eventos: ◆ medicação ● bom ○ difícil
        </p>
      </div>

      <div class="pass">
        <span class="mono faint">isso também vai passar</span>
        {!pass ? (
          <p>com duas semanas de registro, aqui aparece quanto duram as suas fases difíceis.</p>
        ) : (
          <p>
            {pass.current ? `você está no ${pass.current}º dia abaixo do seu normal. ` : ''}
            {pass.runs.length
              ? `desde ${sinceLabel(pass.since)}, ${pass.runs.length === 1 ? 'houve uma fase' : `foram ${pass.runs.length} fases`} abaixo do seu normal. ${
                  pass.runs.length === 1 ? `ela durou ${pass.typ} dias` : `a típica durou ${pass.typ} dias, a mais longa ${pass.max}`
                }. ${pass.runs.length === 1 ? 'passou.' : 'todas passaram.'}`
              : pass.current
                ? 'é a primeira registrada. o seu histórico começa a contar como ela termina.'
                : 'nenhuma fase abaixo do seu normal até aqui.'}
          </p>
        )}
      </div>

      <div class="section">
        <div class="stat">
          <span class="note">humor ao acordar vs. à noite</span>
          <span class="mono">{mn.diff == null || mn.n < 3 ? 'poucos dias' : `${mn.diff > 0 ? '+' : '−'}${Math.abs(Math.round(mn.diff))} · n = ${mn.n}`}</span>
        </div>
        <div class="stat">
          <span class="note">seu normal ({key === 'indice' ? 'índice' : KEYS.find((k) => k.key === key)?.label})</span>
          <span class="mono">{base == null ? 'sem dados' : isHours ? `${base.toFixed(1).replace('.', ',')} h` : Math.round(base)}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-h">
          <h2>Registros</h2>
          <button type="button" class="btn-text" onClick={() => setRetroOpen((v) => !v)}>
            {retroOpen ? 'fechar' : 'registrar outro momento'}
          </button>
        </div>
        {retroOpen && (
          <MomentPicker
            today={today}
            entries={entries}
            initialKind="night"
            onCancel={() => setRetroOpen(false)}
            onOpen={(k, d, e, retro) => {
              setRetroOpen(false)
              onLog(k, d, e, retro)
            }}
          />
        )}
        {inRange.length === 0 && <p class="empty">Nenhum registro neste período.</p>}
        <div class="list">
          {inRange.slice(0, limit).map((e) => {
            const idx = entryIndex(e)
            return (
              <div key={e.id}>
                <button type="button" class="list-item" onClick={() => setOpen(open === e.id ? null : e.id)}>
                  <span class="mono muted">{shortDay(e.day)}</span>
                  <span>
                    <b>
                      <span class="dot" style={{ background: moodCss(e.values) }} />
                      {kindLabel(e.kind)}
                    </b>
                    <small>
                      {hhmm(e.at)}
                      {e.retro ? ' · retroativo' : ''}
                      {e.sleep ? ` · ${e.sleep.hours.toFixed(1).replace('.', ',')} h de sono` : ''}
                      {e.tags.length ? ` · ${e.tags.join(', ')}` : ''}
                    </small>
                  </span>
                  <span class="mono">{idx == null ? '·' : Math.round(idx)}</span>
                </button>
                {open === e.id && (
                  <div class="actions-inline">
                    <button type="button" class="btn-text" onClick={() => onLog(e.kind, e.day, e, e.retro)}>
                      editar
                    </button>
                    <button
                      type="button"
                      class="btn-text"
                      onClick={async () => {
                        if (confirmDel !== e.id) return setConfirmDel(e.id)
                        await db.entries.delete(e.id)
                        setConfirmDel(null)
                        setOpen(null)
                      }}
                    >
                      {confirmDel === e.id ? 'confirmar exclusão' : 'apagar'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {inRange.length > limit && (
          <button type="button" class="btn-text" style={{ justifySelf: 'start' }} onClick={() => setLimit((l) => l + 30)}>
            mostrar mais ({inRange.length - limit})
          </button>
        )}
      </div>
    </>
  )
}
