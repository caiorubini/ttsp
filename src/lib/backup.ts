// Backup e exportação (ver docs/SPEC.md, seção 9). Os dados só saem do aparelho por aqui.
import { db, now, setSetting, type Entry, type Med, type MoodEvent, type Setting } from './db'
import { entryIndex } from './analytics'
import { DIMS, type DimKey } from './dims'
import { fmtDay } from './day'

export type Backup = {
  app: 'ttsp'
  version: 1
  exportedAt: string
  entries: Entry[]
  events: MoodEvent[]
  meds: Med[]
  settings: Setting[]
}

const PRIVATE_SETTINGS = new Set(['aiKey', 'lastBackupAt'])

export async function buildBackup(): Promise<Backup> {
  const [entries, events, meds, settings] = await Promise.all([
    db.entries.toArray(),
    db.events.toArray(),
    db.meds.toArray(),
    db.settings.toArray(),
  ])
  return {
    app: 'ttsp',
    version: 1,
    exportedAt: now(),
    entries,
    events,
    meds,
    settings: settings.filter((s) => !PRIVATE_SETTINGS.has(s.key)),
  }
}

// no iPhone abre o menu de compartilhar (salvar em Arquivos, iCloud, AirDrop)
export async function deliver(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: blob.type })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename })
      return 'shared'
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded'
}

export async function exportBackup() {
  const data = await buildBackup()
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
  const res = await deliver(blob, `ttsp-backup-${fmtDay(new Date())}.json`)
  if (res !== 'cancelled') await setSetting('lastBackupAt', now())
  return res
}

const newer = (a?: { updatedAt?: string }, b?: { updatedAt?: string }) => !b || (a?.updatedAt ?? '') > (b.updatedAt ?? '')

export async function importBackup(text: string) {
  let data: Backup
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('O arquivo não é um JSON válido.')
  }
  if (data?.app !== 'ttsp' || !Array.isArray(data.entries)) throw new Error('Este arquivo não é um backup do ttsp.')
  const count = { entries: 0, events: 0, meds: 0 }
  await db.transaction('rw', db.entries, db.events, db.meds, db.settings, async () => {
    for (const e of data.entries) {
      if (newer(e, await db.entries.get(e.id))) {
        await db.entries.put(e)
        count.entries++
      }
    }
    for (const e of data.events ?? []) {
      if (newer(e, await db.events.get(e.id))) {
        await db.events.put(e)
        count.events++
      }
    }
    for (const m of data.meds ?? []) {
      if (newer(m, await db.meds.get(m.id))) {
        await db.meds.put(m)
        count.meds++
      }
    }
    for (const s of data.settings ?? []) if (!PRIVATE_SETTINGS.has(s.key)) await db.settings.put(s)
  })
  // registros importados podem ser mais antigos que o último envio: a próxima sincronização manda tudo
  await db.meta.delete('lastPush')
  return count
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function exportCsv() {
  const entries = (await db.entries.toArray()).sort((a, b) => a.at.localeCompare(b.at))
  const keys = Object.keys(DIMS) as DimKey[]
  const head = ['dia', 'momento', 'registrado_em', 'retroativo', ...keys, 'indice', 'deitou', 'acordou', 'horas_sono', 'contexto', 'remedios_tomados']
  const rows = entries.map((e) => [
    e.day,
    e.kind === 'morning' ? 'manhã' : 'noite',
    e.at,
    e.retro ? 'sim' : 'não',
    ...keys.map((k) => (e.values[k] == null ? '' : Math.round(e.values[k] as number))),
    entryIndex(e) == null ? '' : Math.round(entryIndex(e) as number),
    e.sleep?.bed ?? '',
    e.sleep?.wake ?? '',
    e.sleep?.hours ?? '',
    e.tags.join(' | '),
    Object.entries(e.meds)
      .filter(([, v]) => v)
      .length,
  ])
  const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
  return deliver(new Blob(['﻿' + csv], { type: 'text/csv' }), `ttsp-registros-${fmtDay(new Date())}.csv`)
}
