import { useState } from 'preact/hooks'
import type { Entry } from '../lib/db'
import { kindLabel, labelDay, type Kind } from '../lib/day'

type Props = {
  today: string
  entries: Entry[]
  initialKind: Kind
  onOpen: (kind: Kind, day: string, existing: Entry | undefined, retro: boolean) => void
  onCancel: () => void
}

// escolher qual momento registrar: manhã ou noite, de hoje ou de um dia passado
export function MomentPicker({ today, entries, initialKind, onOpen, onCancel }: Props) {
  const [day, setDay] = useState(today)
  const [kind, setKind] = useState<Kind>(initialKind)
  const existing = entries.find((e) => e.day === day && e.kind === kind)
  const valid = !!day && day <= today

  return (
    <div class="card">
      <div class="row">
        {(['morning', 'night'] as Kind[]).map((k) => (
          <button key={k} type="button" class="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {kindLabel(k)}
          </button>
        ))}
      </div>
      <label class="field">
        <span>dia</span>
        <input class="input" type="date" max={today} value={day} onInput={(e) => setDay((e.currentTarget as HTMLInputElement).value)} />
      </label>
      <p class="mono faint">
        {!valid
          ? 'escolha um dia até hoje'
          : `${kindLabel(kind)} de ${day === today ? 'hoje' : labelDay(day)}${existing ? ' · já registrada, abre para editar' : ''}${day !== today ? ' · fica marcada como retroativa' : ''}`}
      </p>
      <div class="row" style={{ justifyContent: 'space-between' }}>
        <button type="button" class="btn-text" onClick={onCancel}>
          cancelar
        </button>
        <button type="button" class="btn btn-primary" disabled={!valid} onClick={() => onOpen(kind, day, existing, day !== today)}>
          {existing ? 'editar registro' : 'abrir registro'}
        </button>
      </div>
    </div>
  )
}
