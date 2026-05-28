import { useRef } from 'react';
import { Icon } from '../lib/icons.jsx';

const DEVICES = [
  ['desktop', 'monitor'],
  ['tablet', 'tablet'],
  ['mobile', 'smartphone'],
];

// Heartbeat stage → human label/emoji for the live "building" overlay. Keys match
// the canonical instant-build stages emitted by the heartbeat hook (A1 contract).
const STAGE_EMOJI = {
  research: '🔍', features: '✨', architecture: '🏗',
  ux: '🎨', building: '🧱', audit: '✅', saving: '🚀',
};
const STAGE_LABEL = {
  research: 'Researching brand + category…',
  features: 'Drafting features + copy…',
  architecture: 'Wiring the architecture…',
  ux: 'Picking palette + type scale…',
  building: 'Building the pages…',
  audit: 'Running quality audit…',
  saving: 'Finalizing prototype…',
};

export default function PreviewPanel({
  url, building, ready, device, setDevice, onReload,
  pages, currentPage, onSelectPage, displayUrl, heartbeat,
}) {
  const iframeRef = useRef(null);

  const navigate = (pid) => {
    onSelectPage(pid);
    const f = iframeRef.current;
    if (f && f.contentWindow) {
      try { f.contentWindow.postMessage({ page: pid }, '*'); } catch {}
    }
  };

  return (
    <div className="panel preview">
      <div className="preview-bar">
        <div className="addr">
          <Icon name="globe" size={14} />
          <span className="u">{displayUrl || url || 'preview'}</span>
        </div>
        <div className="devices">
          {DEVICES.map(([d, ic]) => (
            <button key={d} className={device === d ? 'active' : ''} onClick={() => setDevice(d)} title={d}>
              <Icon name={ic} size={16} />
            </button>
          ))}
        </div>
        <button className="button icon ghost" title="Reload" onClick={onReload}><Icon name="refresh" size={16} /></button>
        {url && <a className="button icon ghost" title="Open in new tab" href={url} target="_blank" rel="noreferrer"><Icon name="external" size={16} /></a>}
      </div>

      <div className="preview-stage">
        {ready && url ? (
          <div className={`frame-wrap ${device}`}>
            <iframe
              ref={iframeRef}
              title="preview"
              src={url}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          </div>
        ) : (
          <div className="empty-preview">
            {building ? (
              <>
                <div className="spinner" style={{ margin: '0 auto 14px' }} />
                <div className="empty-title">
                  {heartbeat?.stageIndex >= 0
                    ? `${STAGE_EMOJI[heartbeat.stageKey] || '🛠'} ${STAGE_LABEL[heartbeat.stageKey] || 'Building…'}`
                    : 'Building your prototype…'}
                </div>
                <p className="muted">
                  {heartbeat?.elapsedLabel ? `${heartbeat.elapsedLabel} elapsed` : 'The probots are generating your pages.'}
                  {heartbeat?.etaLabel ? ` · ${heartbeat.etaLabel}` : ''}
                </p>
              </>
            ) : (
              <>
                <div className="empty-title">No preview yet</div>
                <p className="muted">Send a message in chat to generate your first prototype.</p>
              </>
            )}
          </div>
        )}
      </div>

      {ready && pages?.length > 1 && (
        <div className="pages-strip">
          {pages.map((p) => (
            <button
              key={p.id}
              className={`page-tab ${currentPage === p.id ? 'active' : ''}`}
              onClick={() => navigate(p.id)}
            >
              {p.title || p.id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
