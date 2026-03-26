import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js/dist/sql-wasm-browser.js'
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'
import type { MessageResponse } from '../core/types'
import { type OffscreenStorageMessage } from '../shared/offscreen'
import { CREATE_TABLES_SQL } from './schema'

let db: Database | null = null
let sqlModulePromise: Promise<SqlJsStatic> | null = null

async function loadSqlModule() {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({
      locateFile: () => wasmUrl,
    })
  }

  return sqlModulePromise
}

async function sendStorageMessage<T>(message: OffscreenStorageMessage): Promise<T | undefined> {
  const response = await chrome.runtime.sendMessage(message) as MessageResponse<T> | undefined
  if (!response?.success) {
    throw new Error(response?.error ?? 'Failed to persist database state')
  }

  return response.data
}

async function loadPersistedDb(): Promise<number[] | null> {
  const data = await sendStorageMessage<number[] | null>({
    target: 'background',
    type: 'OFFSCREEN_STORAGE_GET',
  })

  return data ?? null
}

export async function getDb(): Promise<Database> {
  if (db) return db

  const SQL = await loadSqlModule()
  const stored = await loadPersistedDb()
  if (stored && stored.length > 0) {
    const data = new Uint8Array(stored)
    db = new SQL.Database(data)
  } else {
    db = new SQL.Database()
  }

  db.run(CREATE_TABLES_SQL)
  await persistDb()
  return db
}

export async function persistDb(): Promise<void> {
  if (!db) return
  const data = db.export()
  await sendStorageMessage({
    target: 'background',
    type: 'OFFSCREEN_STORAGE_SET',
    payload: Array.from(data),
  })
}

export async function resetDb(): Promise<void> {
  if (db) {
    db.close()
    db = null
  }
  await sendStorageMessage({
    target: 'background',
    type: 'OFFSCREEN_STORAGE_RESET',
  })
}
