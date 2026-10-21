import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  base: '/ttsp/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'ttsp',
        short_name: 'ttsp',
        description: 'this too shall pass. Registro de humor pessoal.',
        lang: 'pt-BR',
        start_url: '/ttsp/',
        scope: '/ttsp/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0c0e13',
        theme_color: '#0c0e13',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // o navegador só baixa os subconjuntos de fonte que usa. latin e latin-ext bastam no cache offline
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        navigateFallback: '/ttsp/index.html',
      },
    }),
  ],
})
