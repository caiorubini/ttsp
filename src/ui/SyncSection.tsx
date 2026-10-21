import { useState } from 'preact/hooks'
import { db } from '../lib/db'
import { useLive } from '../lib/live'
import { connect, disconnect, syncNow, syncState, type SyncState } from '../lib/sync'
import { hhmm, labelDay, logicalDay } from '../lib/day'

const INITIAL: SyncState = { configured: false, email: null, lastSyncAt: null, lastSyncError: null }

export function SyncSection({ toast }: { toast: (m: string) => void }) {
  // relê o estado sempre que a tabela meta muda
  const state = useLive(async () => {
    await db.meta.count()
    return syncState()
  }, [], INITIAL)
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [confirmOut, setConfirmOut] = useState(false)

  if (!state.configured) {
    return (
      <div class="section">
        <div class="section-h">
          <h2>Sincronização</h2>
          <span class="mono faint">não configurada</span>
        </div>
        <p class="note">Quando o projeto do Supabase estiver ligado, seus registros vão sincronizar cifrados entre aparelhos.</p>
      </div>
    )
  }

  if (state.email) {
    const last = state.lastSyncAt
    const lastLabel = last
      ? `${logicalDay(new Date(last)) === logicalDay() ? 'hoje' : labelDay(logicalDay(new Date(last)))}, ${hhmm(last)}`
      : 'ainda não'
    return (
      <div class="section">
        <div class="section-h">
          <h2>Sincronização</h2>
          <span class="mono faint">ativa</span>
        </div>
        <div class="stat">
          <span class="note">conta</span>
          <span class="mono">{state.email}</span>
        </div>
        <div class="stat">
          <span class="note">última sincronização</span>
          <span class="mono">{lastLabel}</span>
        </div>
        {state.lastSyncError && <p class="note">{state.lastSyncError}</p>}
        <p class="note">Tudo sai deste aparelho cifrado com a sua senha. O servidor guarda só dados embaralhados.</p>
        <div class="row" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            class="btn btn-line"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              const r = await syncNow()
              setBusy(false)
              if (r) toast(r.unreadable ? `${r.unreadable} itens não abriram com esta senha.` : 'Sincronizado.')
            }}
          >
            {busy ? 'sincronizando' : 'sincronizar agora'}
          </button>
          <button
            type="button"
            class="btn-text"
            onClick={async () => {
              if (!confirmOut) return setConfirmOut(true)
              await disconnect()
              setConfirmOut(false)
              toast('Desconectado. Os registros continuam neste aparelho.')
            }}
          >
            {confirmOut ? 'confirmar saída' : 'sair'}
          </button>
        </div>
      </div>
    )
  }

  const submit = async (e: Event) => {
    e.preventDefault()
    setErr(null)
    if (mode === 'signup' && pass !== pass2) return setErr('As senhas não batem.')
    setBusy(true)
    try {
      const r = await connect(mode, email, pass)
      setPass('')
      setPass2('')
      toast(r ? `Sincronização ativa. ${r.pulled} itens recebidos.` : 'Sincronização ativa.')
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="section">
      <div class="section-h">
        <h2>Sincronização</h2>
        <span class="mono faint">desligada</span>
      </div>
      <p class="note">
        Seus registros ficam iguais em qualquer aparelho e com backup automático. Tudo é cifrado aqui com a sua senha antes de sair. Ninguém mais consegue ler, nem o Supabase.
      </p>
      <div class="seg">
        <button type="button" aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>
          criar conta
        </button>
        <button type="button" aria-pressed={mode === 'signin'} onClick={() => setMode('signin')}>
          já tenho conta
        </button>
      </div>
      <form class="section" style={{ gap: '12px' }} onSubmit={submit}>
        <label class="field">
          <span>e-mail</span>
          <input class="input" type="email" autocomplete="username" required value={email} onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="field">
          <span>senha (10 caracteres ou mais)</span>
          <input
            class="input"
            type="password"
            autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={10}
            value={pass}
            onInput={(e) => setPass((e.currentTarget as HTMLInputElement).value)}
          />
        </label>
        {mode === 'signup' && (
          <label class="field">
            <span>repita a senha</span>
            <input class="input" type="password" autocomplete="new-password" required value={pass2} onInput={(e) => setPass2((e.currentTarget as HTMLInputElement).value)} />
          </label>
        )}
        {mode === 'signup' && (
          <p class="note">
            Guarde essa senha no seu gerenciador de senhas. Ela é a única chave dos seus dados na nuvem: se você esquecer, ninguém consegue recuperar o que está lá. O que está neste aparelho continua aqui.
          </p>
        )}
        {err && <p class="note">{err}</p>}
        <button type="submit" class="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'conectando' : mode === 'signup' ? 'criar conta e sincronizar' : 'entrar e sincronizar'}
        </button>
      </form>
    </div>
  )
}
