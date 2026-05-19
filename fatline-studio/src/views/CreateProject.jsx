import { useState } from 'react'
import { createProject } from '../lib/api.js'

const APP_TYPES = [
  { value: 'webapp', label: 'Web App' },
  { value: 'landing', label: 'Landing Page' },
  { value: 'crm', label: 'CRM / Dashboard' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'mobile', label: 'Mobile App' },
  { value: 'tool', label: 'Tool / Utility' },
]

const SUGGESTIONS = [
  'A landing page for a premium fitness coaching program with waitlist and pricing.',
  'A simple CRM for freelance consultants to track clients, projects, and invoices.',
  'An ecommerce store for handmade jewelry with Shopify integration.',
  'A dashboard for tracking cryptocurrency portfolios with real-time price alerts.',
]

export default function CreateProject({ onCreated, onBack }) {
  const [prompt, setPrompt] = useState('')
  const [appType, setAppType] = useState('webapp')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await createProject({
        name: prompt.trim().slice(0, 60),
        description: prompt.trim(),
        type: appType,
      })
      const project = data.project
      if (!project?.id) throw new Error('Project creation returned no ID')
      onCreated(project.id)
    } catch (err) {
      setError(err.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <div className="eyebrow">App Factory</div>
          <h1>New Project</h1>
        </div>
        <button className="button ghost" onClick={onBack}>← Back</button>
      </header>

      <div className="create-form panel">
        {error && <div className="error-banner">{error}</div>}

        <label>
          <span>What do you want to build?</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your app idea in a sentence or two…"
            rows={5}
          />
        </label>

        <label>
          <span>App type</span>
          <select value={appType} onChange={(e) => setAppType(e.target.value)}>
            {APP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        <div className="button-row" style={{ marginTop: 8 }}>
          <button
            className="button primary"
            onClick={handleSubmit}
            disabled={!prompt.trim() || loading}
          >
            {loading ? 'Creating…' : 'Create Project'}
          </button>
          <button className="button ghost" onClick={onBack} disabled={loading}>
            Cancel
          </button>
        </div>

        <div className="suggestions">
          <div className="eyebrow" style={{ marginBottom: 8 }}>Examples</div>
          <div className="prompt-list">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="prompt-chip"
                onClick={() => setPrompt(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
