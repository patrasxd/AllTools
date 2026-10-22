import { describe, expect, it } from 'vitest'
import { getTranslations } from '../i18n'

describe('count labels', () => {
  const en = getTranslations('en')
  const pl = getTranslations('pl')

  it('uses singular and plural forms in English', () => {
    expect(en.statLines(1)).toBe('1 line')
    expect(en.statLines(2)).toBe('2 lines')
    expect(en.statWords(1)).toBe('1 word')
    expect(en.statWords(0)).toBe('0 words')
    expect(en.statChars(1)).toBe('1 char')
    expect(en.statChars(12)).toBe('12 chars')
  })

  it('uses the three Polish plural forms', () => {
    expect(pl.statLines(1)).toBe('1 linia')
    expect(pl.statLines(2)).toBe('2 linie')
    expect(pl.statLines(5)).toBe('5 linii')
    expect(pl.statLines(12)).toBe('12 linii')
    expect(pl.statLines(22)).toBe('22 linie')
    expect(pl.statLines(112)).toBe('112 linii')
    expect(pl.statWords(1)).toBe('1 słowo')
    expect(pl.statWords(3)).toBe('3 słowa')
    expect(pl.statWords(0)).toBe('0 słów')
    expect(pl.statChars(1)).toBe('1 znak')
    expect(pl.statChars(24)).toBe('24 znaki')
    expect(pl.statChars(25)).toBe('25 znaków')
  })

  it('words the match counter in both languages', () => {
    expect(en.search.results(2, 7, false)).toBe('2 of 7')
    expect(en.search.results(0, 1000, true)).toBe('? of 1000+')
    expect(pl.search.results(2, 7, false)).toBe('2 z 7')
  })
})
