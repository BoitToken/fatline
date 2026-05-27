import { useEffect, useRef, useState } from 'react';
import { listProjects, createProject, discoveryChat, buildInstant, uploadLogo, getCredits, getUser, clearAuth } from '../lib/api.js';
import { Icon } from '../lib/icons.jsx';
import brandMark from '../assets/produsa-mark.png';

// "What kind of project?" pills — mirrors produsa.app/dashboard.
// `comingSoon` modules are visually greyed + disabled until the pipeline is ready.
// CEO mandate 2026-05-28: Mobile, CRM, Agent, Personal stay disabled.
const TYPES = [
  { value: 'website', emoji: '🌐', label: 'Website' },
  { value: 'webapp', emoji: '⚙️', label: 'Web App' },
  { value: 'shopify', emoji: '🛍️', label: 'Shopify Store' },
  { value: 'mobile', emoji: '📱', label: 'Mobile App', comingSoon: true },
  { value: 'crm', emoji: '📊', label: 'CRM', comingSoon: true },
  { value: 'agent', emoji: '🤖', label: 'Agent', comingSoon: true },
  { value: 'personal', emoji: '👤', label: 'Personal App', comingSoon: true },
];

// CEO mandate 2026-05-28: "Paan in Bangalore" example chips removed —
// they were a placeholder seed and felt unprofessional pre-launch.
// Re-enable later via remote config when we have curated, on-brand prompts.

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (isNaN(s)) return '';
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // matches backend multer 2MB limit

// Light client-side normalisation so the backend (Part B2) gets a clean, scrapeable URL.
// Returns '' if it doesn't look like a host at all.
function normalizeBrandUrl(raw) {
  const v = (raw || '').trim();
  if (!v) return '';
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return u.hostname.includes('.') ? u.href.replace(/\/$/, '') : '';
  } catch {
    return '';
  }
}

export default function Dashboard({ onOpenStudio, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [idea, setIdea] = useState('');
  const [type, setType] = useState('webapp');
  const [credits, setCredits] = useState(null);
  const [tab, setTab] = useState('recent');

  // ── Hybrid brand intake (rebuilds only) ──────────────────────────────────
  // Greenfield ideas skip this entirely; if the user is rebuilding an existing
  // brand they expand the panel and give us the URL + logo to ground the redesign.
  const [showBrand, setShowBrand] = useState(false);
  const [brandUrl, setBrandUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const fileRef = useRef(null);

  const onPickLogo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Logo must be an image file.'); return; }
    if (f.size > MAX_LOGO_BYTES) { setError('Logo is over 2MB — please pick a smaller file.'); return; }
    setError('');
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };
  const clearLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // Same-tab onboarding chat state.
  const [chat, setChat] = useState(null); // null = idle | { projectId, messages, thinking, done }
  const [answer, setAnswer] = useState('');
  const chatRef = useRef(null);
  const user = getUser();

  const load = async () => {
    setLoading(true);
    try { setProjects(await listProjects()); setError(''); }
    catch (e) { setError(e.status === 401 ? 'Session expired — please sign in again.' : e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); getCredits().then(setCredits); }, []);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chat]);

  const stats = {
    total: projects.length,
    building: projects.filter((p) => /build|research|design|develop|instant|brief/.test(p.stage || '')).length,
    done: projects.filter((p) => /done|complete|ready/.test(p.stage || '')).length,
    live: projects.filter((p) => /live|deployed/.test(p.stage || '')).length,
  };

  // ── Same-tab onboarding chat ──────────────────────────────────────────────
  const start = async () => {
    if (!idea.trim() || chat) return;
    setError('');
    const seed = idea.trim();
    const cleanBrandUrl = normalizeBrandUrl(brandUrl);
    setChat({ projectId: null, messages: [{ role: 'user', text: seed }], thinking: true, done: false });
    try {
      const p = await createProject({ name: seed.slice(0, 60), description: seed, type, brandUrl: cleanBrandUrl });
      if (!p?.id) throw new Error('Create returned no id');
      // Attach the real logo first so it's on the project before generation. Non-fatal:
      // a failed upload must not block the build.
      if (logoFile) {
        try { await uploadLogo(p.id, logoFile); }
        catch (e) { console.warn('[brand] logo upload failed:', e?.message); }
      }
      // Kick off the backend's conversational discovery with the idea itself.
      const r = await discoveryChat(p.id, seed);
      applyDiscovery(p.id, r);
    } catch (e) {
      setError(e.message || 'Failed to start build');
      setChat(null);
    }
  };

  const reply = async () => {
    if (!answer.trim() || !chat?.projectId || chat.thinking) return;
    const a = answer.trim();
    setAnswer('');
    setChat((c) => ({ ...c, messages: [...c.messages, { role: 'user', text: a }], thinking: true }));
    try {
      const r = await discoveryChat(chat.projectId, a);
      applyDiscovery(chat.projectId, r);
    } catch (e) {
      setError(e.message || 'Discovery failed');
      setChat((c) => ({ ...c, thinking: false }));
    }
  };

  const applyDiscovery = (projectId, r) => {
    const q = r?.question || r?.message;
    if (r?.isComplete || !q) { finish(projectId); return; }
    // CEO mandate 2026-05-28 (Item 3): InstaScout returns a `plan` array with
    // { id, question, helper, options } per question. When the current question
    // has options, render them as multiple-choice chips above the answer input.
    // The user can click a chip to autofill OR type their own answer.
    let helper = ''
    let options = []
    if (Array.isArray(r?.plan) && r?.currentPlanId) {
      const planQ = r.plan.find((p) => p?.id === r.currentPlanId)
      if (planQ) {
        helper = (planQ.helper || '').toString().trim()
        options = Array.isArray(planQ.options)
          ? planQ.options.filter(Boolean).map(String).slice(0, 6)
          : []
      }
    }
    const total = r?.totalEstimate || null
    const n = r?.questionNumber || null
    setChat((c) => ({
      ...c,
      projectId,
      thinking: false,
      messages: [
        ...c.messages,
        { role: 'assistant', text: q, helper, options, n, total },
      ],
    }));
  };

  // Discovery done (or skipped) → fire the instant build and open the studio.
  const finish = async (projectId) => {
    setChat((c) => ({ ...c, projectId, thinking: true, done: true, messages: [...(c?.messages || []), { role: 'assistant', text: '✨ Building your prototype…' }] }));
    try { await buildInstant(projectId); } catch { /* studio will surface build state */ }
    onOpenStudio(projectId);
  };

  const skip = async () => {
    if (!chat?.projectId) return;
    try { await discoveryChat(chat.projectId, '', { skip: true }); } catch { /* non-fatal */ }
    finish(chat.projectId);
  };

  const logout = () => { clearAuth(); onLogout(); };
  const visible = tab === 'live' ? projects.filter((p) => /live|deployed/.test(p.stage || '')) : projects;

  return (
    <div className="dash fl-dash">
      <div className="dash-top">
        <div className="auth-logo" style={{ margin: 0 }}>
          <div className="mark logo-mark" style={{ width: 36, height: 36, borderRadius: 11 }}><img src={brandMark} alt="Produsa" /></div>
          <div style={{ fontWeight: 700 }}>Produsa</div>
        </div>
        <div className="dash-actions">
          {credits != null && <span className="pill brand"><span className="dot" /> {Number(credits).toLocaleString()} tokens</span>}
          <button className="button ghost sm" onClick={logout}><Icon name="logout" size={15} /> Sign out</button>
        </div>
      </div>

      <div className="fl-hero">
        <h1 className="fl-greeting">{greeting()}, {user?.name?.split(' ')[0] || 'there'} <span className="wave">👋</span></h1>
        <p className="fl-sub">What are we building today?</p>

        {/* Prompt card → becomes the onboarding chat in the same tab */}
        <div className="fl-prompt-card">
          {!chat ? (
            <>
              <div className="fl-prompt-row">
                <textarea
                  className="fl-prompt"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Describe what you want to build…"
                  rows={2}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); start(); } }}
                />
                <button className="fl-send" onClick={start} disabled={!idea.trim()} aria-label="Send">
                  Send <Icon name="send" size={15} />
                </button>
              </div>

              {/* Hybrid brand intake — optional, only for rebuilds */}
              <div className="fl-brand">
                <button
                  type="button"
                  className={`fl-brand-toggle ${showBrand ? 'open' : ''}`}
                  onClick={() => setShowBrand((s) => !s)}
                  aria-expanded={showBrand}
                >
                  <Icon name={showBrand ? 'chevron-down' : 'chevron-right'} size={14} />
                  Rebuilding an existing brand or website? <span className="fl-brand-opt">optional</span>
                </button>
                {showBrand && (
                  <div className="fl-brand-body">
                    <p className="fl-brand-hint">Give us the live site and logo — we'll pull the real colours, copy and identity and redesign from them, instead of starting blank.</p>
                    <label className="fl-brand-field">
                      <span>Existing website URL</span>
                      <input
                        type="url"
                        className="fl-brand-input"
                        value={brandUrl}
                        onChange={(e) => setBrandUrl(e.target.value)}
                        placeholder="aluplex.com"
                        spellCheck={false}
                      />
                    </label>
                    <div className="fl-brand-field">
                      <span>Logo</span>
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickLogo} />
                      {!logoPreview ? (
                        <button type="button" className="button ghost sm" onClick={() => fileRef.current?.click()}>
                          <Icon name="upload" size={14} /> Upload logo
                        </button>
                      ) : (
                        <div className="fl-brand-logo">
                          <img src={logoPreview} alt="logo preview" />
                          <span className="fl-brand-logo-name">{logoFile?.name}</span>
                          <button type="button" className="button ghost sm" onClick={clearLogo}>Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="fl-chat-wrap">
              <div className="fl-chat" ref={chatRef}>
                {chat.messages.map((m, i) => {
                  if (m.role !== 'assistant') {
                    return <div key={i} className={`fl-bubble ${m.role}`}>{m.text}</div>
                  }
                  const isLast = i === chat.messages.length - 1
                  const showOptions = isLast && !chat.done && Array.isArray(m.options) && m.options.length > 0
                  return (
                    <div key={i} className="fl-question-card">
                      {m.n && m.total ? (
                        <div className="fl-question-meta">Question {m.n} of ~{m.total}</div>
                      ) : null}
                      <div className="fl-bubble assistant fl-question-text">{m.text}</div>
                      {m.helper ? <div className="fl-question-helper">{m.helper}</div> : null}
                      {showOptions && (
                        <div className="fl-question-options">
                          {m.options.map((opt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="fl-option-card"
                              disabled={chat.thinking}
                              onClick={() => {
                                if (chat.thinking) return
                                setChat((c) => ({
                                  ...c,
                                  messages: [...c.messages, { role: 'user', text: opt }],
                                  thinking: true,
                                }))
                                discoveryChat(chat.projectId, opt)
                                  .then((r) => applyDiscovery(chat.projectId, r))
                                  .catch((e) => {
                                    setError(e.message || 'Discovery failed');
                                    setChat((c) => ({ ...c, thinking: false }));
                                  })
                              }}
                            >
                              <span className="fl-option-num">{idx + 1}</span>
                              <span className="fl-option-label">{opt}</span>
                            </button>
                          ))}
                          <div className="fl-option-hint">Pick one, or type your own answer below</div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {chat.thinking && <div className="fl-bubble assistant fl-typing"><span /><span /><span /></div>}
              </div>
              {!chat.done && (
                <>
                  <div className="fl-prompt-row">
                    <textarea
                      className="fl-prompt"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your answer…"
                      rows={1}
                      disabled={chat.thinking}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); reply(); } }}
                    />
                    <button className="fl-send" onClick={reply} disabled={!answer.trim() || chat.thinking} aria-label="Send">
                      <Icon name="send" size={15} />
                    </button>
                  </div>
                  <button className="fl-skip" onClick={skip}>Skip → Build now</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* What kind of project? — pills (mirrors produsa.app) */}
        {!chat && (
          <div className="fl-kind">
            <div className="fl-kind-label">What kind of project?</div>
            <div className="fl-pills">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  className={`fl-pill ${type === t.value ? 'on' : ''} ${t.comingSoon ? 'soon' : ''}`}
                  onClick={() => !t.comingSoon && setType(t.value)}
                  disabled={t.comingSoon}
                  title={t.comingSoon ? 'Coming soon' : ''}
                  aria-disabled={t.comingSoon || undefined}
                >
                  <span className="fl-emoji">{t.emoji}</span> {t.label}
                  {t.comingSoon && <span className="fl-soon-tag">soon</span>}
                  {type === t.value && !t.comingSoon && <Icon name="check" size={13} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <div className="error-banner" style={{ maxWidth: 760, margin: '0 auto 18px' }}>{error}</div>}

      {/* Stats */}
      <div className="fl-stats">
        {[['total', 'TOTAL', 'var(--text)'], ['building', 'BUILDING', 'var(--amber)'], ['done', 'DONE', 'var(--brand-2)'], ['live', 'LIVE', 'var(--mint)']].map(([k, label, color]) => (
          <div key={k} className="fl-stat">
            <div className="fl-stat-n" style={{ color }}>{stats[k]}</div>
            <div className="fl-stat-l">{label}</div>
          </div>
        ))}
      </div>

      {credits != null && (
        <div className="fl-tokens">
          <div><strong>{Number(credits).toLocaleString()}</strong> <span className="muted">tokens remaining</span></div>
          <button className="button primary sm"><Icon name="zap" size={14} /> Top up</button>
        </div>
      )}

      {/* Tabs + task list */}
      <div className="fl-tabs">
        <button className={tab === 'recent' ? 'on' : ''} onClick={() => setTab('recent')}>Recent Tasks</button>
        <button className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>Live Apps</button>
      </div>
      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ margin: '0 auto 10px' }} /> Loading…</div>
      ) : visible.length === 0 ? (
        <div className="empty-state"><div className="empty-title">{tab === 'live' ? 'No live apps yet' : 'No projects yet'}</div>Describe an idea above to create your first build.</div>
      ) : (
        <div className="fl-tasklist">
          {visible.slice(0, 12).map((p) => (
            <div key={p.id} className="fl-taskrow" onClick={() => onOpenStudio(p.id)}>
              <span className="fl-taskid">#{p.id}</span>
              <span className="fl-taskname">{p.name || 'Untitled Project'}</span>
              <span className="fl-tasktime muted">{timeAgo(p.updated_at || p.created_at)}</span>
              <StatusPill p={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ p }) {
  if (/live|deployed/.test(p.stage || '')) return <span className="pill mint"><span className="dot" /> live</span>;
  if (/build|research|design|develop|instant|brief/.test(p.stage || '')) return <span className="pill amber"><span className="dot" /> building</span>;
  return <span className="pill neutral">{p.stage || 'draft'}</span>;
}
