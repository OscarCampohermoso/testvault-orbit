import type { TestVaultPack, Account } from './types'

const ALLOWED_CUSTOM_FIELD_TYPES = new Set(['text', 'hidden', 'checkbox'])

export function validateAccount(data: Partial<Account>): string | null {
  if (!data.appName?.trim()) return 'App name is required'
  if (!data.environment?.trim()) return 'Environment is required'
  if (!data.title?.trim()) return 'Title is required'
  if (!data.username?.trim()) return 'Username is required'
  if (!data.password) return 'Password is required'
  return null
}

export function validateImportPack(data: unknown): data is TestVaultPack {
  if (!data || typeof data !== 'object') return false
  const pack = data as TestVaultPack
  if (pack.version !== 1) return false
  if (!pack.exportedAt || !pack.vaultLabel) return false
  if (!Array.isArray(pack.items)) return false
  return pack.items.every((item) => {
    if (!item.appName || !item.environment || !item.title || !item.username || typeof item.password !== 'string') {
      return false
    }
    // Validate optional customFields
    if (item.customFields !== undefined) {
      if (!Array.isArray(item.customFields)) return false
      for (const field of item.customFields) {
        if (!field || typeof field !== 'object') return false
        if (!ALLOWED_CUSTOM_FIELD_TYPES.has(field.type)) return false
        if (!field.label || typeof field.label !== 'string' || !field.label.trim()) return false
      }
    }
    return true
  })
}
