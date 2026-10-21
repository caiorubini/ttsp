import Dexie, { type Table } from 'dexie'
import type { Kind } from './day'
import type { DimKey, EventType } from './dims'
import { DEFAULT_TAGS } from './dims'

export type Values = Partial<Record<DimKey, number | null>>

export type Entry = {
  id: string
  kind: Kind
  day: string
  at: string
  updatedAt: string
  retro: boolean
  schema: 1
  values: Values
  sleep?: { bed: string; wake: string; hours: number }
  tags: string[]
  meds: Record<string, boolean>
}

export type MoodEvent = {
  id: string
  day: string
  type: EventType
  title: string
  note?: string
  med?: { medId?: string; name: string; dose: string; prevDose?: string }
  createdAt: string
  updatedAt: string
}

export type Med = { id: string; name: string; dose: string; active: boolean; createdAt: string; updatedAt: string }

export type Setting = { key: string; value: unknown }

class TtspDB extends Dexie {
  entries!: Table<Entry, string>
  events!: Table<MoodEvent, string>
  meds!: Table<Med, string>
  settings!: Table<Setting, string>

  constructor() {
    super('ttsp')
    this.version(1).stores({
      entries: 'id, day, kind, [day+kind]',
      events: 'id, day, type',
      meds: 'id',
      settings: 'key',
    })
  }
}

export const db = new TtspDB()

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const now = () => new Date().toISOString()

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.settings.get(key)
  return s ? (s.value as T) : fallback
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

export type Settings = { dayStartHour: number; tags: string[]; lastBackupAt: string | null }

export async function loadSettings(): Promise<Settings> {
  const all = await db.settings.toArray()
  const map = new Map(all.map((s) => [s.key, s.value]))
  return {
    dayStartHour: (map.get('dayStartHour') as number) ?? 5,
    tags: (map.get('tags') as string[]) ?? DEFAULT_TAGS,
    lastBackupAt: (map.get('lastBackupAt') as string) ?? null,
  }
}

// salva um marco. um marco de medicação também atualiza (ou cria) o remédio
export async function saveEvent(ev: Omit<MoodEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const t = now()
  const prev = ev.id ? await db.events.get(ev.id) : undefined
  const full: MoodEvent = { ...ev, id: ev.id ?? uid(), createdAt: prev?.createdAt ?? t, updatedAt: t }
  await db.transaction('rw', db.events, db.meds, async () => {
    if (full.type === 'medicacao' && full.med && full.med.name.trim()) {
      const name = full.med.name.trim()
      let med = full.med.medId ? await db.meds.get(full.med.medId) : undefined
      if (!med) med = (await db.meds.toArray()).find((m) => m.name.toLowerCase() === name.toLowerCase())
      if (med) {
        if (!prev && full.med.prevDose == null && med.dose !== full.med.dose) full.med.prevDose = med.dose
        await db.meds.put({ ...med, dose: full.med.dose, active: !/^(0|suspens|parei|parou)/i.test(full.med.dose.trim()), updatedAt: t })
        full.med.medId = med.id
      } else {
        const id = uid()
        await db.meds.put({ id, name, dose: full.med.dose, active: true, createdAt: t, updatedAt: t })
        full.med.medId = id
      }
    }
    await db.events.put(full)
  })
  return full
}
