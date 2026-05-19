import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getProjectStatus as fetchProjectStatus,
  fetchMessages,
  sendChatMessage,
  triggerInstantBuild,
  triggerProductionBuild,
  triggerDeploy,
  getStoredAuth,
} from '../lib/api.js'
import UserJourney from './UserJourney.jsx'

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

function PhaseStep({ label, active, done }) {
  return (
    <div className={`studio-phase ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
      <div className="studio-phase-dot" />
      <div className="studio-phase-label">{label}</div>
    </div>
  )
}

export default function StudioShell({ projectId, onBack }) {
  const { apiBase, token } = useMemo(() => getStoredAuth(), [])
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
  const [studioTab, setStudioTab] = useState('build') // build | journey | code | settings

  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)

  const previewUrl = useMemo(() => {
    if (!projectId) return ''
    return `${apiBase}/api/projects/${projectId}/preview?v=${iframeNonce}`
  }, [apiBase, projectId, iframeNonce])

  const meta = project?.metadata || {}
  const deploymentUrl = meta.deployed_url || meta.deployment_url || project?.deployed_url || project?.deployment_url || project?.url || ''
  const prototypeUrl = meta.prototype_url || project?.prototype_url || project?.preview_url || ''
  const buildState = project?.status || project?.build_status || project?.phase || 'idle'

  const discoveryComplete = meta.discovery_complete === true
  const productionRequested = meta.production_requested === true
  const productionBuild = meta.production_build === true
  const isDeployed = !!deploymentUrl

  // Determine visible phase for the studio phase bar
  let currentStudioPhase = 'briefing'
  if (discoveryComplete || meta.discovery_skipped) currentStudioPhase = 'prototype'
  if (prototypeUrl) currentStudioPhase = 'review'
  if (productionRequested || productionBuild) currentStudioPhase = 'production'
  if (isDeployed) currentStudioPhase = 'deployed'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, events])

  const getProject = useCallback(async () => {
    if (!projectId) return
    const res = await fetchProjectStatus(projectId)
    setProject(normalizeProjectStatus(res))
  }, [projectId])

  const getMessages = useCallback(async () => {
    if (!projectId) return
    const res = await fetchMessages(projectId)
    setMessages(normalizeMessages(res))
  }, [projectId])

  const refreshAll = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError('')
    try {
      await Promise.all([getProject(), getMessages()])
      setLastSync(nowIso())
    } catch (err) {
      setError(err.message || 'Failed to sync project')
    } finally {
      setLoading(false)
    }
  }, [getMessages, getProject, projectId])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    if (!projectId) return undefined
    const interval = window.setInterval(() => {
      getProject().catch(() => {})
      getMessages().catch(() => {})
    }, 15000)
    return () => window.clearInterval(interval)
  }, [getMessages, getProject, projectId])

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
          getProject().catch(() => {})
        }
      } catch {
        // ignore malformed events
      }
    }

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [apiBase, getProject, projectId])

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
      const data = await sendChatMessage(projectId, text.trim())
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
      getProject().catch(() => {})
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
  }, [projectId, getProject])

  const triggerAction = useCallback(async (kind) => {
    if (!projectId) return
    setLoading(true)
    setError('')
    try {
      if (kind === 'instant') {
        await triggerInstantBuild(projectId)
      } else if (kind === 'production') {
        await triggerProductionBuild(projectId)
      } else if (kind === 'deploy') {
        await triggerDeploy(projectId)
      }
      setEvents((prev) => [...prev.slice(-29), { type: kind, message: `${kind} triggered`, ts: nowIso() }])
      await getProject()
    } catch (err) {
      setError(err.message || `Failed to ${kind}`)
    } finally {
      setLoading(false)
    }
  }, [projectId, getProject])

  const handleSubmit = useCallback((event) => {
    event.preventDefault()
    sendChat(chatInput)
  }, [chatInput, sendChat])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">App Factory</div>
          <h1>{project?.name || 'Untitled project'}</h1>
        </div>
        <div className="topbar-meta">
          <button className="button ghost" onClick={onBack}>← Projects</button>
          <span className={`status-pill status-${wsStatus}`}>{wsStatus}</span>
          <span className="subtle">Sync {formatTime(lastSync)}</span>
        </div>
      </header>

      {/* Phase bar */}
      <div className="studio-phase-bar">
        <PhaseStep label="Briefing" active={currentStudioPhase === 'briefing'} done={currentStudioPhase !== 'briefing'} />
        <PhaseStep label="Prototype" active={currentStudioPhase === 'prototype'} done={['review','production','deployed'].includes(currentStudioPhase)} />
        <PhaseStep label="Review" active={currentStudioPhase === 'review'} done={['production','deployed'].includes(currentStudioPhase)} />
        <PhaseStep label="Production" active={currentStudioPhase === 'production'} done={currentStudioPhase === 'deployed'} />
        <PhaseStep label="Live" active={currentStudioPhase === 'deployed'} done={false} />
      </div>

      {/* Studio Tabs */}
      <div className="studio-tabs">
        <button className={`studio-tab ${studioTab === 'build' ? 'active' : ''}`} onClick={() => setStudioTab('build')}>Build</button>
        <button className={`studio-tab ${studioTab === 'journey' ? 'active' : ''}`} onClick={() => setStudioTab('journey')}>Journey</button>
        <button className={`studio-tab ${studioTab === 'code' ? 'active' : ''}`} onClick={() => setStudioTab('code')}>Code</button>
        <button className={`studio-tab ${studioTab === 'settings' ? 'active' : ''}`} onClick={() => setStudioTab('settings')}>Settings</button>
      </div>

      {studioTab === 'journey' && (
        <main className="workspace-grid journey-workspace">
          <UserJourney projectId={projectId} />
        </main>
      )}

      {studioTab === 'code' && (
        <main className="workspace-grid code-workspace">
          <div className="panel code-panel">
            <Section title="Source Code" eyebrow="Files">
              <div className="code-browser">
                <div className="code-file-tree">
                  <div className="code-file active">index.html</div>
                  <div className="code-file">styles.css</div>
                  <div className="code-file">app.js</div>
                  <div className="code-file">components/</div>
                </div>
                <div className="code-editor">
                  <pre><code>{`<!-- Generated by Fatline -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your App</title>
</head>
<body>
  <div id="app"></div>
  <script src="app.js"></script>
</body>
</html>`}</code></pre>
                </div>
              </div>
            </Section>
          </div>
        </main>
      )}

      {studioTab === 'settings' && (
        <main className="workspace-grid settings-workspace">
          <div className="panel settings-panel">
            <Section title="Project Settings" eyebrow="Configuration">
              <div className="settings-form">
                <label>
                  <span>Project Name</span>
                  <input defaultValue={project?.name || ''} />
                </label>
                <label>
                  <span>Subdomain</span>
                  <input defaultValue={meta.subdomain || ''} />
                </label>
                <label>
                  <span>Custom Domain</span>
                  <input placeholder="yourdomain.com" />
                </label>
                <div className="button-row">
                  <button className="button primary">Save Changes</button>
                </div>
              </div>
            </Section>
          </div>
        </main>
      )}

      {studioTab === 'build' && (
      <main className="workspace-grid">
        <aside className="panel controls-panel">
          <Section title="Actions" eyebrow="Pipeline">
            <div className="button-stack">
              {!prototypeUrl && (
                <button className="button primary" onClick={() => triggerAction('instant')} disabled={loading}>
                  Build prototype
                </button>
              )}
              {prototypeUrl && !productionRequested && (
                <button className="button primary" onClick={() => triggerAction('production')} disabled={loading}>
                  Approve & Build Production
                </button>
              )}
              {productionRequested && !isDeployed && (
                <button className="button" disabled>
                  Production build in progress…
                </button>
              )}
              {isDeployed && (
                <button className="button primary" onClick={() => window.open(deploymentUrl, '_blank', 'noopener,noreferrer')}>
                  Open live site
                </button>
              )}
              {!isDeployed && prototypeUrl && (
                <button className="button" onClick={() => triggerAction('deploy')} disabled={!productionRequested || loading}>
                  Deploy live
                </button>
              )}
              <button className="button ghost" onClick={() => setIframeNonce(Date.now())} disabled={!projectId}>
                Reload preview
              </button>
            </div>
          </Section>

          <Section title="Project signal" eyebrow="State">
            <div className="stats-grid">
              <Stat label="Status" value={buildState} tone="brand" />
              <Stat label="Phase" value={currentStudioPhase} tone="mint" />
              <Stat label="Deploy URL" value={isDeployed ? 'live' : deploymentUrl ? 'ready' : 'none'} tone={isDeployed ? 'mint' : 'amber'} />
              <Stat label="Preview" value={prototypeUrl ? 'wired' : 'idle'} />
            </div>
            {project ? (
              <div className="project-summary">
                <div><strong>Name:</strong> {project.name || project.app_name || 'Untitled'}</div>
                <div><strong>Type:</strong> {project.type || project.app_type || '—'}</div>
                <div><strong>Subdomain:</strong> {project.subdomain || meta.subdomain || '—'}</div>
                <div><strong>Live URL:</strong> {deploymentUrl || '—'}</div>
              </div>
            ) : (
              <div className="empty-state">Loading project…</div>
            )}
          </Section>

          <Section title="Quick prompts" eyebrow="Shortcuts">
            <div className="prompt-list">
              {[
                'Tighten the hero and make the CTA clearer.',
                'Add a pricing section with trust signals.',
                'Improve onboarding flow and reduce friction.',
                'Make the UI feel calmer and more premium.',
              ].map((prompt) => (
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
            {projectId && prototypeUrl ? (
              <iframe
                key={iframeNonce}
                title="Fatline preview"
                src={previewUrl}
                className="preview-frame"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : projectId ? (
              <div className="empty-preview">
                <div className="empty-title">No prototype yet</div>
                <p>Run discovery or click "Build prototype" to generate a preview.</p>
              </div>
            ) : (
              <div className="empty-preview">
                <div className="empty-title">No project</div>
                <p>Select a project from the dashboard.</p>
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

          <Section title="Chat" eyebrow="Builder" className="chat-section">
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
                {error ? <div className="error-text">{error}</div> : <div className="subtle">Chat with the builder agent.</div>}
                <button className="button primary" type="submit" disabled={!projectId || sending || !chatInput.trim()}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </Section>
        </aside>
      </main>
      )}
    </div>
  )
}
