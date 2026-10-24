import { beforeEach, describe, expect, it } from 'vitest'
import {
  browserPreferredLocale,
  persistLocalePreference,
  readPersistedLocale,
  resolvedPreferredLocale,
} from './locale'

describe('shared locale preference', () => {
  beforeEach(() => localStorage.clear())

  it.each([
    [['ru-RU'], 'ru'],
    [['ru'], 'ru'],
    [['be-BY'], 'ru'],
    [['be'], 'ru'],
    [['en-US', 'ru-RU'], 'en'],
    [['sr-RS'], 'en'],
    [['de-DE'], 'en'],
    [[], 'en'],
  ] as const)('resolves primary browser languages %j as %s', (languages, expected) => {
    expect(browserPreferredLocale(languages)).toBe(expected)
  })

  it('keeps browser detection from creating an explicit preference', () => {
    expect(readPersistedLocale()).toBeNull()
    browserPreferredLocale(['ru-RU'])
    expect(readPersistedLocale()).toBeNull()
  })

  it('manual selection wins and is persisted for both frontend layers', () => {
    persistLocalePreference('ru')
    expect(readPersistedLocale()).toBe('ru')
    expect(resolvedPreferredLocale()).toBe('ru')
    persistLocalePreference('en')
    expect(readPersistedLocale()).toBe('en')
  })

  it('ignores invalid saved values', () => {
    localStorage.setItem('zolotoy.locale', 'fr')
    expect(readPersistedLocale()).toBeNull()
  })
})
