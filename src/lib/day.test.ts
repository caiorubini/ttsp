import { describe, expect, it } from 'vitest'
import { addDays, dayRange, daysBetween, logicalDay, sleepHours, suggestKind } from './day'

describe('dia lógico', () => {
  it('antes das 5h conta como o dia anterior', () => {
    expect(logicalDay(new Date(2026, 9, 21, 1, 30))).toBe('2026-10-20')
    expect(logicalDay(new Date(2026, 9, 21, 5, 0))).toBe('2026-10-21')
    expect(logicalDay(new Date(2026, 9, 21, 23, 59))).toBe('2026-10-21')
  })
  it('respeita a hora configurada', () => {
    expect(logicalDay(new Date(2026, 9, 21, 6, 0), 7)).toBe('2026-10-20')
  })
  it('sugere manhã até 14h e noite depois', () => {
    expect(suggestKind(new Date(2026, 9, 21, 7))).toBe('morning')
    expect(suggestKind(new Date(2026, 9, 21, 15))).toBe('night')
    expect(suggestKind(new Date(2026, 9, 21, 2))).toBe('night')
  })
  it('conta dias de calendário, inclusive na virada de mês e de ano', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(dayRange('2026-02-27', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02'])
  })
  it('calcula horas de sono cruzando a meia-noite', () => {
    expect(sleepHours('23:30', '07:00')).toBe(7.5)
    expect(sleepHours('01:15', '08:45')).toBe(7.5)
  })
})
