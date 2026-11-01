import i18n from '@/i18n'
import { createFormat } from '@/i18n/format'

// Legacy service adapter. The dashboard itself keeps ISO dates until rendering.
export function ParseDateToMonthString(date: string, language = i18n.resolvedLanguage ?? 'de'): string {
  try { return createFormat(language).month(date) } catch { return '' }
}
