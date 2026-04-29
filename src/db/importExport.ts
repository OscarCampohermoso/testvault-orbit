import { getAllAccounts, createAccount } from './accountsRepo'
import { encrypt, decrypt } from '../core/crypto'
import { validateImportPack } from '../core/validation'
import type { TestVaultPack } from '../core/types'

export async function exportPack(
  accountIds: string[] | null,
  label: string,
  passphrase?: string
): Promise<{ data: string | number[]; encrypted: boolean }> {
  const all = await getAllAccounts()
  const selected = accountIds ? all.filter((a) => accountIds.includes(a.id)) : all

  const pack: TestVaultPack = {
    version: 1,
    exportedAt: new Date().toISOString(),
    vaultLabel: label,
    items: selected.map((a) => ({
      appName: a.appName,
      environment: a.environment,
      title: a.title,
      loginUrl: a.loginUrl,
      domainPatterns: a.domainPatterns,
      username: a.username,
      password: a.password,
      notes: a.notes,
      persona: a.persona,
      tags: a.tags,
      status: a.status,
      customFields: a.customFields.length > 0 ? a.customFields : undefined,
    })),
  }

  const json = JSON.stringify(pack, null, 2)

  if (passphrase) {
    const encrypted = await encrypt(json, passphrase)
    return { data: Array.from(new Uint8Array(encrypted)), encrypted: true }
  }

  return { data: json, encrypted: false }
}

export async function importPack(
  data: string | number[],
  passphrase?: string
): Promise<{ imported: number; skipped: number }> {
  let json: string

  if (typeof data !== 'string') {
    if (!passphrase) throw new Error('Passphrase required for encrypted pack')
    try {
      json = await decrypt(new Uint8Array(data).buffer, passphrase)
    } catch {
      throw new Error('Invalid passphrase or encrypted pack')
    }
  } else {
    json = data
  }

  let pack: unknown
  try {
    pack = JSON.parse(json)
  } catch {
    throw new Error('Invalid pack format')
  }

  if (!validateImportPack(pack)) {
    throw new Error('Invalid pack schema')
  }

  const existing = await getAllAccounts()
  const existingKeys = new Set(
    existing.map((a) => `${a.appName}|${a.environment}|${a.username}|${a.title}`)
  )

  let imported = 0
  let skipped = 0

  for (const item of pack.items) {
    const key = `${item.appName}|${item.environment}|${item.username}|${item.title}`
    if (existingKeys.has(key)) {
      skipped++
      continue
    }

    await createAccount({
      ...item,
      lastUsedAt: undefined,
      customFields: item.customFields ?? [],
    })
    imported++
  }

  return { imported, skipped }
}
