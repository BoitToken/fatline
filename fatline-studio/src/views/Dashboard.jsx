import { useEffect, useState } from 'react';
import { listProjects, createProject, getCredits, getUser, clearAuth } from '../lib/api.js';
import { Icon } from '../lib/icons.jsx';

const TYPES = [
  ['webapp', 'Web App'], ['landing', 'Landing'], ['ecommerce', 'E-commerce'],
  ['saas', 'SaaS'], ['crm', 'CRM / Dashboard'], ['mobile', 'Mobile'],
];
const EXAMPLES = [
  'A premium paan delivery store for celebrations in Bangalore',
  'A CRM for freelance interior designers to track clients and invoices',
  'A landing page for an AI legal contract review tool',
  'A skincare D2C brand with a personalized routine quiz',
];

export default function Dashboard({ onOpenStudio, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [idea, setIdea] = useState('');
  const [type, setType] = useState('webapp');
  const [creating, setCreating] = useState(false);
  const [credits, setCredits] = useState(null);
  const user = getUser();

  const load = async () => {
    setLoading(true);
    try {
      setProjects(await listProjects());
      setError('');
    } catch (e) {
      setError(e.status === 401 ? 'Session expired — please sign in again.' : e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getCredits().then(setCredits);
  }, []);

  const create = async () => {
    if (!idea.trim()) return;
    setCreating(true);
    setError('');
    try {
      const p = await createProject({ name: idea.trim().slice(0, 60), description: idea.trim(), type });
      if (!p?.id) throw new Error('Create returned no id');
      onOpenStudio(p.id);
    } catch (e) {
      setError(e.message || 'Failed to create project');
      setCreating(false);
    }
  };

  const logout = () => { clearAuth(); onLogout(); };

  return (
    <div className="dash">
      <div className="dash-top">
        <div className="auth-logo" style={{ margin: 0 }}>
          <div className="mark" style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,var(--brand),var(--brand-2))', display: 'grid', placeItems: 'center', fontWeight: 800, fontFamily: 'var(--font-display)' }}>F</div>
          <div>
            <div style={{ fontWeight: 700 }}>Fatline Studio</div>
            <div className="muted" style={{ fontSize: 12 }}>{user?.email || 'Build from a sentence'}</div>
          </div>
        </div>
        <div className="dash-actions">
          {credits != null && <span className="pill brand"><span className="dot" /> {credits} credits</span>}
          <button className="button ghost sm" onClick={logout}><Icon name="logout" size={15} /> Sign out</button>
        </div>
      </div>

      <div className="hero-prompt">
        <div className="eyebrow">New build</div>
        <h1>What do you want to build?</h1>
        <p className="muted" style={{ fontSize: 14 }}>Describe your idea — Fatline generates a live, clickable prototype you can refine by chatting.</p>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g. A premium paan delivery store for celebrations in Bangalore…"
          rows={3}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) create(); }}
        />
        <div className="row">
          <div style={{ width: 180 }}>
            <label><span>App type</span>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <button className="button primary" onClick={create} disabled={!idea.trim() || creating}>
            <Icon name="sparkles" size={16} /> {creating ? 'Creating…' : 'Build it'}
          </button>
        </div>
        <div className="chips">
          {EXAMPLES.map((ex) => <button key={ex} className="chip" onClick={() => setIdea(ex)}>{ex}</button>)}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="eyebrow" style={{ marginBottom: 12 }}>Your projects</div>
      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ margin: '0 auto 10px' }} /> Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="empty-state"><div className="empty-title">No projects yet</div>Describe an idea above to create your first build.</div>
      ) : (
        <div className="grid-projects">
          {projects.map((p) => (
            <div key={p.id} className="pcard" onClick={() => onOpenStudio(p.id)}>
              <div className="pcard-top">
                <div className="pcard-name">{p.name || 'Untitled'}</div>
                <StatusPill p={p} />
              </div>
              {p.description && <div className="pcard-desc">{p.description}</div>}
              <div className="pcard-meta">
                <span>{p.type || 'app'}</span>
                <span>·</span>
                <span>{p.stage || 'draft'}</span>
                <span>·</span>
                <span>#{p.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ p }) {
  const live = p.status === 'active' && /live|complete|deployed/.test(p.stage || '');
  if (live) return <span className="pill mint"><span className="dot" /> live</span>;
  if (/build|research|design|develop|instant/.test(p.stage || '')) return <span className="pill amber"><span className="dot" /> building</span>;
  return <span className="pill neutral">{p.stage || 'draft'}</span>;
}
