import { describe, expect, it } from 'vitest'
import { moodHex, moodLch, moodName } from './color'

describe('cor do humor', () => {
  it('tudo no máximo é exatamente #1074C4', () => {
    expect(moodHex({ humor: 100, calma: 100, energia: 100 })).toBe('#1074C4')
  })
  it('sem energia é preto', () => {
    expect(moodHex({ humor: 100, calma: 100, energia: 0 })).toBe('#000000')
    expect(moodHex({ humor: 0, calma: 0, energia: 0 })).toBe('#000000')
  })
  it('humor zero é cinza, sem croma', () => {
    const [, C] = moodLch({ humor: 0, calma: 30, energia: 100 })
    expect(C).toBe(0)
    expect(moodHex({ humor: 0, calma: 100, energia: 100 })).toBe('#717171')
  })
  it('ansiedade puxa o tom para o roxo', () => {
    const calmo = moodLch({ humor: 100, calma: 100, energia: 100 })[2]
    const ansioso = moodLch({ humor: 100, calma: 0, energia: 100 })[2]
    expect(ansioso).toBeGreaterThan(calmo)
    expect(ansioso).toBeCloseTo(305, 5)
  })
  it('valores pulados contam como 50', () => {
    expect(moodHex({})).toBe(moodHex({ humor: 50, calma: 50, energia: 50 }))
  })
  it('o brilho nunca passa do azul de referência, então o texto pode ser sempre claro', () => {
    for (const h of [0, 50, 100]) for (const c of [0, 50, 100]) for (const e of [0, 50, 100]) expect(moodLch({ humor: h, calma: c, energia: e })[0]).toBeLessThanOrEqual(0.5495 + 1e-9)
  })
  it('dá nome à cor', () => {
    expect(moodName({ humor: 100, calma: 100, energia: 100 })).toBe('Acesa, azul vivo.')
    expect(moodName({ humor: 5, calma: 50, energia: 10 })).toBe('Apagada, quase sem cor.')
  })
})
