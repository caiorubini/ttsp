import { useMemo } from 'preact/hooks'
import { db, loadSettings, type Entry } from '../lib/db'
import { useLive } from '../lib/live'
import { buildDays } from '../lib/analytics'
import { dailyFact } from '../lib/facts'
import { daysBetween, fmtDay, hhmm, labelDay, logicalDay, suggestKind, type Kind } from '../lib/day'
import { moodCss, type Mood } from '../lib/color'
import { Horizon } from '../ui/Horizon'

type Props = { onLog: (kind: Kind, day: string, existing?: Entry) => void; onNav: (s: 'ajustes') => void }

export function dayMood(entries: Entry[]): Mood | null {
  const pick = (k: 'humor' | 'calma' | 'energia') => {
    const xs = entries.map((e) => e.values[k]).filter((v): v is number => v != null)
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  }
  if (!entries.length) return null
  return { humor: pick('humor'), calma: pick('calma'), energia: pick('energia') }
}

export function Home({ onLog, onNav }: Props) {
  const entries = useLive(() => db.entries.toArray(), [], [] as Entry[])
  const settings = useLive(loadSettings, [], { dayStartHour: 5, tags: [], lastBackupAt: null as string | null })

  const nowD = new Date()
  const today = logicalDay(nowD, settings.dayStartHour)
  const days = useMemo(() => buildDays(entries), [entries])
  const fact = useMemo(() => dailyFact(entries, today), [entries, today])
  const row = days.get(today)
  const todayMood = row ? dayMood(row.entries) : null

  const suggested = suggestKind(nowD, settings.dayStartHour)
  const other: Kind = suggested === 'morning' ? 'night' : 'morning'
  const nights = [...days.values()].filter((r) => r.night).length
  const mornings = [...days.values()].filter((r) => r.morning).length

  const backupAge = settings.lastBackupAt ? daysBetween(fmtDay(new Date(settings.lastBackupAt)), fmtDay(nowD)) : null
  const needsBackup = entries.length >= 5 && (backupAge == null || backupAge > 7)

  return (
    <>
      <div class="top mono">
        <b>ttsp</b>
        <span>{labelDay(today)}</span>
      </div>

      <div>
        <p class="phrase today-phrase">{fact.phrase}</p>
        <p class="basis mono">
          {entries.length ? `${fact.basis} · a partir de ${mornings} ${mornings === 1 ? 'manhã' : 'manhãs'} e ${nights} ${nights === 1 ? 'noite' : 'noites'}` : fact.basis}
        </p>
      </div>

      <div class="horizon">
        <Horizon days={days} today={today} todayMood={todayMood} />
        <div class="row mono faint" style={{ justifyContent: 'space-between', marginTop: '4px', fontSize: '11px' }}>
          <span>30 dias</span>
          <span>hoje</span>
        </div>
      </div>

      <div class="status mono">
        {(['morning', 'night'] as Kind[]).map((k) => {
          const e = row?.[k]
          return (
            <div key={k}>
              <span>
                <span class="dot" style={{ background: e ? moodCss(e.values) : 'transparent' }} />
                {k === 'morning' ? 'manhã' : 'noite'}
              </span>
              {e ? (
                <button type="button" class="mono muted" onClick={() => onLog(k, today, e)}>
                  {hhmm(e.at)} · editar
                </button>
              ) : (
                <span class="faint">ainda não</span>
              )}
            </div>
          )
        })}
      </div>

      {!row?.[suggested] ? (
        <button type="button" class="btn btn-primary btn-block" onClick={() => onLog(suggested, today)}>
          registrar a {suggested === 'morning' ? 'manhã' : 'noite'}
        </button>
      ) : !row?.[other] ? (
        <button type="button" class="btn btn-line btn-block" onClick={() => onLog(other, today)}>
          registrar a {other === 'morning' ? 'manhã' : 'noite'}
        </button>
      ) : (
        <p class="note">Os dois registros de hoje estão feitos.</p>
      )}

      {needsBackup && (
        <button type="button" class="nudge" onClick={() => onNav('ajustes')}>
          {backupAge == null ? 'Você ainda não fez nenhum backup. Fazer agora.' : `Último backup há ${backupAge} dias. Fazer agora.`}
        </button>
      )}
    </>
  )
}
