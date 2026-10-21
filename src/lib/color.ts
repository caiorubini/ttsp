// A cor de um registro. Uma cor só, ancorada no azul #1074C4 (ver docs/SPEC.md, seção 4).
// humor = saturação (0 é cinza), tensão = tom (ansioso vai ao roxo), energia = brilho (0 é preto).

const L0 = 0.5495
const C0 = 0.1493
const H0 = 249.95
const H_ROXO = 305

export type Mood = { humor?: number | null; calma?: number | null; energia?: number | null }

// valores pulados contam como neutro (50)
const unit = (x?: number | null) => (x == null ? 50 : Math.max(0, Math.min(100, x))) / 100

function linearRgb(L: number, C: number, H: number): [number, number, number] {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (rgb: number[]) => rgb.every((x) => x >= -1e-6 && x <= 1 + 1e-6)

function maxChroma(L: number, H: number): number {
  let lo = 0
  let hi = 0.37
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(linearRgb(L, mid, H))) lo = mid
    else hi = mid
  }
  return lo
}

export function moodLch(m: Mood): [number, number, number] {
  const h = unit(m.humor)
  const c = unit(m.calma)
  const e = unit(m.energia)
  const L = L0 * Math.pow(e, 0.75)
  const H = H0 + (1 - c) * (H_ROXO - H0)
  const C = Math.min(C0 * h, maxChroma(L, H))
  return [L, C, H]
}

export function moodCss(m: Mood, alpha?: number): string {
  const [L, C, H] = moodLch(m)
  return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)}${alpha != null ? ` / ${alpha}` : ''})`
}

export function moodHex(m: Mood): string {
  const [L, C, H] = moodLch(m)
  return (
    '#' +
    linearRgb(L, C, H)
      .map((x) => {
        const v = Math.max(0, Math.min(1, x))
        const g = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
        return Math.round(g * 255)
          .toString(16)
          .padStart(2, '0')
      })
      .join('')
      .toUpperCase()
  )
}

export function moodName(m: Mood): string {
  const h = unit(m.humor) * 100
  const c = unit(m.calma) * 100
  const e = unit(m.energia) * 100
  const brilho = e < 15 ? 'Apagada' : e < 40 ? 'Escura' : e < 70 ? 'Meia-luz' : 'Acesa'
  if (h < 20) return `${brilho}, quase sem cor.`
  const tom = c > 66 ? 'azul' : c > 33 ? 'azul-violeta' : 'roxo'
  return `${brilho}, ${tom}${h < 55 ? ' apagado' : h < 80 ? '' : ' vivo'}.`
}

export const hasMood = (m: Mood) => m.humor != null || m.calma != null || m.energia != null
