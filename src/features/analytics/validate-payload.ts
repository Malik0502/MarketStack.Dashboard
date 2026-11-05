import contract from '../../../docs/analytics-api.schema.json'
import { validDate } from './date-range'

// Only the vocabulary used by the checked-in DTO contract is implemented here.
// Fail closed when that vocabulary changes instead of silently skipping new rules.
interface Schema {
  $ref?: string; type?: string | string[]; anyOf?: Schema[]; enum?: unknown[]; const?: unknown
  properties?: Record<string, Schema>; required?: string[]; additionalProperties?: boolean
  items?: Schema; minimum?: number; maximum?: number; pattern?: string; format?: string
}
const definitions = contract.$defs as Record<string, Schema>
const resources = { catalog: 'Catalog', spending: 'SpendingData', prices: 'PricesData', products: 'ProductsData', product: 'ProductDetail', stores: 'StoresData' } as const
const patterns = new Map<string, RegExp>()

function matches(schema: Schema, value: unknown): boolean {
  if (schema.$ref) return matches(definitions[schema.$ref.replace('#/$defs/', '')], value)
  if (schema.anyOf && !schema.anyOf.some(option => matches(option, value))) return false
  if ('const' in schema && value !== schema.const) return false
  if (schema.enum && !schema.enum.includes(value)) return false
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!types.some(type => type === 'null' ? value === null : type === 'array' ? Array.isArray(value)
      : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : type === 'integer' ? Number.isSafeInteger(value)
      : type === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === type)) return false
  }
  if (typeof value === 'number' && ((schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum))) return false
  if (typeof value === 'string') {
    if (schema.pattern) {
      let pattern = patterns.get(schema.pattern)
      if (!pattern) { pattern = new RegExp(schema.pattern); patterns.set(schema.pattern, pattern) }
      if (!pattern.test(value)) return false
    }
    if (schema.format === 'date' && !validDate(value)) return false
    if (schema.format === 'date-time' && (!validDate(value.slice(0, 10))
      || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)
      || !Number.isFinite(Date.parse(value)))) return false
  }
  if (Array.isArray(value) && schema.items && !value.every(item => matches(schema.items!, item))) return false
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    if (schema.required?.some(key => !Object.hasOwn(record, key))) return false
    if (schema.additionalProperties === false && Object.keys(record).some(key => !Object.hasOwn(schema.properties ?? {}, key))) return false
    if (schema.properties && !Object.entries(schema.properties).every(([key, child]) => !Object.hasOwn(record, key) || matches(child, record[key]))) return false
  }
  return true
}

const vocabulary = new Set(['$ref', 'type', 'anyOf', 'enum', 'const', 'properties', 'required', 'additionalProperties', 'items', 'minimum', 'maximum', 'pattern', 'format', 'description'])
function checkVocabulary(schema: Schema) {
  for (const key of Object.keys(schema)) if (!vocabulary.has(key)) throw new Error(`Unsupported contract keyword: ${key}`)
  schema.anyOf?.forEach(checkVocabulary)
  Object.values(schema.properties ?? {}).forEach(checkVocabulary)
  if (schema.items) checkVocabulary(schema.items)
}
Object.values(definitions).forEach(checkVocabulary)

export function assertPayload(resource: keyof typeof resources, value: unknown): void {
  if (!matches(definitions[resources[resource]], value)) throw new Error(`Invalid analytics payload: ${resource}`)
}
