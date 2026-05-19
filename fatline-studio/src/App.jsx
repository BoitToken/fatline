import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_API_BASE = 'https://api.produsa.dev'
const PROMPTS = [
  'Tighten the hero and make the CTA clearer.',
  'Add a pricing section with trust signals.',
  'Improve onboarding flow and reduce friction.',
  'Make the UI feel calmer and more premium.',
]

const BUILD_EVENT_LABELS = {
  agent_started: 'Agent started',
  task_complete: 'Task complete',
  error: 'Error',
  build_live: 'Build live',
  build_complete: 'Build complete',
  deploy_complete: 'Deploy complete',
  build: 'Build',
  deploy: 'Deploy',
}

function nowIso() {
  return new Date().toISOString()
}

function formatTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function wsBaseFromApi(apiBase) {
  return apiBase.replace(/^http/, 'ws')
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function normalizeProjectStatus(payload) {
  if (!payload) return null
  return payload.project || payload
}

function normalizeMessages(payload) {
  const raw = Array.isArray(payload?.messages) ? payload.messages : Array.isArray(payload) ? payload : []
  return raw.map((item, index) => ({
    id: item.id || `${item.created_at || item.timestamp || nowIso()}-${index}`,
    role: item.role || 'system',
    content: item.content || item.message || item.text || '',
    timestamp: item.created_at || item.timestamp || nowIso(),
  }))
}

function eventToMessage(event) {
  const label = BUILD_EVENT_LABELS[event.type] || 'Update'
  const content = event.message || event.url || event.agentTask || event.agentStatus || label
  return {
    id: `${event.type}-${event.ts || nowIso()}`,
    role: 'system',
    content: `${label}: ${content}`,
    timestamp: event.ts || nowIso(),
  }
}

function Stat({ label, value, tone = 'default' }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value || '—'}</div>
    </div>
  )
}

function Section({ title, eyebrow, children, className = '' }) {
  return (
    <section className={`section ${className}`.trim()}>
      <div className="section-header">
        <div>
          {eyebrow ? <div className="section-eyebrow">{eyebrow}</div> : null}
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  )
}

function MessageBubble({ message }) {
  return (
    <div className={`message message-${message.role}`}>
      <div className="message-meta">
        <span>{message.role === 'assistant' ? 'Fatline' : message.role === 'user' ? 'You' : 'System'}</span>
        <span>{formatTime(message.timestamp)}</span>
      </div>
      <div className="message-body">{message.content}</div>
    </div>
  )
}

export default function App() {
  const query = useMemo(() => new URLSearchParams(window.location.search), [])
  const [apiBase, setApiBase] = useState(localStorage.getItem('fatline_api_base') || DEFAULT_API_BASE)
  const [token, setToken] = useState(localStorage.getItem('fatline_token') || localStorage.getItem('af_token') || '')
  const [projectId, setProjectId] = useState(query.get('project') || localStorage.getItem('fatline_project_id') || '')
  const [project, setProject] = useState(null)
  const [messages, setMessages] = useState([])
  const [events, setEvents] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState('')
  const [wsStatus, setWsStatus] = useState('idle')
  const [iframeNonce, setIframeNonce] = useState(Date.now())

  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)

  const previewUrl = useMemo(() => {
    if (!projectId) return ''
    return `${apiBase}/api/projects/${projectId}/preview?v=${iframeNonce}`
  }, [apiBase, projectId, iframeNonce])

  const deploymentUrl = project?.deployed_url || project?.deployment_url || project?.url || project?.preview_url || ''
  const buildState = project?.status || project?.build_status || project?.phase || 'idle'

  useEffect(() => {
    localStorage.setItem('fatline_api_base', apiBase)
  }, [apiBase])

  useEffect(() => {
    localStorage.setItem('fatline_token', token)
  }, [token])

  useEffect(() => {
    localStorage.setItem('fatline_project_id', projectId)
  }, [projectId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, events])

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    const res = await fetch(`${apiBase}/api/projects/${projectId}/status`, {
      headers: authHeaders(token),
    })
    if (!res.ok) throw new Error(`Project status failed (${res.status})`)
    const data = await res.json()
    setProject(normalizeProjectStatus(data))
  }, [apiBase, projectId, token])

  const fetchMessages = useCallback(async () => {
    if (!projectId) return
    const res = await fetch(`${apiBase}/api/projects/${projectId}/messages`, {
      headers: authHeaders(token),
    })
    if (!res.ok) throw new Error(`Messages failed (${res.status})`)
    const data = await res.json()
    setMessages(normalizeMessages(data))
  }, [apiBase, projectId, token])

  const refreshAll = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError('')
    try {
      await Promise.all([fetchProject(), fetchMessages()])
      setLastSync(nowIso())
    } catch (err) {
      setError(err.message || 'Failed to sync project')
    } finally {
      setLoading(false)
    }
  }, [fetchMessages, fetchProject, projectId])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    if (!projectId) return undefined
    const interval = window.setInterval(() => {
      fetchProject().catch(() => {})
      fetchMessages().catch(() => {})
    }, 15000)
    return () => window.clearInterval(interval)
  }, [fetchMessages, fetchProject, projectId])

  useEffect(() => {
    if (!projectId) return undefined

    const socketUrl = `${wsBaseFromApi(apiBase)}/ws/projects/${projectId}/build`
    const socket = new WebSocket(socketUrl)
    socketRef.current = socket
    setWsStatus('connecting')

    socket.onopen = () => setWsStatus('live')
    socket.onclose = () => setWsStatus('offline')
    socket.onerror = () => setWsStatus('error')
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data)
        const stamped = { ...event, ts: event.ts || nowIso() }
        setEvents((prev) => [...prev.slice(-29), stamped])
        if (['agent_started', 'task_complete', 'error', 'build_live', 'build_complete', 'deploy_complete'].includes(stamped.type)) {
          setMessages((prev) => [...prev, eventToMessage(stamped)].slice(-120))
        }
        if (stamped.type === 'build_complete' || stamped.type === 'build_live' || stamped.type === 'deploy_complete') {
          setIframeNonce(Date.now())
          fetchProject().catch(() => {})
        }
      } catch {
        // ignore malformed events
      }
    }

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [apiBase, fetchProject, projectId])

  const sendChat = useCallback(async (text) => {
    if (!projectId || !text.trim()) return
    const outgoing = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: nowIso(),
    }
    setMessages((prev) => [...prev, outgoing])
    setChatInput('')
    setSending(true)
    setError('')

    try {
      const res = await fetch(`${apiBase}/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ message: text.trim(), projectId }),
      })
      if (!res.ok) throw new Error(`Chat failed (${res.status})`)
      const data = await res.json()
      const reply = data.reply || data.message || 'Got it.'
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: nowIso(),
        },
      ])
      fetchProject().catch(() => {})
    } catch (err) {
      setError(err.message || 'Failed to send chat')
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          role: 'system',
          content: err.message || 'Failed to send chat',
          timestamp: nowIso(),
        },
      ])
    } finally {
      setSending(false)
    }
  }, [apiBase, projectId, token, fetchProject])

  const triggerAction = useCallback(async (kind) => {
    if (!projectId) return
    const route = kind === 'instant'
      ? `/api/projects/${projectId}/build/instant`
      : kind === 'production'
        ? `/api/projects/${projectId}/build/production`
        : `/api/projects/${projectId}/deploy`

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}${route}`, {
        method: 'POST',
        headers: authHeaders(token),
        body: kind === 'deploy' ? undefined : JSON.stringify({ type: kind }),
      })
      if (!res.ok) throw new Error(`${kind} failed (${res.status})`)
      setEvents((prev) => [...prev.slice(-29), { type: kind, message: `${kind} triggered`, ts: nowIso() }])
      await fetchProject()
    } catch (err) {
      setError(err.message || `Failed to ${kind}`)
    } finally {
      setLoading(false)
    }
  }, [apiBase, fetchProject, projectId, token])

  const handleSubmit = useCallback((event) => {
    event.preventDefault()
    sendChat(chatInput)
  }, [chatInput, sendChat])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">FatPipeline shell</div>
          <h1>Fatline Studio</h1>
        </div>
        <div className="topbar-meta">
          <span className={`status-pill status-${wsStatus}`}>{wsStatus}</span>
          <span className="subtle">Last sync {formatTime(lastSync)}</span>
        </div>
      </header>

      <main className="workspace-grid">
        <aside className="panel controls-panel">
          <Section title="Controls" eyebrow="Left rail">
            <label>
              <span>Project ID</span>
              <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="248" />
            </label>
            <label>
              <span>API base</span>
              <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder={DEFAULT_API_BASE} />
            </label>
            <label>
              <span>Bearer token</span>
              <textarea value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste af_token here" rows={4} />
            </label>
            <div className="button-row">
              <button className="button primary" onClick={refreshAll} disabled={!projectId || loading}>Connect</button>
              <button className="button" onClick={() => setIframeNonce(Date.now())} disabled={!projectId}>Reload preview</button>
            </div>
          </Section>

          <Section title="Run actions" eyebrow="Pipeline hooks">
            <div className="button-stack">
              <button className="button primary" onClick={() => triggerAction('instant')} disabled={!projectId || loading}>Instant build</button>
              <button className="button" onClick={() => triggerAction('production')} disabled={!projectId || loading}>Production build</button>
              <button className="button" onClick={() => triggerAction('deploy')} disabled={!projectId || loading}>Deploy live</button>
              <button className="button ghost" onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')} disabled={!projectId}>Open preview</button>
            </div>
          </Section>

          <Section title="Project signal" eyebrow="Backend state">
            <div className="stats-grid">
              <Stat label="Status" value={buildState} tone="brand" />
              <Stat label="Updated" value={formatTime(project?.updated_at)} tone="mint" />
              <Stat label="Deploy URL" value={deploymentUrl ? 'ready' : 'none'} tone="amber" />
              <Stat label="Preview" value={projectId ? 'wired' : 'idle'} />
            </div>
            {project ? (
              <div className="project-summary">
                <div><strong>Name:</strong> {project.name || project.app_name || 'Untitled project'}</div>
                <div><strong>Type:</strong> {project.app_type || project.type || '—'}</div>
                <div><strong>Subdomain:</strong> {project.subdomain || '—'}</div>
                <div><strong>Live URL:</strong> {deploymentUrl || '—'}</div>
              </div>
            ) : (
              <div className="empty-state">Connect a project to load state, preview, and chat.</div>
            )}
          </Section>

          <Section title="Quick prompts" eyebrow="Founder shortcuts">
            <div className="prompt-list">
              {PROMPTS.map((prompt) => (
                <button key={prompt} className="prompt-chip" onClick={() => setChatInput(prompt)}>{prompt}</button>
              ))}
            </div>
          </Section>
        </aside>

        <section className="panel preview-panel">
          <div className="preview-header">
            <div>
              <div className="section-eyebrow">Center stage</div>
              <h2>Live preview</h2>
            </div>
            <div className="preview-actions">
              <span className="status-pill status-neutral">{buildState}</span>
              {deploymentUrl ? (
                <a className="button ghost" href={deploymentUrl} target="_blank" rel="noreferrer">Open deployed</a>
              ) : null}
            </div>
          </div>
          <div className="preview-frame-wrap">
            {projectId ? (
              <iframe
                key={iframeNonce}
                title="Fatline preview"
                src={previewUrl}
                className="preview-frame"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="empty-preview">
                <div className="empty-title">No project connected</div>
                <p>Paste a project ID on the left and hit Connect.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="panel chat-panel">
          <Section title="Activity" eyebrow="Live tape" className="activity-section">
            <div className="activity-list">
              {events.length ? events.slice().reverse().map((event, index) => (
                <div key={`${event.type}-${event.ts}-${index}`} className="activity-item">
                  <div className="activity-topline">
                    <span>{BUILD_EVENT_LABELS[event.type] || event.type}</span>
                    <span>{formatTime(event.ts)}</span>
                  </div>
                  <div className="activity-body">{event.message || event.url || event.agent || 'Pipeline update'}</div>
                </div>
              )) : <div className="empty-state">Build events will stream here.</div>}
            </div>
          </Section>

          <Section title="Chat" eyebrow="Right rail" className="chat-section">
            <div className="chat-log">
              {messages.length ? messages.map((message) => <MessageBubble key={message.id} message={message} />) : <div className="empty-state">Project chat will appear here.</div>}
              <div ref={messagesEndRef} />
            </div>
            <form className="composer" onSubmit={handleSubmit}>
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tell the builder what to change…"
                rows={4}
              />
              <div className="composer-actions">
                {error ? <div className="error-text">{error}</div> : <div className="subtle">Uses the existing backend chat + build routes.</div>}
                <button className="button primary" type="submit" disabled={!projectId || sending || !chatInput.trim()}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </Section>
        </aside>
      </main>
    </div>
  )
}
