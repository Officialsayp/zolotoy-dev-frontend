import { describe, expect, it } from 'vitest'

import { LOCALES, isLocale, intlLocale, localePathPrefix } from './locale'
import { UI_STRINGS } from './ui-strings'
import { MODULE_STRINGS } from './module-strings'
import { LABEL_STRINGS, labelFor } from './label-strings'

describe('i18n locale model', () => {
  it('supports exactly en and ru', () => {
    expect(LOCALES).toEqual(['en', 'ru'])
    expect(isLocale('en')).toBe(true)
    expect(isLocale('ru')).toBe(true)
    expect(isLocale('de')).toBe(false)
  })

  it('maps intl locales and path prefixes', () => {
    expect(intlLocale('en')).toBe('en')
    expect(intlLocale('ru')).toBe('ru-RU')
    expect(localePathPrefix('en')).toBe('')
    expect(localePathPrefix('ru')).toBe('/ru')
  })
})

describe('dictionary parity (EN/RU)', () => {
  it('UI_STRINGS has both locales for every key, non-empty', () => {
    for (const [key, value] of Object.entries(UI_STRINGS)) {
      expect(value.en.length, `UI_STRINGS.${key}.en`).toBeGreaterThan(0)
      expect(value.ru.length, `UI_STRINGS.${key}.ru`).toBeGreaterThan(0)
    }
  })

  it('MODULE_STRINGS has both locales for every key, non-empty', () => {
    for (const [key, value] of Object.entries(MODULE_STRINGS)) {
      expect(value.en.length, `MODULE_STRINGS.${key}.en`).toBeGreaterThan(0)
      expect(value.ru.length, `MODULE_STRINGS.${key}.ru`).toBeGreaterThan(0)
    }
  })

  it('label dictionary RU differs from EN (actually translated)', () => {
    for (const [en, value] of Object.entries(LABEL_STRINGS)) {
      expect(value.ru, en).not.toBe(en)
      expect(value.ru.length, en).toBeGreaterThan(0)
    }
  })

  it('labelFor falls back to EN for unknown labels', () => {
    expect(labelFor('Not in dictionary', 'en')).toBe('Not in dictionary')
    expect(labelFor('Not in dictionary', 'ru')).toBe('Not in dictionary')
    expect(labelFor('Paid', 'ru')).toBe('Оплачен')
  })
})
