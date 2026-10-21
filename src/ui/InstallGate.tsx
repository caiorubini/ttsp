import { db } from '../lib/db'
import { useLive } from '../lib/live'
import { exportBackup } from '../lib/backup'

const BYPASS_KEY = 'ttsp-browser-ok'

// no iPhone, o app da tela de início guarda os dados separados do Safari.
// para não existirem dois diários, o ttsp só funciona pelo ícone
export function needsInstall(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  let bypass = false
  try {
    bypass = localStorage.getItem(BYPASS_KEY) === '1'
  } catch {}
  return isIOS && !standalone && !bypass
}

export function InstallGate({ onBypass, toast }: { onBypass: () => void; toast: (m: string) => void }) {
  const count = useLive(() => db.entries.count(), [], 0)
  return (
    <div class="main" style={{ gap: '32px' }}>
      <div class="top mono">
        <b class="brand">this too shall pass</b>
      </div>
      <div class="section" style={{ gap: '16px', marginTop: '24px' }}>
        <h1 class="title">Instale o ttsp na tela de início</h1>
        <p class="note">
          No iPhone, o app da tela de início guarda os dados separados do Safari. Usar sempre pelo ícone garante um diário só.
        </p>
      </div>
      <ol class="steps">
        <li>
          Toque em <b>Compartilhar</b>, o quadrado com a seta para cima na barra do Safari.
        </li>
        <li>
          Escolha <b>Adicionar à Tela de Início</b> e confirme.
        </li>
        <li>Feche o Safari e abra o ttsp pelo ícone.</li>
      </ol>
      {count > 0 && (
        <div class="card">
          <p class="note">
            Este navegador já tem {count} {count === 1 ? 'registro' : 'registros'}. Exporte um backup aqui e, no app instalado, use ajustes → importar
            backup.
          </p>
          <button
            type="button"
            class="btn btn-primary"
            onClick={async () => {
              const r = await exportBackup()
              if (r !== 'cancelled') toast('Backup exportado.')
            }}
          >
            exportar backup
          </button>
        </div>
      )}
      <button
        type="button"
        class="btn-text"
        style={{ alignSelf: 'flex-start', paddingLeft: 0 }}
        onClick={() => {
          try {
            localStorage.setItem(BYPASS_KEY, '1')
          } catch {}
          onBypass()
        }}
      >
        usar no navegador mesmo assim
      </button>
    </div>
  )
}
