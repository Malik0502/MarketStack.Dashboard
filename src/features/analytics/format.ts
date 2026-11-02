import type { Merchant } from './types'

export function merchantLabel(merchant: Merchant): string {
  return merchant.name === merchant.chain ? merchant.name : `${merchant.chain} · ${merchant.name}`
}
