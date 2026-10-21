import { useState } from 'preact/hooks'
import { db, loadSettings, now, type Med, type MoodEvent } from '../lib/db'
import { useLive } from '../lib/live'
import { logicalDay, shortDay } from '../lib/day'
import { EVENT_TYPES, type EventType } from '../lib/dims'
import { EventForm } from '../ui/EventForm'

type Editing = { ev?: MoodEvent; type?: EventType; medId?: string } | null

export function Events() {
  const events = useLive(() => db.events.toArray(), [], [] as MoodEvent[])
  const meds = useLive(() => db.meds.toArray(), [], [] as Med[])
  const settings = useLive(loadSettings, [], { dayStartHour: 5, tags: [], lastBackupAt: null as string | null, textScale: 1 })
  const [editing, setEditing] = useState<Editing>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const today = logicalDay(new Date(), settings.dayStartHour)
  const sorted = [...events].sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt))
  const active = meds.filter((m) => m.active)
  const inactive = meds.filter((m) => !m.active)

  if (editing) {
    return (
      <>
        <div class="top mono">
          <b>ttsp</b>
          <span>eventos</span>
        </div>
        <h1 class="title">{editing.ev ? 'Editar evento' : editing.type === 'medicacao' ? 'Medicação' : 'Novo evento'}</h1>
        <EventForm
          key={editing.ev?.id ?? 'novo'}
          day={editing.ev?.day ?? today}
          meds={active}
          initial={editing.ev}
          defaultType={editing.type}
          defaultMedId={editing.medId}
          allowDayChange
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      </>
    )
  }

  return (
    <>
      <div class="top mono">
        <b>ttsp</b>
        <span>{events.length} {events.length === 1 ? 'evento' : 'eventos'}</span>
      </div>
      <h1 class="title">Eventos</h1>
      <p class="note">Fatos que importam: uma mudança de remédio, uma frustração, uma notícia boa. Eles aparecem como alfinetes na linha do tempo, e cada mudança de remédio abre uma faixa.</p>
      <button type="button" class="btn btn-primary btn-block" onClick={() => setEditing({})}>
        novo evento
      </button>

      <div class="section">
        <div class="section-h">
          <h2>Remédios</h2>
          <button type="button" class="btn-text" onClick={() => setEditing({ type: 'medicacao', medId: 'novo' })}>
            adicionar
          </button>
        </div>
        {active.length === 0 && <p class="empty">Nenhum remédio cadastrado. Cadastre para registrar se tomou e ver as faixas de dose no gráfico.</p>}
        <div class="list">
          {active.map((m) => (
            <div class="list-item" key={m.id}>
              <span class="mono muted">◆</span>
              <span>
                <b>{m.name}</b>
                <small>{m.dose}</small>
              </span>
              <button type="button" class="btn-text" onClick={() => setEditing({ type: 'medicacao', medId: m.id })}>
                mudar dose
              </button>
            </div>
          ))}
          {inactive.map((m) => (
            <div class="list-item" key={m.id}>
              <span class="mono faint">◇</span>
              <span>
                <b class="faint">{m.name}</b>
                <small>suspenso</small>
              </span>
              <button type="button" class="btn-text" onClick={() => db.meds.put({ ...m, active: true, updatedAt: now() })}>
                reativar
              </button>
            </div>
          ))}
        </div>
      </div>

      <div class="section">
        <div class="section-h">
          <h2>Histórico</h2>
        </div>
        {sorted.length === 0 && <p class="empty">Nenhum evento ainda.</p>}
        <div class="list">
          {sorted.map((ev) => {
            const t = EVENT_TYPES.find((x) => x.key === ev.type)
            return (
              <div key={ev.id}>
                <div class="list-item">
                  <span class="mono muted">{shortDay(ev.day)}</span>
                  <button type="button" style={{ textAlign: 'left' }} onClick={() => setEditing({ ev })}>
                    <b>
                      {t?.glyph} {ev.title}
                    </b>
                    <small>
                      {t?.label}
                      {ev.med?.prevDose ? ` · ${ev.med.prevDose} → ${ev.med.dose}` : ''}
                      {ev.note ? ` · ${ev.note}` : ''}
                    </small>
                  </button>
                  <button
                    type="button"
                    class="btn-text"
                    onClick={async () => {
                      if (confirmDel !== ev.id) return setConfirmDel(ev.id)
                      await db.events.delete(ev.id)
                      setConfirmDel(null)
                    }}
                  >
                    {confirmDel === ev.id ? 'confirmar' : 'apagar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
