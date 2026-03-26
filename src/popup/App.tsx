import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowsClockwise,
  Check,
  Copy,
  DiceSixIcon,
  ExportIcon,
  FileArrowDown,
  FileArrowUp,
  FloppyDisk,
  Funnel,
  Gear,
  Globe,
  House,
  Moon,
  PencilSimple,
  Plus,
  ShieldCheck,
  Sun,
  Trash,
  User,
  X,
} from '@phosphor-icons/react'
import { sendMessage } from '../shared/messaging'
import type { Account, AccountStatus, Environment } from '../core/types'
import { ENVIRONMENTS, STATUSES } from '../shared/constants'
import './popup.css'

type Screen = 'vault' | 'editor' | 'tools' | 'settings'
type ThemeMode = 'light' | 'dark' | 'system'

const THEME_KEY = 'testvault_theme'

const emptyAccount: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> = {
  appName: '',
  environment: 'staging',
  title: '',
  loginUrl: '',
  username: '',
  password: '',
  notes: '',
  persona: '',
  tags: [],
  domainPatterns: [],
  status: 'active',
  lastUsedAt: undefined,
}

const adjectives = ['Solar', 'Nimbus', 'Quantum', 'Arctic', 'Velvet', 'Turbo', 'Orbit', 'Nova']
const nouns = ['Tiger', 'Falcon', 'River', 'Matrix', 'Panda', 'Comet', 'Galaxy', 'Anchor']
const symbols = ['!', '@', '#', '$', '%', '&']

function randomItem<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function generateMemorablePassword(): string {
  const year = new Date().getFullYear()
  const wordA = randomItem(adjectives)
  const wordB = randomItem(nouns)
  const num = String(Math.floor(Math.random() * 90) + 10)
  const symbol = randomItem(symbols)
  return `${wordA}${wordB}${year}${num}${symbol}`
}

function normalizeUrl(url: string): { loginUrl: string; hostname: string; appName: string; title: string } {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    const appName = host.split('.')[0] || host
    return {
      loginUrl: parsed.origin + parsed.pathname,
      hostname: host,
      appName,
      title: `${appName} login`,
    }
  } catch {
    return { loginUrl: '', hostname: '', appName: 'Web', title: 'Web login' }
  }
}

export default function PopupApp() {
  const [screen, setScreen] = useState<Screen>('vault')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentUrl, setCurrentUrl] = useState('')
  const [search, setSearch] = useState('')
  const [filterEnv, setFilterEnv] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyAccount)
  const [tagsInput, setTagsInput] = useState('')
  const [patternsInput, setPatternsInput] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [exportLabel, setExportLabel] = useState('My Test Accounts')
  const [exportPass, setExportPass] = useState('')
  const [importPass, setImportPass] = useState('')

  const [theme, setTheme] = useState<ThemeMode>('system')

  const loadAccounts = useCallback(async () => {
    const res = await sendMessage<Account[]>({ type: 'GET_ALL_ACCOUNTS' })
    if (res.success && res.data) setAccounts(res.data)
  }, [])

  useEffect(() => {
    void loadAccounts()
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setCurrentUrl(tabs[0]?.url || '')
    })
  }, [loadAccounts])

  useEffect(() => {
    chrome.storage.local.get(THEME_KEY).then((stored) => {
      const mode = stored[THEME_KEY] as ThemeMode | undefined
      if (mode === 'dark' || mode === 'light' || mode === 'system') {
        setTheme(mode)
      }
    })
  }, [])

  useEffect(() => {
    chrome.storage.local.set({ [THEME_KEY]: theme })
  }, [theme])

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [resolvedTheme])

  const hostname = useMemo(() => {
    try {
      return new URL(currentUrl).hostname
    } catch {
      return 'unknown'
    }
  }, [currentUrl])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return accounts.filter((a) => {
      const matchesSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.appName.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      const matchesEnv = !filterEnv || a.environment === filterEnv
      return matchesSearch && matchesEnv
    })
  }, [accounts, search, filterEnv])

  const matchingForSite = useMemo(
    () => filtered.filter((a) => a.domainPatterns.some((p) => hostname.includes(p.replace('*.', '')))),
    [filtered, hostname],
  )

  const handleAutofill = (account: Account) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) return
      void sendMessage({ type: 'AUTOFILL', payload: { tabId, account } })
      window.close()
    })
  }

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1200)
  }

  const openEditor = (account?: Account) => {
    setFormError('')
    if (account) {
      setEditingId(account.id)
      setForm({ ...account })
      setTagsInput(account.tags.join(', '))
      setPatternsInput(account.domainPatterns.join(', '))
    } else {
      const detected = normalizeUrl(currentUrl)
      setEditingId(null)
      setForm({
        ...emptyAccount,
        appName: detected.appName,
        title: detected.title,
        loginUrl: detected.loginUrl,
        domainPatterns: detected.hostname ? [detected.hostname] : [],
      })
      setTagsInput('')
      setPatternsInput(detected.hostname)
    }
    setScreen('editor')
  }

  const handleSave = async () => {
    setFormError('')
    setStatusMsg('')

    if (!form.username.trim() || !form.password.trim()) {
      setFormError('Username and Password are required.')
      return
    }

    setIsSaving(true)
    try {
      const detected = normalizeUrl(currentUrl)
      const title = form.title.trim() || `${form.username.split('@')[0] || 'account'} login`
      const appName = form.appName.trim() || detected.appName || 'Web'
      const loginUrl = form.loginUrl?.trim() || detected.loginUrl
      const domainPatterns = patternsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const accountData = {
        ...form,
        title,
        appName,
        loginUrl,
        tags: tagsInput.split(',').map((s) => s.trim()).filter(Boolean),
        domainPatterns: domainPatterns.length > 0 ? domainPatterns : detected.hostname ? [detected.hostname] : [],
      }

      const res = editingId
        ? await sendMessage({ type: 'UPDATE_ACCOUNT', payload: { id: editingId, ...accountData } })
        : await sendMessage({ type: 'CREATE_ACCOUNT', payload: accountData })

      if (!res.success) {
        setFormError(res.error || 'Could not save account.')
        return
      }

      setStatusMsg(editingId ? 'Identity updated successfully.' : 'Identity saved successfully.')
      await loadAccounts()
      setScreen('vault')
    } catch {
      setFormError('Unexpected error while saving. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account?')) return
    await sendMessage({ type: 'DELETE_ACCOUNT', payload: id })
    await loadAccounts()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setStatusMsg('Identity deleted')
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExport = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : null
    const res = await sendMessage<{ data: string | ArrayBuffer; encrypted: boolean }>({
      type: 'EXPORT_PACK',
      payload: { accountIds: ids, label: exportLabel, passphrase: exportPass || undefined },
    })

    if (!res.success || !res.data) {
      setStatusMsg('Export failed')
      return
    }

    const blob = res.data.encrypted
      ? new Blob([res.data.data as ArrayBuffer], { type: 'application/octet-stream' })
      : new Blob([res.data.data as string], { type: 'application/json' })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportLabel.replace(/\s+/g, '_')}.testvault`
    a.click()
    URL.revokeObjectURL(url)
    setStatusMsg(`Exported ${selectedIds.size > 0 ? selectedIds.size : accounts.length} identities`)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isEncrypted = !file.name.endsWith('.json')
    const data: string | ArrayBuffer = isEncrypted && importPass ? await file.arrayBuffer() : await file.text()

    const res = await sendMessage<{ imported: number; skipped: number }>({
      type: 'IMPORT_PACK',
      payload: { data, passphrase: importPass || undefined },
    })

    if (res.success && res.data) {
      setStatusMsg(`Imported ${res.data.imported}, skipped ${res.data.skipped}`)
      await loadAccounts()
    } else {
      setStatusMsg('Import failed')
    }
  }

  const handleDeleteAllAccounts = async () => {
    const confirmation = prompt(
      'This will permanently erase every saved login from TestVault Orbit.\n\nType delete-all to confirm.',
      '',
    )

    if (confirmation === null) return

    if (confirmation.trim() !== 'delete-all') {
      setStatusMsg('Destruction cancelled: confirmation text did not match.')
      return
    }

    const res = await sendMessage({ type: 'DELETE_ALL_ACCOUNTS' })
    if (!res.success) {
      setStatusMsg(res.error || 'Failed to erase all identities.')
      return
    }

    setSelectedIds(new Set())
    setAccounts([])
    setScreen('vault')
    setStatusMsg('All identities were erased.')
  }

  return (
    <div className="popup-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/icon.png" alt="TestVault icon" className="brand-logo" />
          <div>
            <h1>TestVault Orbit</h1>
            <p>{hostname}</p>
          </div>
        </div>
        <button className="icon-btn" onClick={() => openEditor()} aria-label="New account">
          <Plus size={18} />
        </button>
      </header>

      {statusMsg && <div className="status-msg">{statusMsg}</div>}

      <main className="content">
        {screen === 'vault' && (
          <>
            <div className="toolbar">
              <div className="search-wrap">
                <Globe size={16} />
                <input placeholder="Search identities" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="filter-wrap">
                <Funnel size={14} />
                <select value={filterEnv} onChange={(e) => setFilterEnv(e.target.value)}>
                  <option value="">All</option>
                  {ENVIRONMENTS.map((env) => (
                    <option key={env} value={env}>
                      {env}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {matchingForSite.length > 0 && (
              <section className="section">
                <h2>Orbit matches</h2>
                {matchingForSite.map((account) => (
                  <AccountRow
                    key={`match-${account.id}`}
                    account={account}
                    copiedId={copiedId}
                    selected={selectedIds.has(account.id)}
                    onSelect={toggleSelect}
                    onAutofill={handleAutofill}
                    onCopy={handleCopy}
                    onEdit={openEditor}
                    onDelete={handleDelete}
                  />
                ))}
              </section>
            )}

            <section className="section">
              <h2>Identity library</h2>
              {filtered.length === 0 && <div className="empty">No identities yet. Create your first orbit profile.</div>}
              {filtered.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  copiedId={copiedId}
                  selected={selectedIds.has(account.id)}
                  onSelect={toggleSelect}
                  onAutofill={handleAutofill}
                  onCopy={handleCopy}
                  onEdit={openEditor}
                  onDelete={handleDelete}
                />
              ))}
            </section>
          </>
        )}

        {screen === 'editor' && (
          <section className="section form-section">
            <h2>{editingId ? 'Edit Login' : 'New Login'}</h2>
            <p className="form-hint">Required fields are marked with *</p>
            {formError && <div className="form-error">{formError}</div>}
            <FormField label="Username" required value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
            <div className="field">
              <span>Password *</span>
              <div className="password-row">
                <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button
                  className="btn"
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, password: generateMemorablePassword() }))}
                >
                  <DiceSixIcon size={14} /> Generate
                </button>
              </div>
            </div>
            <FormField label="Login URL" value={form.loginUrl || ''} onChange={(v) => setForm({ ...form, loginUrl: v })} />
            <FormField label="Item name" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <FormField label="App" value={form.appName} onChange={(v) => setForm({ ...form, appName: v })} />
            <FormField label="Domain patterns" value={patternsInput} onChange={setPatternsInput} />
            <FormField label="Tags" value={tagsInput} onChange={setTagsInput} />
            <FormField label="Persona" value={form.persona || ''} onChange={(v) => setForm({ ...form, persona: v })} />
            <label className="field">
              <span>Environment</span>
              <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value as Environment })}>
                {ENVIRONMENTS.map((env) => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AccountStatus })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea
                rows={3}
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                <FloppyDisk size={16} /> {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn" onClick={() => setScreen('vault')}>
                <X size={16} /> Cancel
              </button>
            </div>
          </section>
        )}

        {screen === 'tools' && (
          <section className="section form-section">
            <h2>Import / Export</h2>
            <FormField label="Export label" value={exportLabel} onChange={setExportLabel} />
            <FormField label="Export passphrase" value={exportPass} onChange={setExportPass} type="password" />
            <button className="btn btn-primary" onClick={handleExport}>
              <ExportIcon size={16} /> Export {selectedIds.size > 0 ? `(${selectedIds.size})` : 'All'}
            </button>

            <div style={{ marginTop: '1rem' }}>
              <FormField label="Import passphrase" value={importPass} onChange={setImportPass} type="password" />
            </div>
            <label className="upload">
              <FileArrowUp size={18} />
              <span>Choose pack file</span>
              <input type="file" accept=".testvault,.json" onChange={handleImportFile} />
            </label>
          </section>
        )}

        {screen === 'settings' && (
          <section className="section form-section">
            <h2>Settings</h2>
            <div className="settings-stack">
              <div className="theme-row">
                <span>Appearance</span>
                <div className="theme-options">
                  <button className={`btn ${theme === 'light' ? 'btn-primary' : ''}`} onClick={() => setTheme('light')}>
                    <Sun size={16} /> Light
                  </button>
                  <button className={`btn ${theme === 'dark' ? 'btn-primary' : ''}`} onClick={() => setTheme('dark')}>
                    <Moon size={16} /> Dark
                  </button>
                  <button className={`btn ${theme === 'system' ? 'btn-primary' : ''}`} onClick={() => setTheme('system')}>
                    <ArrowsClockwise size={16} /> System
                  </button>
                </div>
              </div>
              <div className="danger-zone">
                <strong>Auto-destruction</strong>
                <p>Erase every saved login. You will need to type <code>delete-all</code> to confirm.</p>
                <button className="btn btn-danger" onClick={handleDeleteAllAccounts}>
                  <Trash size={16} /> Erase all logins
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-btn ${screen === 'vault' ? 'active' : ''}`} onClick={() => setScreen('vault')}>
          <House size={18} />
          <span>Vault</span>
        </button>
        <button className={`nav-btn ${screen === 'tools' ? 'active' : ''}`} onClick={() => setScreen('tools')}>
          <FileArrowDown size={18} />
          <span>Tools</span>
        </button>
        <button className={`nav-btn ${screen === 'settings' ? 'active' : ''}`} onClick={() => setScreen('settings')}>
          <Gear size={18} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  )
}

function AccountRow({
  account,
  copiedId,
  selected,
  onSelect,
  onAutofill,
  onCopy,
  onEdit,
  onDelete,
}: {
  account: Account
  copiedId: string | null
  selected: boolean
  onSelect: (id: string) => void
  onAutofill: (account: Account) => void
  onCopy: (text: string, id: string) => void
  onEdit: (account?: Account) => void
  onDelete: (id: string) => void
}) {
  return (
    <article className="account-row">
      <div className="account-top">
        <label className="check-wrap">
          <input type="checkbox" checked={selected} onChange={() => onSelect(account.id)} />
        </label>
        <div className="account-main">
          <strong>{account.title}</strong>
          <p>
            {account.appName} · {account.environment}
          </p>
          <small>{account.username}</small>
        </div>
        <span className={`status-dot status-${account.status}`} />
      </div>
      <div className="account-actions">
        <button className="btn btn-primary" onClick={() => onAutofill(account)}>
          <ShieldCheck size={14} /> Fill
        </button>
        <button className="btn" onClick={() => onCopy(account.username, `u-${account.id}`)}>
          {copiedId === `u-${account.id}` ? <Check size={14} /> : <User size={14} />} User
        </button>
        <button className="btn" onClick={() => onCopy(account.password, `p-${account.id}`)}>
          {copiedId === `p-${account.id}` ? <Check size={14} /> : <Copy size={14} />} Pass
        </button>
        <button className="btn" onClick={() => onEdit(account)}>
          <PencilSimple size={14} /> Edit
        </button>
        <button className="btn btn-danger" onClick={() => onDelete(account.id)}>
          <Trash size={14} />
        </button>
      </div>
      {account.tags.length > 0 && (
        <div className="tag-row">
          {account.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: React.HTMLInputTypeAttribute
  required?: boolean
}) {
  return (
    <label className="field">
      <span>{required ? `${label} *` : label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
