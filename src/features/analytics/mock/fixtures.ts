import type { Merchant, Product, Tag } from '../types'

// Synthetic fixtures only. No real receipts, credentials, or personal data.
// Unit and canonical pack identity are explicitly known here, unlike current backend entities.
export const tags: Tag[] = [
  { id: 1, name: 'Dairy' }, { id: 2, name: 'Pantry' }, { id: 3, name: 'Produce' },
  { id: 4, name: 'Drinks' }, { id: 5, name: 'Bakery' },
]
export const stores: Merchant[] = [
  { id: 'north-centre', name: 'Centre', chain: 'North Market' },
  { id: 'north-riverside', name: 'Riverside', chain: 'North Market' },
  { id: 'city-west', name: 'West', chain: 'City Foods' },
  { id: 'green-east', name: 'East', chain: 'Green Basket' },
]
const definitions: [string, number[], 'piece' | 'kg', string][] = [
  ['Milk 1 l', [1], 'piece', '1 l'], ['Coffee 500 g', [2, 4], 'piece', '500 g'],
  ['Butter 250 g', [1], 'piece', '250 g'], ['Rice 1 kg', [2], 'piece', '1 kg'],
  ['Eggs, pack of 6', [2], 'piece', '6 eggs'], ['Apples', [3], 'kg', '1 kg'],
  ['Bread 500 g', [5], 'piece', '500 g'], ['Oats 500 g', [], 'piece', '500 g'],
  ['Yogurt 500 g', [1], 'piece', '500 g'], ['Orange juice 1 l', [4], 'piece', '1 l'],
  ['Bananas', [3], 'kg', '1 kg'], ['Dark chocolate 100 g', [2], 'piece', '100 g'],
]
export const products: Product[] = definitions.map(([name, ids, unit, packSize], index) => ({
  id: index + 1, name, unit, packSize, comparisonKey: `MOCK-PACK-${index + 1}`,
  tags: tags.filter(tag => ids.includes(tag.id)),
}))
export interface MockLine { id: number; productId: number; quantity: number; price: number; promotionId: string | null }
export interface MockReceipt { id: number; purchasedAt: string; storeId: string; items: MockLine[]; gross: number }
export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const bases = [1.09, 5.29, 2.19, 2.59, 1.89, 2.49, 1.79, 1.19, 1.39, 1.99, 1.79, 1.09]
const trends = [0.015, 0.08, 0, -0.025, 0, 0.01, 0.01, -0.012, 0.005, 0.018, 0, 0.025]

// 24 complete calendar months, fixed UTC dates and deterministic price/promotion patterns.
export const receipts: MockReceipt[] = Array.from({ length: 24 * 8 }, (_, receiptIndex) => {
  const month = Math.floor(receiptIndex / 8)
  const slot = receiptIndex % 8
  const storeIndex = (month + slot) % stores.length
  const selection = Array.from({ length: 3 + receiptIndex % 4 }, (_, lineIndex) => (receiptIndex * 3 + lineIndex * 5 + month) % products.length)
  // Staples recur more often than discretionary products without randomizing the dataset.
  if (receiptIndex % 3 === 0 && !selection.includes(0)) selection[selection.length - 1] = 0
  if (receiptIndex % 4 === 1 && !selection.includes(4)) selection[0] = 4
  const items = selection.map((index, lineIndex): MockLine => {
    const quantity = products[index].unit === 'kg' ? [0.45, 0.8, 1.25][receiptIndex % 3] : 1 + (receiptIndex + lineIndex) % 3
    const promotion = (receiptIndex + lineIndex) % 5 === 0
    const volatility = index === 2 ? [0, 0.6, -0.35, 0.25][month % 4] : 0
    const price = roundMoney(Math.max(0.35, bases[index] + trends[index] * month + storeIndex * 0.12 + volatility - (promotion ? 0.15 : 0)))
    return { id: receiptIndex * 10 + lineIndex + 1, productId: index + 1, quantity, price, promotionId: promotion ? `MOCK-PROMO-${month}` : null }
  })
  return {
    id: receiptIndex + 1, storeId: stores[storeIndex].id,
    purchasedAt: new Date(Date.UTC(2024, 10 + month, 2 + slot * 3, 10 + slot)).toISOString(),
    items, gross: roundMoney(items.reduce((sum, line) => sum + roundMoney(line.price * line.quantity), 0)),
  }
})
export const coverage = { from: '2024-11-01', to: '2026-10-31' }
