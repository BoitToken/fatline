import { useEffect, useRef, useState } from 'react'
import { getProjectStatus, getStoredAuth } from '../lib/api.js'

const FLOW_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ef4444', // red
  '#14b8a6', // teal
]

function JourneyNode({ node, isActive, onClick, index }) {
  const color = FLOW_COLORS[index % FLOW_COLORS.length]
  return (
    <div
      className={`journey-node ${isActive ? 'active' : ''}`}
      onClick={() => onClick(node)}
      style={{ '--node-color': color }}
    >
      <div className="journey-node-header">
        <span className="journey-node-number">{index + 1}</span>
        <span className="journey-node-type">{node.type || 'page'}</span>
      </div>
      <div className="journey-node-title">{node.name}</div>
      <div className="journey-node-desc">{node.description || node.purpose || ''}</div>
      {node.screenshot && (
        <div className="journey-node-preview">
          <img src={node.screenshot} alt={node.name} loading="lazy" />
        </div>
      )}
      <div className="journey-node-actions">
        {node.actions?.map((action, i) => (
          <span key={i} className="journey-action-tag">{action}</span>
        ))}
      </div>
    </div>
  )
}

function JourneyEdge({ from, to, label, index }) {
  const color = FLOW_COLORS[index % FLOW_COLORS.length]
  return (
    <div className="journey-edge" style={{ '--edge-color': color }}>
      <svg className="journey-edge-svg" viewBox="0 0 100 20" preserveAspectRatio="none">
        <defs>
          <marker id={`arrow-${index}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill={color} />
          </marker>
        </defs>
        <path
          d="M0,10 Q50,0 100,10"
          fill="none"
          stroke={color}
          strokeWidth="2"
          markerEnd={`url(#arrow-${index})`}
        />
      </svg>
      {label && <span className="journey-edge-label">{label}</span>}
    </div>
  )
}

function JourneyStats({ nodes, edges }) {
  const stats = {
    pages: nodes.filter(n => n.type === 'page' || !n.type).length,
    screens: nodes.filter(n => n.type === 'screen').length,
    modals: nodes.filter(n => n.type === 'modal').length,
    flows: edges.length,
    actions: nodes.reduce((acc, n) => acc + (n.actions?.length || 0), 0),
  }

  return (
    <div className="journey-stats">
      <div className="journey-stat">
        <span className="journey-stat-value">{stats.pages}</span>
        <span className="journey-stat-label">Pages</span>
      </div>
      <div className="journey-stat">
        <span className="journey-stat-value">{stats.screens}</span>
        <span className="journey-stat-label">Screens</span>
      </div>
      <div className="journey-stat">
        <span className="journey-stat-value">{stats.modals}</span>
        <span className="journey-stat-label">Modals</span>
      </div>
      <div className="journey-stat">
        <span className="journey-stat-value">{stats.flows}</span>
        <span className="journey-stat-label">User Flows</span>
      </div>
      <div className="journey-stat">
        <span className="journey-stat-value">{stats.actions}</span>
        <span className="journey-stat-label">Actions</span>
      </div>
    </div>
  )
}

export default function UserJourney({ projectId }) {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [activeNode, setActiveNode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('flow') // flow | grid | list
  const containerRef = useRef(null)

  useEffect(() => {
    if (!projectId) return
    loadJourney()
  }, [projectId])

  const loadJourney = async () => {
    setLoading(true)
    try {
      const data = await getProjectStatus(projectId)
      const project = data.project || data
      const meta = project.metadata || {}

      // Extract pages from prototype_pages or page_map
      const pages = meta.prototype_pages || meta.pages || meta.page_map || []
      const flows = meta.user_flows || meta.flows || []

      // Build nodes from pages
      const builtNodes = Array.isArray(pages)
        ? pages.map((p, i) => ({
            id: p.id || `page-${i}`,
            name: p.name || p.title || p.id || `Page ${i + 1}`,
            description: p.description || p.purpose || '',
            type: p.type || 'page',
            screenshot: p.screenshot || p.preview_url || '',
            actions: p.actions || p.ctas || [],
            route: p.route || p.path || '',
            position: p.position || { x: 0, y: 0 },
          }))
        : []

      // Build edges from flows or infer from page order
      const builtEdges = Array.isArray(flows) && flows.length > 0
        ? flows.map((f, i) => ({
            from: f.from || f.source,
            to: f.to || f.target,
            label: f.label || f.action || 'navigates to',
            index: i,
          }))
        : builtNodes.length > 1
          ? builtNodes.slice(0, -1).map((n, i) => ({
              from: n.id,
              to: builtNodes[i + 1].id,
              label: 'navigates to',
              index: i,
            }))
          : []

      setNodes(builtNodes)
      setEdges(builtEdges)
    } catch (err) {
      console.error('Failed to load journey:', err)
      // Fallback: generate from common app patterns
      setNodes(generateFallbackNodes())
      setEdges(generateFallbackEdges())
    } finally {
      setLoading(false)
    }
  }

  const generateFallbackNodes = () => [
    { id: 'landing', name: 'Landing Page', description: 'Hero, value prop, CTA', type: 'page', actions: ['Sign up', 'Learn more'] },
    { id: 'signup', name: 'Sign Up', description: 'Email/password registration', type: 'page', actions: ['Create account', 'Sign in'] },
    { id: 'onboarding', name: 'Onboarding', description: 'Welcome flow, setup wizard', type: 'page', actions: ['Next', 'Skip'] },
    { id: 'dashboard', name: 'Dashboard', description: 'Main app interface, overview', type: 'page', actions: ['Create', 'Filter', 'Search'] },
    { id: 'settings', name: 'Settings', description: 'Profile, preferences, billing', type: 'page', actions: ['Save', 'Cancel'] },
  ]

  const generateFallbackEdges = () => [
    { from: 'landing', to: 'signup', label: 'clicks CTA' },
    { from: 'signup', to: 'onboarding', label: 'creates account' },
    { from: 'onboarding', to: 'dashboard', label: 'completes setup' },
    { from: 'dashboard', to: 'settings', label: 'opens settings' },
    { from: 'settings', to: 'dashboard', label: 'goes back' },
  ]

  const handleNodeClick = (node) => {
    setActiveNode(activeNode?.id === node.id ? null : node)
  }

  if (loading) {
    return (
      <div className="journey-loading">
        <div className="journey-spinner" />
        <p>Mapping user journey…</p>
      </div>
    )
  }

  return (
    <div className="user-journey" ref={containerRef}>
      <div className="journey-toolbar">
        <h2>User Journey</h2>
        <div className="journey-view-toggle">
          <button className={viewMode === 'flow' ? 'active' : ''} onClick={() => setViewMode('flow')}>Flow</button>
          <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button>
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button>
        </div>
      </div>

      <JourneyStats nodes={nodes} edges={edges} />

      {viewMode === 'flow' && (
        <div className="journey-flow">
          {nodes.map((node, i) => (
            <div key={node.id} className="journey-flow-row">
              <JourneyNode
                node={node}
                index={i}
                isActive={activeNode?.id === node.id}
                onClick={handleNodeClick}
              />
              {i < nodes.length - 1 && (
                <JourneyEdge
                  from={node.id}
                  to={nodes[i + 1].id}
                  label={edges[i]?.label}
                  index={i}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="journey-grid">
          {nodes.map((node, i) => (
            <JourneyNode
              key={node.id}
              node={node}
              index={i}
              isActive={activeNode?.id === node.id}
              onClick={handleNodeClick}
            />
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="journey-list">
          {nodes.map((node, i) => (
            <div key={node.id} className={`journey-list-item ${activeNode?.id === node.id ? 'active' : ''}`} onClick={() => handleNodeClick(node)}>
              <span className="journey-list-number">{i + 1}</span>
              <div className="journey-list-content">
                <div className="journey-list-title">{node.name}</div>
                <div className="journey-list-desc">{node.description}</div>
              </div>
              <div className="journey-list-actions">
                {node.actions?.map((a, j) => (
                  <span key={j} className="journey-action-tag">{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeNode && (
        <div className="journey-detail-panel">
          <div className="journey-detail-header">
            <h3>{activeNode.name}</h3>
            <button className="button ghost" onClick={() => setActiveNode(null)}>Close</button>
          </div>
          <div className="journey-detail-body">
            <div className="journey-detail-field">
              <label>Type</label>
              <span>{activeNode.type}</span>
            </div>
            <div className="journey-detail-field">
              <label>Purpose</label>
              <p>{activeNode.description}</p>
            </div>
            {activeNode.route && (
              <div className="journey-detail-field">
                <label>Route</label>
                <code>{activeNode.route}</code>
              </div>
            )}
            {activeNode.actions?.length > 0 && (
              <div className="journey-detail-field">
                <label>User Actions</label>
                <div className="journey-detail-actions">
                  {activeNode.actions.map((a, i) => (
                    <span key={i} className="journey-action-tag">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {activeNode.screenshot && (
              <div className="journey-detail-field">
                <label>Preview</label>
                <img src={activeNode.screenshot} alt={activeNode.name} className="journey-detail-screenshot" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
