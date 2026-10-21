import { useEffect, useState } from 'preact/hooks'
import { db, loadSettings, setSetting } from '../lib/db'
import { useLive } from '../lib/live'
import { exportBackup, exportCsv, importBackup } from '../lib/backup'
import { DEFAULT_TAGS } from '../lib/dims'
import { daysBetween, fmtDay } from '../lib/day'
import { SyncSection } from '../ui/SyncSection'

export function Settings({ toast }: { toast: (msg: string) => void }) {
  const settings = useLive(loadSettings, [], { dayStartHour: 5, tags: DEFAULT_TAGS, lastBackupAt: null as string | null, textScale: 1 })
  const count = useLive(() => db.entries.count(), [], 0)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [newTag, setNewTag] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  const backupLabel = settings.lastBackupAt
    ? `último backup: ${daysBetween(fmtDay(new Date(settings.lastBackupAt)), fmtDay(new Date())) === 0 ? 'hoje' : `há ${daysBetween(fmtDay(new Date(settings.lastBackupAt)), fmtDay(new Date()))} dias`}`
    : 'nenhum backup feito'

  return (
    <>
      <div class="top mono">
        <b>ttsp</b>
        <span>ajustes</span>
      </div>
      <h1 class="title">Ajustes</h1>

      <SyncSection toast={toast} />

      <div class="section">
        <div class="section-h">
          <h2>Backup</h2>
          <span class="mono faint">{backupLabel}</span>
        </div>
        <p class="note">Seus registros vivem só neste iPhone. O backup é um arquivo que você guarda no iCloud ou em Arquivos e pode importar de volta a qualquer momento.</p>
        <button
          type="button"
          class="btn btn-primary btn-block"
          onClick={async () => {
            const r = await exportBackup()
            if (r !== 'cancelled') toast('Backup exportado.')
          }}
        >
          exportar backup
        </button>
        <label class="btn btn-line btn-block" style={{ display: 'block', cursor: 'pointer' }}>
          importar backup
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const input = e.currentTarget as HTMLInputElement
              const file = input.files?.[0]
              input.value = ''
              if (!file) return
              try {
                const c = await importBackup(await file.text())
                toast(`Importado: ${c.entries} registros, ${c.events} eventos, ${c.meds} remédios.`)
              } catch (err) {
                toast((err as Error).message)
              }
            }}
          />
        </label>
        <button type="button" class="btn-text" style={{ justifySelf: 'start' }} onClick={() => exportCsv()}>
          exportar planilha (CSV) · {count} registros
        </button>
      </div>

      <div class="section">
        <div class="section-h">
          <h2>Tamanho do texto</h2>
        </div>
        <div class="seg">
          {[
            [1, 'normal'],
            [1.12, 'maior'],
            [1.25, 'bem maior'],
          ].map(([v, label]) => (
            <button key={v} type="button" aria-pressed={settings.textScale === v} onClick={() => setSetting('textScale', v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div class="section">
        <div class="section-h">
          <h2>O dia vira às</h2>
          <span class="mono faint">registros antes disso contam como a noite anterior</span>
        </div>
        <div class="seg">
          {[3, 4, 5, 6, 7].map((h) => (
            <button key={h} type="button" aria-pressed={settings.dayStartHour === h} onClick={() => setSetting('dayStartHour', h)}>
              {h}h
            </button>
          ))}
        </div>
      </div>

      <div class="section">
        <div class="section-h">
          <h2>Contexto do dia</h2>
          <span class="mono faint">toque duas vezes para remover</span>
        </div>
        <div class="row">
          {settings.tags.map((t) => (
            <button
              key={t}
              type="button"
              class="chip"
              aria-pressed={removing === t}
              onClick={() => {
                if (removing !== t) return setRemoving(t)
                setSetting(
                  'tags',
                  settings.tags.filter((x) => x !== t),
                )
                setRemoving(null)
              }}
            >
              {removing === t ? `remover ${t}` : t}
            </button>
          ))}
        </div>
        <form
          class="row"
          style={{ flexWrap: 'nowrap' }}
          onSubmit={(e) => {
            e.preventDefault()
            const t = newTag.trim().toLowerCase()
            if (t && !settings.tags.includes(t)) setSetting('tags', [...settings.tags, t])
            setNewTag('')
          }}
        >
          <input class="input" placeholder="novo contexto" maxLength={30} value={newTag} onInput={(e) => setNewTag((e.currentTarget as HTMLInputElement).value)} />
          <button type="submit" class="btn btn-line">
            adicionar
          </button>
        </form>
      </div>

      <div class="section">
        <div class="section-h">
          <h2>Armazenamento</h2>
        </div>
        <div class="stat">
          <span class="note">proteção contra limpeza automática</span>
          <span class="mono">{persisted == null ? 'indisponível' : persisted ? 'ativa' : 'pendente'}</span>
        </div>
        {persisted === false && (
          <button
            type="button"
            class="btn-text"
            style={{ justifySelf: 'start' }}
            onClick={async () => setPersisted((await navigator.storage?.persist?.()) ?? false)}
          >
            pedir proteção de novo
          </button>
        )}
        <p class="note">Abra o ttsp sempre pelo ícone da tela inicial. No iPhone, o app da tela inicial guarda os dados separados do Safari.</p>
      </div>

      <div class="section">
        <div class="section-h">
          <h2>Sobre</h2>
          <span class="mono faint">v{__APP_VERSION__}</span>
        </div>
        <p class="note">this too shall pass. Especificação e código em github.com/caiorubini/ttsp.</p>
      </div>
    </>
  )
}
