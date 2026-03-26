import type { TestVaultPack, Account } from './types'

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
  return pack.items.every(
    (item) =>
      item.appName &&
      item.environment &&
      item.title &&
      item.username &&
      typeof item.password === 'string'
  )
}
