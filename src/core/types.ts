export type Environment = 'local' | 'dev' | 'staging' | 'demo' | 'sandbox' | string

export type AccountStatus = 'active' | 'broken' | 'reset-needed'

export interface Account {
  id: string
  appName: string
  environment: Environment
  title: string
  loginUrl?: string
  username: string
  password: string
  notes?: string
  persona?: string
  tags: string[]
  domainPatterns: string[]
  status: AccountStatus
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
}

export interface VaultMetadata {
  schemaVersion: number
  vaultName: string
  localLockEnabled: boolean
  updatedAt: string
}

export interface ImportRecord {
  id: string
  sourceName: string
  importedAt: string
  itemCount: number
}

export interface TestVaultPack {
  version: 1
  exportedAt: string
  exportedBy?: string
  vaultLabel: string
  items: Array<{
    appName: string
    environment: Environment
    title: string
    loginUrl?: string
    domainPatterns: string[]
    username: string
    password: string
    notes?: string
    persona?: string
    tags: string[]
    status: AccountStatus
  }>
}

export type MessageType =
  | 'GET_MATCHING_ACCOUNTS'
  | 'GET_ALL_ACCOUNTS'
  | 'CREATE_ACCOUNT'
  | 'UPDATE_ACCOUNT'
  | 'DELETE_ACCOUNT'
  | 'DELETE_ALL_ACCOUNTS'
  | 'AUTOFILL'
  | 'EXPORT_PACK'
  | 'IMPORT_PACK'
  | 'GET_CURRENT_TAB_URL'
  | 'MARK_USED'
  | 'SEARCH_ACCOUNTS'

export interface Message {
  type: MessageType
  payload?: unknown
}

export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
