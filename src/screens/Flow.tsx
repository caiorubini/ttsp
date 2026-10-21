import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { db, loadSettings, now, uid, type Entry, type Med, type Values } from '../lib/db'
import { kindLabel, labelDay, sleepHours, type Kind } from '../lib/day'
import { CORE, DIMS, MORNING_EXTRA, NIGHT_EXTRA, DEFAULT_TAGS, type DimKey } from '../lib/dims'
import { hasMood, moodCss, moodHex, moodName } from '../lib/color'
import { Vas } from '../ui/Vas'
import { EventForm } from '../ui/EventForm'

type Step = { t: 'dim'; key: DimKey } | { t: 'sleep' } | { t: 'tags' } | { t: 'meds' } | { t: 'event' }

type Props = { kind: Kind; day: string; retro: boolean; existing?: Entry; onClose: (saved: boolean) => void }

const ADVANCE_MS = 650

export function Flow({ kind, day, retro, existing, onClose }: Props) {
  const [ready, setReady] = useState(false)
  const [meds, setMeds] = useState<Med[]>([])
  const [tagOptions, setTagOptions] = useState<string[]>(DEFAULT_TAGS)
  const [prev, setPrev] = useState<Entry | null>(null)

  const [i, setI] = useState(0)
  const [swap, setSwap] = useState(false)
  const [values, setValues] = useState<Values>(existing?.values ?? {})
  const [sleep, setSleep] = useState(existing?.sleep ?? { bed: '23:30', wake: '07:00', hours: 7.5 })
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [taken, setTaken] = useState<Record<string, boolean>>(existing?.meds ?? {})
  const [evMode, setEvMode] = useState<'ask' | 'form'>('ask')
  const [exitArmed, setExitArmed] = useState(false)
  const [saved, setSaved] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const idRef = useRef(existing?.id ?? uid())
  const atRef = useRef(existing?.at ?? now())

  useEffect(() => {
    ;(async () => {
      const [all, ms, st] = await Promise.all([db.entries.orderBy('day').toArray(), db.meds.toArray(), loadSettings()])
      const sorted = all.filter((e) => e.id !== existing?.id).sort((a, b) => a.at.localeCompare(b.at))
      const before = sorted.filter((e) => e.day < day || (e.day === day && e.kind === 'morning' && kind === 'night'))
      setPrev(before[before.length - 1] ?? null)
      const lastSleep = [...sorted].reverse().find((e) => e.sleep)?.sleep
      if (!existing?.sleep && lastSleep) setSleep(lastSleep)
      setMeds(ms.filter((m) => m.active))
      setTagOptions(st.tags)
      setReady(true)
    })()
    return () => clearTimeout(timer.current)
  }, [])

  const steps: Step[] = useMemo(() => {
    const dims: Step[] = CORE.map((key) => ({ t: 'dim', key }))
    if (kind === 'morning') return [...dims, { t: 'sleep' }, ...MORNING_EXTRA.map((key): Step => ({ t: 'dim', key }))]
    return [
      ...dims,
      ...NIGHT_EXTRA.map((key): Step => ({ t: 'dim', key })),
      { t: 'tags' },
      ...(meds.length ? [{ t: 'meds' } as Step] : []),
      { t: 'event' },
    ]
  }, [kind, meds.length])

  const atEnd = i >= steps.length
  const step = steps[i]

  const go = (n: number) => {
    clearTimeout(timer.current)
    setSwap(true)
    setTimeout(() => {
      setI(Math.max(0, Math.min(steps.length, n)))
      setEvMode('ask')
      setSwap(false)
    }, 200)
  }

  // salva ao chegar no fim
  useEffect(() => {
    if (!atEnd || saved) return
    const t = now()
    const entry: Entry = {
      id: idRef.current,
      kind,
      day,
      at: atRef.current,
      updatedAt: t,
      retro: existing?.retro ?? retro,
      schema: 1,
      values,
      sleep: kind === 'morning' ? { ...sleep, hours: sleepHours(sleep.bed, sleep.wake) } : undefined,
      tags: kind === 'night' ? tags : [],
      meds: kind === 'night' ? taken : {},
    }
    db.entries.put(entry).then(() => setSaved(true))
  }, [atEnd])

  const answered = Object.values(values).some((v) => v != null) || tags.length > 0
  const painted = hasMood(values)
  const mood = { humor: values.humor, calma: values.calma, energia: values.energia }

  const setDim = (key: DimKey, v: number | null) => setValues((s) => ({ ...s, [key]: v }))

  if (!ready) return <div class="flow" />

  return (
    <div class={`flow${painted ? ' on-color' : ''}`} style={painted ? { backgroundColor: moodCss(mood) } : undefined}>
      <div class="flow-inner">
        <div class="prog">
          {steps.map((_, k) => (
            <i key={k} class={k < i || atEnd ? 'on' : ''} />
          ))}
        </div>
        <div class="flow-step mono">
          <span>
            {kindLabel(kind)}
            {retro || existing?.retro ? ` · ${labelDay(day)}` : ''}
          </span>
          {atEnd ? (
            <span>{saved ? 'salvo' : 'salvando'}</span>
          ) : (
            <button
              type="button"
              class="mono"
              style={{ color: 'inherit' }}
              onClick={() => {
                if (!answered || exitArmed) onClose(false)
                else setExitArmed(true)
              }}
            >
              {exitArmed ? 'sair sem salvar?' : `${i + 1} de ${steps.length} · sair`}
            </button>
          )}
        </div>

        <div class={`flow-body${swap ? ' swap' : ''}`}>
          {atEnd && (
            <>
              <div class="flow-dim mono">sua cor de agora</div>
              <p class="flow-q">{moodName(mood)}</p>
              <div class="flow-vals mono">
                {(Object.keys(DIMS) as DimKey[])
                  .filter((k) => k in values)
                  .map((k) => (
                    <div key={k}>
                      <span>{DIMS[k].label}</span>
                      <span>{values[k] == null ? 'pulado' : Math.round(values[k] as number)}</span>
                    </div>
                  ))}
                {kind === 'morning' && (
                  <div>
                    <span>sono</span>
                    <span>{sleepHours(sleep.bed, sleep.wake).toFixed(1).replace('.', ',')} h</span>
                  </div>
                )}
                <div>
                  <span>cor</span>
                  <span>{moodHex(mood)}</span>
                </div>
              </div>
            </>
          )}

          {step?.t === 'dim' && (
            <>
              <div class="flow-dim mono">{DIMS[step.key].label}</div>
              <p class="flow-q">{DIMS[step.key].q}</p>
              <Vas
                key={step.key}
                value={values[step.key] ?? null}
                label={DIMS[step.key].label}
                p0={DIMS[step.key].p0}
                p1={DIMS[step.key].p1}
                prev={prev?.values[step.key] ?? null}
                prevLabel={prev ? (prev.kind === 'morning' ? 'manhã anterior' : 'noite anterior') : undefined}
                onChange={(v) => {
                  clearTimeout(timer.current)
                  setDim(step.key, v)
                }}
                onRelease={() => {
                  clearTimeout(timer.current)
                  timer.current = window.setTimeout(() => go(i + 1), ADVANCE_MS)
                }}
              />
            </>
          )}

          {step?.t === 'sleep' && (
            <>
              <div class="flow-dim mono">sono</div>
              <p class="flow-q">Que horas você deitou e acordou?</p>
              <div class="times">
                <label class="field">
                  <span>deitei</span>
                  <input class="time-input" type="time" value={sleep.bed} onInput={(e) => setSleep((s) => ({ ...s, bed: (e.currentTarget as HTMLInputElement).value || s.bed }))} />
                </label>
                <label class="field">
                  <span>acordei</span>
                  <input class="time-input" type="time" value={sleep.wake} onInput={(e) => setSleep((s) => ({ ...s, wake: (e.currentTarget as HTMLInputElement).value || s.wake }))} />
                </label>
              </div>
              <p class="mono muted" style={{ marginTop: '18px' }}>
                {sleepHours(sleep.bed, sleep.wake).toFixed(1).replace('.', ',')} horas na cama
              </p>
            </>
          )}

          {step?.t === 'tags' && (
            <>
              <div class="flow-dim mono">contexto</div>
              <p class="flow-q">O que fez parte do seu dia?</p>
              <div class="row">
                {tagOptions.map((t) => (
                  <button key={t} type="button" class="chip" aria-pressed={tags.includes(t)} onClick={() => setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))}>
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}

          {step?.t === 'meds' && (
            <>
              <div class="flow-dim mono">remédios</div>
              <p class="flow-q">Você tomou os remédios de hoje?</p>
              <div>
                {meds.map((m) => (
                  <div class="med-row" key={m.id}>
                    <span>
                      {m.name} <span class="mono faint">{m.dose}</span>
                    </span>
                    <span class="row" style={{ gap: '8px' }}>
                      <button type="button" class="chip" aria-pressed={taken[m.id] === true} onClick={() => setTaken((s) => ({ ...s, [m.id]: true }))}>
                        tomei
                      </button>
                      <button type="button" class="chip" aria-pressed={taken[m.id] === false} onClick={() => setTaken((s) => ({ ...s, [m.id]: false }))}>
                        não
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {step?.t === 'event' && evMode === 'ask' && (
            <>
              <div class="flow-dim mono">marco</div>
              <p class="flow-q">Algo importante aconteceu hoje?</p>
              <p class="note">Uma mudança de remédio, uma frustração, uma notícia boa. É a única parte do registro com texto.</p>
              <div class="row" style={{ marginTop: '22px' }}>
                <button type="button" class="btn btn-line" onClick={() => go(i + 1)}>
                  não
                </button>
                <button type="button" class="btn btn-primary" onClick={() => setEvMode('form')}>
                  sim, registrar
                </button>
              </div>
            </>
          )}
          {step?.t === 'event' && evMode === 'form' && (
            <>
              <div class="flow-dim mono">marco</div>
              <p class="flow-q" style={{ marginBottom: '20px' }}>
                O que aconteceu?
              </p>
              <EventForm day={day} meds={meds} onSaved={() => go(i + 1)} onCancel={() => setEvMode('ask')} />
            </>
          )}
        </div>

        <div class="flow-actions">
          {atEnd ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setSaved(false)
                  go(steps.length - 1)
                }}
              >
                voltar
              </button>
              <button type="button" class="btn btn-primary" disabled={!saved} onClick={() => onClose(true)}>
                concluir
              </button>
            </>
          ) : (
            <>
              <button type="button" style={{ visibility: i === 0 ? 'hidden' : 'visible' }} onClick={() => go(i - 1)}>
                voltar
              </button>
              {step?.t === 'dim' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (values[step.key] == null) setDim(step.key, null)
                    go(i + 1)
                  }}
                >
                  {values[step.key] != null ? 'próxima' : 'pular'}
                </button>
              ) : step?.t === 'event' ? (
                <span />
              ) : (
                <button type="button" class="btn btn-primary" onClick={() => go(i + 1)}>
                  continuar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
