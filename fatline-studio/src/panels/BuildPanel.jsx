import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';

const TABS = [
  ['activity', 'Activity', 'activity'],
  ['agents', 'Agents', 'layers'],
  ['code', 'Code', 'code'],
  ['deploy', 'Deploy', 'rocket'],
];

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function BuildPanel({
  project, status, events, deployUrl, busy, phase,
  files, activeFile, fileBody, onSelectFile,
  onBuildProduction, onDeploy, onReloadFiles,
}) {
  const [tab, setTab] = useState('activity');
  const summary = status?.summary || {};
  const total = summary.total || summary.totalTasks || 0;
  const done = summary.done || summary.completedTasks || 0;
  const pct = total ? Math.round((done / total) * 100) : (project?.progress || 0);
  const tasks = status?.tasks || [];

  return (
    <div className="panel build">
      <div className="tabs">
        {TABS.map(([id, label, ic]) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <Icon name={ic} size={14} style={{ verticalAlign: -2, marginRight: 5 }} />{label}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {tab === 'activity' && (
          <>
            <div className="stat-grid">
              <div className="statcard"><div className="v">{phase || project?.stage || 'draft'}</div><div className="l">Stage</div></div>
              <div className="statcard"><div className="v">{pct}%</div><div className="l">Progress</div></div>
            </div>
            {total > 0 && <div className="progress"><div style={{ width: `${pct}%` }} /></div>}
            {events.length === 0 ? (
              <div className="empty-state">Build events will stream here.</div>
            ) : (
              events.slice().reverse().map((e, i) => (
                <div key={i} className="activity-item">
                  <div className="top"><span className="lbl">{e.label}</span><span className="ts">{fmtTime(e.ts)}</span></div>
                  {e.detail && <div className="det">{e.detail}</div>}
                </div>
              ))
            )}
          </>
        )}

        {tab === 'agents' && (
          <>
            {tasks.length === 0 ? (
              <div className="empty-state">Agent activity appears during a production build.</div>
            ) : (
              tasks.map((t, i) => (
                <div key={i} className="agent-row">
                  <Icon name={t.status === 'done' ? 'check' : t.status === 'failed' ? 'x' : 'zap'} size={15} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.agent || t.agent_name || t.task_name || t.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{t.phase}</div>
                  </div>
                  <span className={`pill badge-state ${t.status === 'done' ? 'mint' : t.status === 'failed' ? 'danger' : 'amber'}`}>{t.status}</span>
                </div>
              ))
            )}
          </>
        )}

        {tab === 'code' && (
          <>
            <div className="panel-head" style={{ padding: '0 0 10px', borderBottom: '1px solid var(--border)' }}>
              <span className="muted" style={{ fontSize: 12 }}>{files?.length ? `${files.length} files` : 'Source files'}</span>
              <button className="button ghost sm" onClick={onReloadFiles}><Icon name="refresh" size={13} /></button>
            </div>
            {!files?.length ? (
              <div className="empty-state">Files appear once the prototype is generated.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <div className="code-tree">
                  {files.map((f) => (
                    <div key={f} className={`code-file ${activeFile === f ? 'active' : ''}`} onClick={() => onSelectFile(f)}>{f}</div>
                  ))}
                </div>
                {activeFile && <pre className="code-view">{fileBody || '// loading…'}</pre>}
              </div>
            )}
          </>
        )}

        {tab === 'deploy' && (
          <>
            <div className="kv"><span className="k">Stage</span><span>{project?.stage || '—'}</span></div>
            <div className="kv"><span className="k">Live URL</span><span>{deployUrl ? <a href={deployUrl} target="_blank" rel="noreferrer" className="accent">open ↗</a> : '—'}</span></div>
            <div className="kv"><span className="k">Subdomain</span><span>{project?.subdomain || project?.metadata?.subdomain || '—'}</span></div>
            <p className="muted" style={{ fontSize: 12.5, margin: '14px 0' }}>
              Ship a production build to a real <code>*.produsa.app</code> URL. Production runs the full agent pipeline and costs credits.
            </p>
            <div className="btn-stack">
              <button className="button primary" onClick={onBuildProduction} disabled={busy}>
                <Icon name="layers" size={15} /> Build production version
              </button>
              <button className="button ghost" onClick={onDeploy} disabled={busy}>
                <Icon name="rocket" size={15} /> Deploy live
              </button>
              {deployUrl && (
                <a className="button ghost" href={deployUrl} target="_blank" rel="noreferrer"><Icon name="external" size={15} /> Open live site</a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
