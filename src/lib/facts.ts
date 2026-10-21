// Fatos calculados e a frase do dia (ver docs/SPEC.md, seção 8).
// Cada fato traz a base numérica (`basis`) e uma frase determinística na voz do app.
// Na fase 4, os fatos vão para a IA, que só reescreve a frase.
import type { Entry } from './db'
import { addDays } from './day'
import { baseline, buildDays, dayValue, findPhases, morningNight, rolling, series, type DayRow } from './analytics'

export type Fact = { id: string; priority: number; basis: string; phrase: string }

const ORD = ['', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo', 'nono', 'décimo']
const ordinal = (n: number) => ORD[n] ?? `${n}º`
const TIMES = ['', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez']
const times = (n: number) => TIMES[n] ?? String(n)
const NUM = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez']
const num = (n: number) => NUM[n] ?? String(n)
const sign = (x: number) => (x > 0 ? `+${Math.round(x)}` : `${Math.round(x)}`.replace('-', '−'))

export function computeFacts(entries: Entry[], today: string): Fact[] {
  const days = buildDays(entries)
  const facts: Fact[] = []
  const nDays = days.size

  if (nDays === 0) {
    facts.push({ id: 'start0', priority: 1, basis: 'nenhum registro ainda', phrase: 'o primeiro registro é o começo do desenho.' })
    return facts
  }
  if (nDays < 3) {
    facts.push({
      id: 'start',
      priority: 1,
      basis: `${nDays} ${nDays === 1 ? 'dia' : 'dias'} com registro`,
      phrase: 'mais alguns dias e o desenho começa a aparecer.',
    })
  }

  const first = [...days.keys()][0]
  const from = first < addDays(today, -364) ? addDays(today, -364) : first
  const idx = series(days, from, today, 'indice')
  const roll = rolling(idx)
  const base = baseline(days, today, 'indice')

  // fases abaixo do normal (precisa de 14 dias)
  if (base != null && nDays >= 14) {
    const ph = findPhases(roll, base)
    if (ph.current >= 3) {
      const past = ph.runs
      if (past.length) {
        const typ = [...past].sort((a, b) => a - b)[past.length >> 1]
        facts.push({
          id: 'phase_current',
          priority: 10,
          basis: `${ph.current}º dia abaixo do seu normal · ${past.length} fases anteriores, a típica durou ${typ} dias`,
          phrase: `${ordinal(ph.current)} dia abaixo do seu normal. ${
            past.length === 1 ? 'da outra vez' : `nas últimas ${times(past.length)} vezes`
          }, depois de uns ${num(typ)} dias já era outra coisa.`,
        })
      } else {
        facts.push({
          id: 'phase_first',
          priority: 7,
          basis: `${ph.current}º dia abaixo do seu normal · primeira fase registrada`,
          phrase: `faz ${num(ph.current)} dias que você está abaixo do seu normal. o registro de hoje já é parte de como isso termina.`,
        })
      }
    } else if (ph.lastEndedAgo != null && ph.lastEndedAgo <= 3 && ph.lastEndedLength) {
      facts.push({
        id: 'phase_ended',
        priority: 8,
        basis: `fase abaixo do normal encerrada há ${ph.lastEndedAgo} dias · durou ${ph.lastEndedLength} dias`,
        phrase: `a fase abaixo do seu normal durou ${num(ph.lastEndedLength)} dias e passou. como as outras.`,
      })
    }
  }

  // noites curtas seguidas
  const lastMornings: (number | null)[] = [0, 1, 2].map((i) => days.get(addDays(today, -i))?.morning?.sleep?.hours ?? null)
  if (lastMornings.every((h) => h != null && h < 6)) {
    facts.push({
      id: 'short_sleep',
      priority: 9,
      basis: '3 noites seguidas com menos de 6 h de sono',
      phrase: 'três noites curtas seguidas. parte do peso de hoje pode ser só sono.',
    })
  }

  // manhã vs. noite
  const mn = morningNight(days, 'humor')
  if (mn.diff != null && mn.n >= 10 && Math.abs(mn.diff) >= 6) {
    facts.push({
      id: 'morning_night',
      priority: 5,
      basis: `humor ao acordar ${sign(mn.diff)} vs. noite · ${mn.n} dias`,
      phrase:
        mn.diff < 0
          ? 'você acorda pior do que termina o dia. a manhã costuma mentir um pouco.'
          : 'suas manhãs são melhores que suas noites. o dia pesa, mas você começa leve.',
    })
  }

  // última semana vs. as três anteriores
  if (nDays >= 21) {
    const recent = series(days, addDays(today, -6), today, 'indice').filter((v): v is number => v != null)
    const before = series(days, addDays(today, -27), addDays(today, -7), 'indice').filter((v): v is number => v != null)
    if (recent.length >= 4 && before.length >= 10) {
      const d = recent.reduce((a, b) => a + b, 0) / recent.length - before.reduce((a, b) => a + b, 0) / before.length
      if (Math.abs(d) >= 6) {
        facts.push({
          id: 'trend',
          priority: 6,
          basis: `índice da última semana ${sign(d)} vs. as 3 anteriores · ${recent.length} + ${before.length} dias`,
          phrase:
            d > 0
              ? `a última semana ficou ${Math.round(d)} pontos acima das anteriores. vale reparar no que mudou.`
              : `a última semana ficou ${Math.round(-d)} pontos abaixo das anteriores. no seu histórico, semanas assim aparecem e vão embora.`,
        })
      }
    }
  }

  // contexto do dia: índice da noite com e sem cada chip
  const nights = [...days.values()].map((r) => r.night).filter((e): e is Entry => !!e)
  const tagSet = new Set(nights.flatMap((e) => e.tags))
  let bestTag: { tag: string; d: number; n: number } | null = null
  for (const tag of tagSet) {
    const withT = nights.filter((e) => e.tags.includes(tag)).map((e) => dayValue(rowOf(days, e), 'indice'))
    const without = nights.filter((e) => !e.tags.includes(tag)).map((e) => dayValue(rowOf(days, e), 'indice'))
    const a = withT.filter((v): v is number => v != null)
    const b = without.filter((v): v is number => v != null)
    if (a.length < 8 || b.length < 8) continue
    const d = a.reduce((x, y) => x + y, 0) / a.length - b.reduce((x, y) => x + y, 0) / b.length
    if (Math.abs(d) >= 7 && (!bestTag || Math.abs(d) > Math.abs(bestTag.d))) bestTag = { tag, d, n: a.length }
  }
  if (bestTag) {
    facts.push({
      id: 'tag',
      priority: 4,
      basis: `dias com "${bestTag.tag}": índice ${sign(bestTag.d)} · n = ${bestTag.n}`,
      phrase:
        bestTag.d > 0
          ? `nos dias com ${bestTag.tag}, a noite chega ${Math.round(bestTag.d)} pontos mais leve.`
          : `nos dias com ${bestTag.tag}, a noite costuma vir ${Math.round(-bestTag.d)} pontos mais pesada. é só um padrão, não uma regra.`,
    })
  }

  if (nDays >= 7 && facts.every((f) => f.priority <= 1)) {
    facts.push({ id: 'steady', priority: 2, basis: `${nDays} dias com registro · nada fora do seu normal`, phrase: 'nada fora do seu normal esta semana. às vezes isso é a notícia.' })
  } else if (nDays >= 3 && facts.length === 0) {
    facts.push({ id: 'building', priority: 1, basis: `${nDays} dias com registro`, phrase: 'o desenho ainda está se formando. com duas semanas ele começa a falar.' })
  }

  return facts.sort((a, b) => b.priority - a.priority)
}

const rowOf = (days: Map<string, DayRow>, e: Entry) => days.get(e.day)

export function dailyFact(entries: Entry[], today: string): Fact {
  return computeFacts(entries, today)[0]
}
