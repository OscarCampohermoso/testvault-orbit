export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  environment TEXT NOT NULL,
  title TEXT NOT NULL,
  login_url TEXT,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  notes TEXT,
  persona TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE TABLE IF NOT EXISTS domain_patterns (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vault_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  schema_version INTEGER NOT NULL,
  vault_name TEXT NOT NULL,
  local_lock_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_history (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  item_count INTEGER NOT NULL
);
`
