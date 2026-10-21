import { useEffect, useState } from 'preact/hooks'
import type { Entry } from './lib/db'
import type { Kind } from './lib/day'
import { Home } from './screens/Home'
import { Timeline } from './screens/Timeline'
import { Events } from './screens/Events'
import { Settings } from './screens/Settings'
import { Flow } from './screens/Flow'

type Screen = 'hoje' | 'linha' | 'marcos' | 'ajustes'
type FlowState = { kind: Kind; day: string; existing?: Entry; retro: boolean } | null

const SCREENS: { key: Screen; label: string }[] = [
  { key: 'hoje', label: 'hoje' },
  { key: 'linha', label: 'linha' },
  { key: 'marcos', label: 'marcos' },
  { key: 'ajustes', label: 'ajustes' },
]

export function App() {
  const [screen, setScreen] = useState<Screen>('hoje')
  const [flow, setFlow] = useState<FlowState>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    // pede ao navegador para não apagar os dados sob pressão de espaço. no iOS precisa ser pedido a cada abertura
    navigator.storage?.persist?.().catch(() => {})
  }, [])

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 2600)
    return () => clearTimeout(t)
  }, [toastMsg])

  const log = (kind: Kind, day: string, existing?: Entry, retro = false) => setFlow({ kind, day, existing, retro })

  return (
    <div class="app">
      <main class="main">
        {screen === 'hoje' && <Home onLog={log} onNav={setScreen} />}
        {screen === 'linha' && <Timeline onLog={log} />}
        {screen === 'marcos' && <Events />}
        {screen === 'ajustes' && <Settings toast={setToastMsg} />}
      </main>
      <nav class="nav">
        {SCREENS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-current={screen === s.key ? 'page' : undefined}
            onClick={() => {
              setScreen(s.key)
              window.scrollTo(0, 0)
            }}
          >
            {s.label}
          </button>
        ))}
      </nav>
      {flow && (
        <Flow
          key={`${flow.kind}-${flow.day}-${flow.existing?.id ?? 'novo'}`}
          {...flow}
          onClose={(saved) => {
            setFlow(null)
            if (saved) setToastMsg('Registro salvo.')
          }}
        />
      )}
      {toastMsg && <div class="toast">{toastMsg}</div>}
    </div>
  )
}
