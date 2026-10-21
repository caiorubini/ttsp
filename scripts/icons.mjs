// Gera os ícones PNG do app (o iOS não usa SVG na tela inicial).
// Uso: node scripts/icons.mjs [caminho/para/playwright]
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require(process.argv[2] ?? 'playwright')

// fundo noite, um sol azul #1074C4 nascendo atrás de uma linha de horizonte
const svg = (size, pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="g" cx="50%" cy="62%" r="55%">
      <stop offset="0" stop-color="#2a8ae0"/>
      <stop offset="0.55" stop-color="#1074C4"/>
      <stop offset="1" stop-color="#0a3f70"/>
    </radialGradient>
    <clipPath id="c"><rect x="0" y="0" width="100" height="${62}"/></clipPath>
  </defs>
  <rect width="100" height="100" fill="#0c0e13"/>
  <g transform="translate(50 62) scale(${1 - pad}) translate(-50 -62)">
    <circle cx="50" cy="62" r="27" fill="url(#g)" clip-path="url(#c)"/>
    <rect x="14" y="61.6" width="72" height="0.9" fill="#e7e8ec" opacity="0.55"/>
  </g>
</svg>`

const out = new URL('../public/icons/', import.meta.url)
mkdirSync(out, { recursive: true })
const targets = [
  ['apple-touch-icon.png', 180, 0],
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-512.png', 512, 0.22],
  ['favicon-32.png', 32, 0],
]
const browser = await chromium.launch()
for (const [name, size, pad] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<html><body style="margin:0">${svg(size, pad)}</body></html>`)
  await page.screenshot({ path: new URL(name, out).pathname, omitBackground: false })
  await page.close()
}
await browser.close()
console.log('ícones gerados em public/icons')
