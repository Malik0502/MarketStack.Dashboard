import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveLanguage } from '@/lib/preferences'

export function createFormat(language: string) {
  const locale = resolveLanguage(language) === 'en' ? 'en-GB' : 'de-DE'
  const currency = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })
  const percentage = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })
  const short = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' })
  const long = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
  const label = new Intl.DateTimeFormat(locale, { month: 'short' })
  const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
  const date = (value: string) => new Date(`${value.slice(0, 7)}-01T12:00:00`)
  return {
    locale,
    money: (value: number) => currency.format(value),
    number: (value: number, digits = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value),
    decimal: (value: number) => new Intl.NumberFormat(locale, { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value),
    percent: (value: number) => percentage.format(value / 100),
    month: (value: string, full = false) => (full ? long : short).format(date(value)),
    monthLabel: (value: string) => label.format(date(value)),
    time: (value: Date) => clock.format(value),
    date: (value: string) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value)),
    weekday: (value: number) => new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(2024, 0, value))),
  }
}

export function useFormat() {
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'de'
  return useMemo(() => createFormat(language), [language])
}
