import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';

const TABS = [
  ['activity', 'Activity', 'activity'],
  ['agents', 'Agents', 'layers'],
  ['code', 'Code', 'code'],
  ['deploy', 'Deploy', 'rocket'],
];

// The V2.5 instant pipeline emits granular `build:instant_step` events keyed by a
// stable `step` field (research / features / architecture / ux / building / audit /
// saving / retry / …). Collapse those ~15 raw keys into an ordered, human-readable
// stage model so the Agents tab shows real progress during an *instant* build — not
// just during a production build (which is the only thing it used to surface).
const INSTANT_STAGES = [
  ['research', 'Research & brand', 'globe'],
  ['features', 'Features & copy', 'zap'],
  ['architecture', 'Architecture', 'layers'],
  ['ux', 'Design & visuals', 'sparkles'],
  ['building', 'Building pages', 'code'],
  ['audit', 'Quality audit', 'check'],
  ['saving', 'Finalizing', 'rocket'],
];
const STAGE_ORDER = INSTANT_STAGES.map((s) => s[0]);

// Map a raw instant-pipeline step key onto a canonical stage. Exported so
// StudioShell can keep the live `stageKey` in lockstep with these stages.
export function stageKeyForStep(step) {
  if (!step) return null;
  if (/^architecture|^integrations/.test(step)) return 'architecture';
  if (/^audit|^self_verify|^visual_audit|^validating/.test(step)) return 'audit';
  if (/^saving|^retry|^fixing|^patching|^degraded/.test(step)) return 'saving';
  if (/^research/.test(step)) return 'research';
  if (/^features/.test(step)) return 'features';
  if (/^ux/.test(step)) return 'ux';
  if (/^building/.test(step)) return 'building';
  return null;
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function BuildPanel({
  project, status, events, deployUrl, busy, phase,
  files, activeFile, fileBody, onSelectFile,
  onBuildProduction, onDeploy, onReloadFiles,
  building, previewReady, pct, stageKey,
}) {
  const [tab, setTab] = useState('activity');
  const summary = status?.summary || {};
  const total = summary.total || summary.totalTasks || 0;
  const done = summary.done || summary.completedTasks || 0;
  const prodPct = total ? Math.round((done / total) * 100) : (project?.progress || 0);
  const tasks = status?.tasks || [];

  // Instant-build stage state, derived from the live stageKey + pct.
  const currentIdx = stageKey ? STAGE_ORDER.indexOf(stageKey) : -1;
  const settled = previewReady && !building;            // build finished / prototype already exists
  const currentStageLabel = currentIdx >= 0 ? INSTANT_STAGES[currentIdx][1] : null;
  const displayPct = building ? Math.max(pct ?? 0, prodPct) : (previewReady ? 100 : prodPct);
  const showBar = building || total > 0 || previewReady;
  const showInstantStages = tasks.length === 0 && (building || currentIdx >= 0 || settled);

  const stageStatus = (i) => {
    if (settled) return 'done';
    if (currentIdx < 0) return 'pending';
    if (i < currentIdx) return 'done';
    if (i === currentIdx) return building ? 'active' : 'done';
    return 'pending';
  };

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
              <div className="statcard">
                <div className="v">{building && currentStageLabel ? currentStageLabel : (phase || project?.stage || 'draft')}</div>
                <div className="l">{building ? 'Building' : 'Stage'}</div>
              </div>
              <div className="statcard"><div className="v">{displayPct}%</div><div className="l">Progress</div></div>
            </div>
            {showBar && <div className="progress"><div style={{ width: `${displayPct}%` }} /></div>}
            {events.length === 0 ? (
              <div className="empty-state">{building ? 'Starting the build…' : 'Build activity will stream here.'}</div>
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
            {tasks.length > 0 ? (
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
            ) : showInstantStages ? (
              INSTANT_STAGES.map(([key, label, ic], i) => {
                const st = stageStatus(i);
                return (
                  <div key={key} className="agent-row">
                    <Icon name={st === 'done' ? 'check' : st === 'active' ? 'zap' : ic} size={15} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{label}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{st === 'active' ? 'Working…' : st === 'done' ? 'Done' : 'Queued'}</div>
                    </div>
                    <span className={`pill badge-state ${st === 'done' ? 'mint' : st === 'active' ? 'amber' : 'neutral'}`}>{st}</span>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">Agent activity appears here while your prototype is being built.</div>
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
              <div className="empty-state">{building ? 'Files appear as the prototype is generated.' : 'Files appear once the prototype is generated.'}</div>
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
