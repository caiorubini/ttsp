import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, deleteEntry, type Entry } from './db'
import { deriveSecrets, seal, unseal } from './crypto'
import { syncOnce, type Remote, type Row } from './sync'

const FAST = { auth: 1000, data: 1000 }

// servidor falso que imita a tabela ttsp_items: vence o updated_at mais novo, synced_at marca a gravação
function fakeServer() {
  const rows = new Map<string, Row>()
  let clock = Date.parse('2026-10-21T00:00:00Z')
  const remote: Remote = {
    async push(batch) {
      for (const r of batch) {
        const old = rows.get(r.id)
        if (old && new Date(r.updated_at) <= new Date(old.updated_at)) continue
        rows.set(r.id, { ...r, synced_at: new Date((clock += 1000)).toISOString() })
      }
    },
    async pull(since) {
      return [...rows.values()].filter((r) => !since || r.synced_at! > since).sort((a, b) => a.synced_at!.localeCompare(b.synced_at!))
    },
  }
  const put = (r: Row) => rows.set(r.id, { ...r, synced_at: new Date((clock += 1000)).toISOString() })
  return { rows, remote, put }
}

const entry = (id: string, humor: number, updatedAt: string): Entry => ({
  id,
  kind: 'night',
  day: '2026-10-21',
  at: '2026-10-21T22:00:00.000Z',
  updatedAt,
  retro: false,
  schema: 1,
  values: { humor },
  tags: [],
  meds: {},
})

describe('criptografia', () => {
  it('deriva sempre as mesmas chaves para o mesmo e-mail e senha, e chaves diferentes para outro e-mail', async () => {
    const a = await deriveSecrets('Caio@Exemplo.com ', 'uma senha longa', FAST)
    const b = await deriveSecrets('caio@exemplo.com', 'uma senha longa', FAST)
    const c = await deriveSecrets('outra@exemplo.com', 'uma senha longa', FAST)
    expect(a.authPassword).toHaveLength(64)
    expect(a.authPassword).toBe(b.authPassword)
    expect(a.authPassword).not.toBe(c.authPassword)
    const s = await seal(a.key, { ok: 1 })
    expect(await unseal(b.key, s.iv, s.data)).toEqual({ ok: 1 })
    await expect(unseal(c.key, s.iv, s.data)).rejects.toBeTruthy()
  })
})

describe('sincronização', () => {
  beforeEach(async () => {
    await Promise.all([db.entries.clear(), db.events.clear(), db.meds.clear(), db.settings.clear(), db.tombstones.clear(), db.meta.clear()])
  })

  it('envia cifrado, recebe o mais novo, ignora o mais velho e propaga exclusões', async () => {
    const { key } = await deriveSecrets('a@b.c', 'senha comprida', FAST)
    const srv = fakeServer()

    await db.entries.put(entry('e1', 40, '2026-10-21T22:00:00.000Z'))
    const r1 = await syncOnce(srv.remote, key)
    expect(r1.pushed).toBe(1)
    const row = srv.rows.get('entry:e1')!
    expect(row.data).not.toContain('humor')
    expect(await unseal(key, row.iv, row.data)).toMatchObject({ t: 'entry', v: { values: { humor: 40 } } })

    // outro aparelho grava uma versão mais nova
    const newer = await seal(key, { t: 'entry', v: entry('e1', 80, '2026-10-21T23:00:00.000Z') })
    srv.put({ id: 'entry:e1', updated_at: '2026-10-21T23:00:00+00:00', deleted: false, ...newer })
    const r2 = await syncOnce(srv.remote, key)
    expect(r2.pulled).toBe(1)
    expect((await db.entries.get('e1'))!.values.humor).toBe(80)

    // uma versão mais velha não sobrescreve
    const older = await seal(key, { t: 'entry', v: entry('e1', 10, '2026-10-21T21:00:00.000Z') })
    srv.put({ id: 'entry:e1', updated_at: '2026-10-21T21:00:00+00:00', deleted: false, ...older })
    await syncOnce(srv.remote, key)
    expect((await db.entries.get('e1'))!.values.humor).toBe(80)

    // exclusão local vai para o servidor
    await deleteEntry('e1')
    await syncOnce(srv.remote, key)
    expect(srv.rows.get('entry:e1')!.deleted).toBe(true)

    // exclusão vinda de outro aparelho apaga aqui
    await db.entries.put(entry('e2', 50, '2026-10-21T22:30:00.000Z'))
    await syncOnce(srv.remote, key)
    srv.put({ id: 'entry:e2', updated_at: '2026-10-21T23:30:00Z', deleted: true, iv: '', data: '' })
    await syncOnce(srv.remote, key)
    expect(await db.entries.get('e2')).toBeUndefined()
  })

  it('não consegue ler dados cifrados com outra senha', async () => {
    const mine = await deriveSecrets('a@b.c', 'senha comprida', FAST)
    const theirs = await deriveSecrets('a@b.c', 'outra senha qualquer', FAST)
    const srv = fakeServer()
    const s = await seal(theirs.key, { t: 'entry', v: entry('x', 1, '2026-10-21T22:00:00.000Z') })
    srv.put({ id: 'entry:x', updated_at: '2026-10-21T22:00:00Z', deleted: false, ...s })
    const r = await syncOnce(srv.remote, mine.key)
    expect(r.unreadable).toBe(1)
    expect(await db.entries.get('x')).toBeUndefined()
  })

  it('ajustes locais como a data do último backup não saem do aparelho', async () => {
    const { key } = await deriveSecrets('a@b.c', 'senha comprida', FAST)
    const srv = fakeServer()
    await db.settings.bulkPut([
      { key: 'lastBackupAt', value: '2026-10-01', updatedAt: '2026-10-21T10:00:00.000Z' },
      { key: 'textScale', value: 1.12, updatedAt: '2026-10-21T10:00:00.000Z' },
    ])
    await syncOnce(srv.remote, key)
    expect([...srv.rows.keys()]).toEqual(['setting:textScale'])
  })
})
