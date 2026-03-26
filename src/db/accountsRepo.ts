import { v4 as uuid } from 'uuid'
import { getDb, persistDb } from './sqlite'
import type { Account } from '../core/types'

function rowToAccount(row: Record<string, unknown>, tags: string[], domainPatterns: string[]): Account {
  return {
    id: row.id as string,
    appName: row.app_name as string,
    environment: row.environment as string,
    title: row.title as string,
    loginUrl: (row.login_url as string) || undefined,
    username: row.username as string,
    password: row.password as string,
    notes: (row.notes as string) || undefined,
    persona: (row.persona as string) || undefined,
    status: row.status as Account['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    lastUsedAt: (row.last_used_at as string) || undefined,
    tags,
    domainPatterns,
  }
}

function getTagsForAccount(db: ReturnType<Awaited<ReturnType<typeof getDb>>['run']> extends void ? Awaited<ReturnType<typeof getDb>> : never, accountId: string): string[] {
  const results = db.exec('SELECT value FROM tags WHERE account_id = ?', [accountId])
  if (!results.length) return []
  return results[0].values.map((r: unknown[]) => r[0] as string)
}

function getPatternsForAccount(db: Awaited<ReturnType<typeof getDb>>, accountId: string): string[] {
  const results = db.exec('SELECT pattern FROM domain_patterns WHERE account_id = ?', [accountId])
  if (!results.length) return []
  return results[0].values.map((r: unknown[]) => r[0] as string)
}

export async function getAllAccounts(): Promise<Account[]> {
  const db = await getDb()
  const results = db.exec('SELECT * FROM accounts ORDER BY updated_at DESC')
  if (!results.length) return []

  const columns = results[0].columns
  return results[0].values.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col: string, i: number) => { obj[col] = row[i] })
    const tags = getTagsForAccount(db, obj.id as string)
    const patterns = getPatternsForAccount(db, obj.id as string)
    return rowToAccount(obj, tags, patterns)
  })
}

export async function getAccountById(id: string): Promise<Account | null> {
  const db = await getDb()
  const results = db.exec('SELECT * FROM accounts WHERE id = ?', [id])
  if (!results.length || !results[0].values.length) return null

  const columns = results[0].columns
  const row = results[0].values[0]
  const obj: Record<string, unknown> = {}
  columns.forEach((col: string, i: number) => { obj[col] = row[i] })
  const tags = getTagsForAccount(db, id)
  const patterns = getPatternsForAccount(db, id)
  return rowToAccount(obj, tags, patterns)
}

export async function createAccount(data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
  const db = await getDb()
  const id = uuid()
  const now = new Date().toISOString()

  db.run(
    `INSERT INTO accounts (id, app_name, environment, title, login_url, username, password, notes, persona, status, created_at, updated_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.appName, data.environment, data.title, data.loginUrl || null, data.username, data.password, data.notes || null, data.persona || null, data.status || 'active', now, now, null]
  )

  for (const tag of data.tags || []) {
    db.run('INSERT INTO tags (id, account_id, value) VALUES (?, ?, ?)', [uuid(), id, tag])
  }
  for (const pattern of data.domainPatterns || []) {
    db.run('INSERT INTO domain_patterns (id, account_id, pattern) VALUES (?, ?, ?)', [uuid(), id, pattern])
  }

  await persistDb()
  return (await getAccountById(id))!
}

export async function updateAccount(id: string, data: Partial<Account>): Promise<Account | null> {
  const db = await getDb()
  const now = new Date().toISOString()

  const sets: string[] = []
  const values: unknown[] = []

  if (data.appName !== undefined) { sets.push('app_name = ?'); values.push(data.appName) }
  if (data.environment !== undefined) { sets.push('environment = ?'); values.push(data.environment) }
  if (data.title !== undefined) { sets.push('title = ?'); values.push(data.title) }
  if (data.loginUrl !== undefined) { sets.push('login_url = ?'); values.push(data.loginUrl) }
  if (data.username !== undefined) { sets.push('username = ?'); values.push(data.username) }
  if (data.password !== undefined) { sets.push('password = ?'); values.push(data.password) }
  if (data.notes !== undefined) { sets.push('notes = ?'); values.push(data.notes) }
  if (data.persona !== undefined) { sets.push('persona = ?'); values.push(data.persona) }
  if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status) }
  if (data.lastUsedAt !== undefined) { sets.push('last_used_at = ?'); values.push(data.lastUsedAt) }

  sets.push('updated_at = ?')
  values.push(now)
  values.push(id)

  db.run(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`, values)

  if (data.tags !== undefined) {
    db.run('DELETE FROM tags WHERE account_id = ?', [id])
    for (const tag of data.tags) {
      db.run('INSERT INTO tags (id, account_id, value) VALUES (?, ?, ?)', [uuid(), id, tag])
    }
  }

  if (data.domainPatterns !== undefined) {
    db.run('DELETE FROM domain_patterns WHERE account_id = ?', [id])
    for (const pattern of data.domainPatterns) {
      db.run('INSERT INTO domain_patterns (id, account_id, pattern) VALUES (?, ?, ?)', [uuid(), id, pattern])
    }
  }

  await persistDb()
  return getAccountById(id)
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb()
  db.run('DELETE FROM tags WHERE account_id = ?', [id])
  db.run('DELETE FROM domain_patterns WHERE account_id = ?', [id])
  db.run('DELETE FROM accounts WHERE id = ?', [id])
  await persistDb()
}

export async function searchAccounts(query: string): Promise<Account[]> {
  const all = await getAllAccounts()
  const q = query.toLowerCase()
  return all.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.appName.toLowerCase().includes(q) ||
      a.environment.toLowerCase().includes(q) ||
      a.username.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q)) ||
      (a.persona && a.persona.toLowerCase().includes(q))
  )
}

export async function markUsed(id: string): Promise<void> {
  const db = await getDb()
  db.run('UPDATE accounts SET last_used_at = ? WHERE id = ?', [new Date().toISOString(), id])
  await persistDb()
}
