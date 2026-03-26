import { useEffect, useState, useCallback } from 'react'
import { sendMessage } from '../shared/messaging'
import type { Account, AccountStatus, Environment } from '../core/types'
import { ENVIRONMENTS, STATUSES } from '../shared/constants'
import './options.css'

type ViewMode = 'list' | 'edit' | 'import'

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

export default function OptionsApp() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [view, setView] = useState<ViewMode>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyAccount)
  const [tagsInput, setTagsInput] = useState('')
  const [patternsInput, setPatternsInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterEnv, setFilterEnv] = useState('')
  const [exportLabel, setExportLabel] = useState('My Test Accounts')
  const [exportPass, setExportPass] = useState('')
  const [importPass, setImportPass] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusMsg, setStatusMsg] = useState('')

  const loadAccounts = useCallback(async () => {
    const res = await sendMessage<Account[]>({ type: 'GET_ALL_ACCOUNTS' })
    if (res.success && res.data) setAccounts(res.data)
  }, [])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.appName.toLowerCase().includes(q) ||
      a.username.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
    const matchesEnv = !filterEnv || a.environment === filterEnv
    return matchesSearch && matchesEnv
  })

  const openEditor = (account?: Account) => {
    if (account) {
      setEditingId(account.id)
      setForm({ ...account })
      setTagsInput(account.tags.join(', '))
      setPatternsInput(account.domainPatterns.join(', '))
    } else {
      setEditingId(null)
      setForm({ ...emptyAccount })
      setTagsInput('')
      setPatternsInput('')
    }
    setView('edit')
  }

  const handleSave = async () => {
    const accountData = {
      ...form,
      tags: tagsInput.split(',').map((s) => s.trim()).filter(Boolean),
      domainPatterns: patternsInput.split(',').map((s) => s.trim()).filter(Boolean),
    }

    if (editingId) {
      await sendMessage({ type: 'UPDATE_ACCOUNT', payload: { id: editingId, ...accountData } })
    } else {
      await sendMessage({ type: 'CREATE_ACCOUNT', payload: accountData })
    }
    await loadAccounts()
    setView('list')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account?')) return
    await sendMessage({ type: 'DELETE_ACCOUNT', payload: id })
    await loadAccounts()
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
      setStatusMsg('Export failed: ' + (res.error || 'unknown'))
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
    setStatusMsg(`Exported ${selectedIds.size > 0 ? selectedIds.size : accounts.length} accounts`)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isEncrypted = !file.name.endsWith('.json')
    let data: string | ArrayBuffer

    if (isEncrypted && importPass) {
      data = await file.arrayBuffer()
    } else {
      data = await file.text()
    }

    const res = await sendMessage<{ imported: number; skipped: number }>({
      type: 'IMPORT_PACK',
      payload: { data, passphrase: importPass || undefined },
    })

    if (res.success && res.data) {
      setStatusMsg(`Imported ${res.data.imported}, skipped ${res.data.skipped} duplicates`)
      await loadAccounts()
      setView('list')
    } else {
      setStatusMsg('Import failed: ' + (res.error || 'unknown'))
    }
  }

  if (view === 'edit') {
    return (
      <div className="options">
        <header className="options-header">
          <div className="options-brand">
            <img src="/icon.png" alt="TestVault icon" className="options-logo" />
            <h1>TestVault Orbit</h1>
          </div>
          <span className="badge">TEST USE ONLY</span>
        </header>
        <div className="options-content">
          <div className="editor">
            <h2>{editingId ? 'Edit Account' : 'New Account'}</h2>
            <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label>App Name<input value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })} /></label>
            <label>Environment
              <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value as Environment })}>
                {ENVIRONMENTS.map((env) => <option key={env} value={env}>{env}</option>)}
              </select>
            </label>
            <label>Login URL<input value={form.loginUrl || ''} onChange={(e) => setForm({ ...form, loginUrl: e.target.value })} placeholder="https://staging.myapp.com/login" /></label>
            <label>Username / Email<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
            <label>Password<input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <label>Domain Patterns (comma-separated)<input value={patternsInput} onChange={(e) => setPatternsInput(e.target.value)} placeholder="staging.myapp.com, *.myapp.com" /></label>
            <label>Tags (comma-separated)<input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="admin, premium, german" /></label>
            <label>Persona<input value={form.persona || ''} onChange={(e) => setForm({ ...form, persona: e.target.value })} placeholder="Admin, Viewer, Partner" /></label>
            <label>Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AccountStatus })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Notes<textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></label>

            <div className="editor-actions">
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
              <button className="btn btn-secondary" onClick={() => setView('list')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'import') {
    return (
      <div className="options">
        <header className="options-header">
          <div className="options-brand">
            <img src="/icon.png" alt="TestVault icon" className="options-logo" />
            <h1>TestVault Orbit</h1>
          </div>
          <span className="badge">TEST USE ONLY</span>
        </header>
        <div className="options-content">
          <div className="import-section">
            <h2>Import Pack</h2>
            <label>Passphrase (if encrypted)<input value={importPass} onChange={(e) => setImportPass(e.target.value)} type="password" /></label>
            <input type="file" accept=".testvault,.json" onChange={handleImportFile} />
            {statusMsg && <div className="status-msg">{statusMsg}</div>}
            <button className="btn btn-secondary" onClick={() => setView('list')}>Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="options">
      <header className="options-header">
        <div className="options-brand">
          <img src="/icon.png" alt="TestVault icon" className="options-logo" />
          <h1>TestVault Orbit</h1>
        </div>
        <span className="badge">TEST USE ONLY</span>
      </header>

      <div className="options-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Search identities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterEnv} onChange={(e) => setFilterEnv(e.target.value)}>
          <option value="">All environments</option>
          {ENVIRONMENTS.map((env) => <option key={env} value={env}>{env}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => openEditor()}>+ New Account</button>
        <button className="btn btn-secondary" onClick={() => setView('import')}>Import</button>
      </div>

      <div className="options-export-bar">
        <input value={exportLabel} onChange={(e) => setExportLabel(e.target.value)} placeholder="Pack label" />
        <input value={exportPass} onChange={(e) => setExportPass(e.target.value)} type="password" placeholder="Passphrase (optional)" />
        <button className="btn btn-secondary" onClick={handleExport}>
          Export {selectedIds.size > 0 ? `(${selectedIds.size})` : 'All'}
        </button>
      </div>

      {statusMsg && <div className="status-msg">{statusMsg}</div>}

      <div className="options-content">
        <table className="accounts-table">
          <thead>
            <tr>
              <th></th>
              <th>Title</th>
              <th>App</th>
              <th>Env</th>
              <th>Username</th>
              <th>Status</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td><input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} /></td>
                <td>{a.title}</td>
                <td>{a.appName}</td>
                <td><span className="env-badge">{a.environment}</span></td>
                <td className="mono">{a.username}</td>
                <td><span className={`status-dot status-${a.status}`} /></td>
                <td>{a.tags.map((t) => <span key={t} className="tag">{t}</span>)}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditor(a)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="empty-row">No identities found. Create your first profile.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
