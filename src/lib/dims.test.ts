import { describe, expect, it } from 'vitest'
import { DIMS, WORDS, stepOf, wordFor, type DimKey } from './dims'

describe('palavras dos degraus', () => {
  it('toda escala tem 11 palavras distintas', () => {
    for (const k of Object.keys(DIMS) as DimKey[]) {
      expect(WORDS[k]).toHaveLength(11)
      expect(new Set(WORDS[k]).size).toBe(11)
    }
  })
  it('os extremos e o meio', () => {
    expect(wordFor('humor', 0)).toBe('arrasado')
    expect(wordFor('humor', 100)).toBe('efusivo')
    expect(wordFor('humor', 50)).toBe('neutro')
    expect(stepOf(4)).toBe(0)
    expect(stepOf(96)).toBe(10)
  })
})
