// Sincronização com criptografia de ponta a ponta (ver docs/SPEC.md, seção 9b).
// Cada registro vira uma linha cifrada na tabela ttsp_items do Supabase. Vence a versão com updatedAt mais novo.
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, syncConfigured } from '../config'
import { db, getMeta, now, setMeta, type Entry, type Med, type MoodEvent, type Setting } from './db'
import { deriveSecrets, normEmail, seal, unseal } from './crypto'

type Kind = 'entry' | 'event' | 'med' | 'setting'
type Payload = { t: Kind; v: Entry | MoodEvent | Med | Setting }

export type Change = { sid: string; updatedAt: string; deleted: boolean; payload?: Payload }
export type Row = { id: string; updated_at: string; deleted: boolean; iv: string; data: string; synced_at?: string }

export type Remote = {
  push(rows: Row[]): Promise<void>
  pull(since: string | null): Promise<Row[]>
}

// ajustes que valem só para este aparelho
const LOCAL_ONLY_SETTINGS = new Set(['lastBackupAt', 'aiKey'])
const EPOCH = '1970-01-01T00:00:00.000Z'
const iso = (s: string) => new Date(s).toISOString()

let applyingRemote = false

export async function collectChanges(since: string | null): Promise<Change[]> {
  const after = (u?: string) => since == null || (u ?? EPOCH) > since
  const [entries, events, meds, settings, tombs] = await Promise.all([
    db.entries.toArray(),
    db.events.toArray(),
    db.meds.toArray(),
    db.settings.toArray(),
    db.tombstones.toArray(),
  ])
  const out: Change[] = []
  for (const v of entries) if (after(v.updatedAt)) out.push({ sid: `entry:${v.id}`, updatedAt: v.updatedAt, deleted: false, payload: { t: 'entry', v } })
  for (const v of events) if (after(v.updatedAt)) out.push({ sid: `event:${v.id}`, updatedAt: v.updatedAt, deleted: false, payload: { t: 'event', v } })
  for (const v of meds) if (after(v.updatedAt)) out.push({ sid: `med:${v.id}`, updatedAt: v.updatedAt, deleted: false, payload: { t: 'med', v } })
  for (const v of settings)
    if (!LOCAL_ONLY_SETTINGS.has(v.key) && after(v.updatedAt))
      out.push({ sid: `setting:${v.key}`, updatedAt: v.updatedAt ?? EPOCH, deleted: false, payload: { t: 'setting', v } })
  for (const t of tombs) if (after(t.updatedAt)) out.push({ sid: t.id, updatedAt: t.updatedAt, deleted: true })
  return out
}

function tableOf(kind: string) {
  if (kind === 'entry') return db.entries
  if (kind === 'event') return db.events
  if (kind === 'med') return db.meds
  if (kind === 'setting') return db.settings
  return null
}

// aplica mudanças vindas de outro aparelho. só escreve o que for mais novo que a versão local
export async function applyRemote(changes: Change[]): Promise<number> {
  let applied = 0
  applyingRemote = true
  try {
    await db.transaction('rw', [db.entries, db.events, db.meds, db.settings, db.tombstones], async () => {
      for (const c of changes) {
        const cut = c.sid.indexOf(':')
        const kind = c.sid.slice(0, cut)
        const localId = c.sid.slice(cut + 1)
        if (kind === 'setting' && LOCAL_ONLY_SETTINGS.has(localId)) continue
        const table = tableOf(kind)
        if (!table) continue
        const local = (await table.get(localId)) as { updatedAt?: string } | undefined
        const localUpdated = local?.updatedAt ?? (local ? EPOCH : '')
        const tomb = await db.tombstones.get(c.sid)
        if (c.deleted) {
          if (local && localUpdated > c.updatedAt) continue
          if (local) {
            await table.delete(localId)
            applied++
          }
          if (!tomb || tomb.updatedAt < c.updatedAt) await db.tombstones.put({ id: c.sid, updatedAt: c.updatedAt })
        } else {
          if (!c.payload) continue
          if (tomb && tomb.updatedAt >= c.updatedAt) continue
          if (local && localUpdated >= c.updatedAt) continue
          await table.put(c.payload.v as never)
          if (tomb) await db.tombstones.delete(c.sid)
          applied++
        }
      }
    })
  } finally {
    applyingRemote = false
  }
  return applied
}

export async function syncOnce(remote: Remote, key: CryptoKey): Promise<{ pushed: number; pulled: number; unreadable: number }> {
  // 1. envia o que mudou aqui desde o último envio
  const lastPush = await getMeta<string | null>('lastPush', null)
  const changes = await collectChanges(lastPush)
  const rows: Row[] = []
  for (const c of changes) {
    if (c.deleted) rows.push({ id: c.sid, updated_at: c.updatedAt, deleted: true, iv: '', data: '' })
    else {
      const s = await seal(key, c.payload)
      rows.push({ id: c.sid, updated_at: c.updatedAt, deleted: false, iv: s.iv, data: s.data })
    }
  }
  if (rows.length) await remote.push(rows)
  const maxPushed = changes.reduce<string | null>((m, c) => (m == null || c.updatedAt > m ? c.updatedAt : m), lastPush)
  await setMeta('lastPush', maxPushed)

  // 2. recebe o que mudou no servidor. volta 5 s no cursor para não perder gravações simultâneas
  const cursor = await getMeta<string | null>('pullCursor', null)
  const since = cursor ? new Date(new Date(cursor).getTime() - 5000).toISOString() : null
  const incoming = await remote.pull(since)
  const remoteChanges: Change[] = []
  let unreadable = 0
  let maxSynced = cursor
  for (const r of incoming) {
    if (r.synced_at && (maxSynced == null || iso(r.synced_at) > maxSynced)) maxSynced = iso(r.synced_at)
    if (r.deleted) {
      remoteChanges.push({ sid: r.id, updatedAt: iso(r.updated_at), deleted: true })
      continue
    }
    try {
      const payload = await unseal<Payload>(key, r.iv, r.data)
      remoteChanges.push({ sid: r.id, updatedAt: iso(r.updated_at), deleted: false, payload })
    } catch {
      unreadable++
    }
  }
  const pulled = await applyRemote(remoteChanges)
  await setMeta('pullCursor', maxSynced)
  await setMeta('lastSyncAt', now())
  await setMeta('lastSyncError', null)
  return { pushed: rows.length, pulled, unreadable }
}

// ---------- Supabase ----------

let client: SupabaseClient | null = null

async function supa(): Promise<SupabaseClient | null> {
  if (!syncConfigured()) return null
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ttsp-auth', detectSessionInUrl: false },
    })
  }
  return client
}

function supabaseRemote(c: SupabaseClient, userId: string): Remote {
  return {
    async push(rows) {
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200).map((r) => ({ ...r, user_id: userId }))
        const { error } = await c.from('ttsp_items').upsert(chunk, { onConflict: 'user_id,id' })
        if (error) throw new Error(error.message)
      }
    },
    async pull(since) {
      const out: Row[] = []
      let cur = since ?? EPOCH
      for (;;) {
        const { data, error } = await c
          .from('ttsp_items')
          .select('id,updated_at,deleted,iv,data,synced_at')
          .gt('synced_at', cur)
          .order('synced_at', { ascending: true })
          .limit(500)
        if (error) throw new Error(error.message)
        out.push(...(data as Row[]))
        if (!data || data.length < 500) break
        cur = (data[data.length - 1] as Row).synced_at as string
      }
      return out
    },
  }
}

export type SyncState = { configured: boolean; email: string | null; lastSyncAt: string | null; lastSyncError: string | null }

export async function syncState(): Promise<SyncState> {
  return {
    configured: syncConfigured(),
    email: await getMeta<string | null>('syncEmail', null),
    lastSyncAt: await getMeta<string | null>('lastSyncAt', null),
    lastSyncError: await getMeta<string | null>('lastSyncError', null),
  }
}

const friendly = (msg: string) => {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha errados.'
  if (/already registered|already exists/i.test(msg)) return 'Já existe uma conta com esse e-mail. Use entrar.'
  if (/signups not allowed|signup is disabled/i.test(msg)) return 'Novas contas estão desligadas neste projeto. Use entrar.'
  if (/email not confirmed/i.test(msg)) return 'O e-mail ainda não foi confirmado. Desligue "Confirm email" no Supabase ou confirme pelo link.'
  if (/failed to fetch|network/i.test(msg)) return 'Sem conexão. Tente de novo quando estiver online.'
  return msg
}

export async function connect(mode: 'signup' | 'signin', email: string, passphrase: string) {
  const c = await supa()
  if (!c) throw new Error('A sincronização ainda não foi configurada.')
  if (passphrase.length < 10) throw new Error('Use uma senha com pelo menos 10 caracteres.')
  const { authPassword, key } = await deriveSecrets(email, passphrase)
  const who = normEmail(email)
  const res =
    mode === 'signup'
      ? await c.auth.signUp({ email: who, password: authPassword })
      : await c.auth.signInWithPassword({ email: who, password: authPassword })
  if (res.error) throw new Error(friendly(res.error.message))
  if (!res.data.session) throw new Error('Conta criada, mas o Supabase pede confirmação de e-mail. Desligue "Confirm email" e use entrar.')
  await setMeta('encKey', key)
  await setMeta('syncEmail', who)
  // primeira sincronização deste aparelho: envia tudo e recebe tudo
  await db.meta.bulkDelete(['lastPush', 'pullCursor'])
  return syncNow()
}

export async function disconnect() {
  const c = await supa()
  await c?.auth.signOut().catch(() => {})
  await db.meta.bulkDelete(['encKey', 'syncEmail', 'lastPush', 'pullCursor', 'lastSyncAt', 'lastSyncError'])
}

let running: Promise<unknown> | null = null
let again = false

export async function syncNow(): Promise<{ pushed: number; pulled: number; unreadable: number } | null> {
  if (running) {
    again = true
    await running
    return null
  }
  const job = (async () => {
    const c = await supa()
    const key = await getMeta<CryptoKey | null>('encKey', null)
    if (!c || !key) return null
    const { data } = await c.auth.getSession()
    const userId = data.session?.user.id
    if (!userId) {
      await setMeta('lastSyncError', 'Sessão expirada. Entre de novo.')
      return null
    }
    try {
      return await syncOnce(supabaseRemote(c, userId), key)
    } catch (e) {
      await setMeta('lastSyncError', friendly((e as Error).message))
      return null
    }
  })()
  running = job
  try {
    return await job
  } finally {
    running = null
    if (again) {
      again = false
      requestSync()
    }
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
export function requestSync(delay = 1500) {
  if (!syncConfigured()) return
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), delay)
}

// qualquer escrita local agenda uma sincronização. escritas vindas do servidor não
export function initSync() {
  if (!syncConfigured()) return
  const touch = () => {
    if (!applyingRemote) requestSync()
  }
  for (const t of [db.entries, db.events, db.meds, db.settings, db.tombstones] as const) {
    t.hook('creating', touch)
    t.hook('updating', touch)
    t.hook('deleting', touch)
  }
  requestSync(300)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestSync(300)
  })
  window.addEventListener('online', () => requestSync(300))
}
