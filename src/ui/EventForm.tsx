import { useState } from 'preact/hooks'
import { saveEvent, type Med, type MoodEvent } from '../lib/db'
import { EVENT_TYPES, type EventType } from '../lib/dims'

type Props = {
  day: string
  meds: Med[]
  initial?: MoodEvent
  allowDayChange?: boolean
  defaultType?: EventType
  defaultMedId?: string
  onSaved: (ev: MoodEvent) => void
  onCancel: () => void
}

// criar ou editar um evento. eventos de medicação também atualizam a lista de remédios
export function EventForm({ day, meds, initial, allowDayChange, defaultType, defaultMedId, onSaved, onCancel }: Props) {
  const [type, setType] = useState<EventType>(initial?.type ?? defaultType ?? 'bom')
  const [d, setD] = useState(initial?.day ?? day)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [medId, setMedId] = useState<string>(initial?.med?.medId ?? defaultMedId ?? meds[0]?.id ?? 'novo')
  const [medName, setMedName] = useState(initial?.med?.name ?? '')
  const [dose, setDose] = useState(initial?.med?.dose ?? '')
  const [busy, setBusy] = useState(false)

  const med = meds.find((m) => m.id === medId)
  const isMed = type === 'medicacao'
  const name = isMed ? (med ? med.name : medName.trim()) : ''
  const canSave = isMed ? !!name && !!dose.trim() : !!title.trim()

  const submit = async () => {
    if (!canSave || busy) return
    setBusy(true)
    const ev = await saveEvent({
      id: initial?.id,
      day: d,
      type,
      title: title.trim() || (isMed ? `${name} · ${dose.trim()}` : ''),
      note: note.trim() || undefined,
      med: isMed ? { medId: med?.id, name, dose: dose.trim(), prevDose: initial?.med?.prevDose } : undefined,
    })
    setBusy(false)
    onSaved(ev)
  }

  return (
    <div class="section" style={{ gap: '18px' }}>
      <div class="row">
        {EVENT_TYPES.map((t) => (
          <button key={t.key} type="button" class="chip" aria-pressed={type === t.key} onClick={() => setType(t.key)}>
            {t.glyph} {t.label}
          </button>
        ))}
      </div>
      {allowDayChange && (
        <label class="field">
          <span>dia</span>
          <input class="input" type="date" value={d} onInput={(e) => setD((e.currentTarget as HTMLInputElement).value)} />
        </label>
      )}
      {isMed && (
        <>
          <div class="field">
            <span>remédio</span>
            <div class="row">
              {meds.map((m) => (
                <button key={m.id} type="button" class="chip" aria-pressed={medId === m.id} onClick={() => setMedId(m.id)}>
                  {m.name}
                </button>
              ))}
              <button type="button" class="chip" aria-pressed={medId === 'novo'} onClick={() => setMedId('novo')}>
                outro
              </button>
            </div>
          </div>
          {medId === 'novo' && (
            <label class="field">
              <span>nome do remédio</span>
              <input class="input" value={medName} onInput={(e) => setMedName((e.currentTarget as HTMLInputElement).value)} />
            </label>
          )}
          <label class="field">
            <span>{med ? `nova dose (atual: ${med.dose})` : 'dose'}</span>
            <input class="input" placeholder="ex.: 75 mg, ou 0 para suspender" value={dose} onInput={(e) => setDose((e.currentTarget as HTMLInputElement).value)} />
          </label>
        </>
      )}
      <label class="field">
        <span>{isMed ? 'título (opcional)' : 'o que aconteceu'}</span>
        <input class="input" value={title} maxLength={120} onInput={(e) => setTitle((e.currentTarget as HTMLInputElement).value)} />
      </label>
      <label class="field">
        <span>nota (opcional)</span>
        <textarea class="input" value={note} maxLength={1000} onInput={(e) => setNote((e.currentTarget as HTMLTextAreaElement).value)} />
      </label>
      <div class="row" style={{ justifyContent: 'space-between' }}>
        <button type="button" class="btn-text" onClick={onCancel}>
          cancelar
        </button>
        <button type="button" class="btn btn-primary" disabled={!canSave || busy} onClick={submit}>
          salvar evento
        </button>
      </div>
    </div>
  )
}
