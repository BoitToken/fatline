import { useEffect, useState } from 'react'
import { listProjects, getStoredAuth, setStoredAuth } from '../lib/api.js'

function StatusBadge({ status }) {
  const tone =
    status === 'live' ? 'status-live' :
    status === 'active' ? 'status-neutral' :
    status === 'completed' ? 'status-mint' :
    'status-idle'
  return <span className={`status-pill ${tone}`}>{status || 'unknown'}</span>
}

export default function Dashboard({ onSelectProject, onCreateProject }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [apiBase, setApiBase] = useState(getStoredAuth().apiBase)
  const [token, setToken] = useState(getStoredAuth().token)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listProjects()
      setProjects(data.projects || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveAuth = () => {
    setStoredAuth({ apiBase, token })
    setAuthOpen(false)
    load()
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <div className="eyebrow">App Factory</div>
          <h1>Fatline Studio</h1>
        </div>
        <div className="dashboard-actions">
          <button className="button ghost" onClick={() => setAuthOpen((s) => !s)}>
            {authOpen ? 'Close' : 'Settings'}
          </button>
          <button className="button primary" onClick={onCreateProject}>
            + New Project
          </button>
        </div>
      </header>

      {authOpen && (
        <div className="auth-drawer panel">
          <label>
            <span>API base</span>
            <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
          </label>
          <label>
            <span>Bearer token</span>
            <textarea value={token} onChange={(e) => setToken(e.target.value)} rows={3} />
          </label>
          <div className="button-row">
            <button className="button primary" onClick={saveAuth}>Save & Connect</button>
            <button className="button ghost" onClick={() => setAuthOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="project-grid">
        {loading && !projects.length ? (
          <div className="empty-state">Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No projects yet</div>
            <p>Create your first app by clicking "New Project".</p>
          </div>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              className="project-card"
              onClick={() => onSelectProject(p.id)}
            >
              <div className="project-card-top">
                <div className="project-name">{p.name || 'Untitled'}</div>
                <StatusBadge status={p.status} />
              </div>
              <div className="project-meta">
                <span>Stage: {p.stage || '—'}</span>
                <span>ID: {p.id}</span>
              </div>
              {p.description && (
                <div className="project-desc">{p.description.slice(0, 120)}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
