import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles.css'
import { App } from './app'
import { initSync } from './lib/sync'

registerSW({ immediate: true })

// atalho de depuração em desenvolvimento
if (import.meta.env.DEV) import('./lib/db').then((m) => Object.assign(window, { ttspDb: m.db }))

render(<App />, document.getElementById('app')!)
initSync()
