import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getProject, chatHistory, sendChat, previewExists, previewManifest, previewUrl,
  getBuildStatus, buildProduction, deploy, deployStatus, listFiles, readFile,
} from '../lib/api.js';
import { joinProject, leaveProject, onEvents, disconnectSocket } from '../lib/socket.js';
import { Icon } from '../lib/icons.jsx';
import ChatPanel from '../panels/ChatPanel.jsx';
import PreviewPanel from '../panels/PreviewPanel.jsx';
import BuildPanel from '../panels/BuildPanel.jsx';

const PHASES = ['Briefing', 'Prototype', 'Refine', 'Production', 'Live'];

let _mid = 0;
const mkMsg = (role, content) => ({ id: `${role}-${Date.now()}-${_mid++}`, role, content });

export default function StudioShell({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [working, setWorking] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [version, setVersion] = useState(Date.now());
  const [device, setDevice] = useState('desktop');
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(null);
  const [status, setStatus] = useState(null);
  const [deployUrl, setDeployUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileBody, setFileBody] = useState('');
  const [building, setBuilding] = useState(false);
  const kicked = useRef(false);

  const url = useMemo(() => (previewReady ? previewUrl(projectId, version) : ''), [projectId, version, previewReady]);

  const pushEvent = useCallback((label, detail) => {
    setEvents((p) => [...p.slice(-60), { label, detail, ts: Date.now() }]);
  }, []);

  const reloadPreview = useCallback(() => setVersion(Date.now()), []);

  const loadManifest = useCallback(async () => {
    const m = await previewManifest(projectId);
    if (m?.pages?.length) {
      setPages(m.pages);
      setCurrentPage((c) => c || m.pages.find((p) => p.default)?.id || m.pages[0].id);
    }
  }, [projectId]);

  const markReady = useCallback(() => {
    setPreviewReady(true);
    setBuilding(false);
    setWorking(false);
    setVersion(Date.now());
    loadManifest();
  }, [loadManifest]);

  const refreshDeploy = useCallback(async () => {
    try {
      const d = await deployStatus(projectId);
      const u = d?.url || d?.deployed_url;
      if (u) setDeployUrl(u);
    } catch {}
  }, [projectId]);

  // initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getProject(projectId);
        if (!alive) return;
        setProject(p);
        if (p?.metadata?.deployed_url || p?.deployed_url) setDeployUrl(p.metadata?.deployed_url || p.deployed_url);
      } catch {}
      const hist = await chatHistory(projectId);
      if (alive && hist.length) {
        setMessages(hist.map((m) => mkMsg(m.role === 'assistant' ? 'assistant' : m.role, m.text || m.content || '')));
      }
      const exists = await previewExists(projectId);
      if (!alive) return;
      if (exists) markReady();
      else if (hist.length === 0 && !kicked.current) {
        // chat-first kickoff: turn the idea into a first prototype
        kicked.current = true;
        const idea = (project?.description) || '';
        kickoff(idea);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // socket events
  useEffect(() => {
    joinProject(projectId);
    const off = onEvents({
      'build:instant_started': () => { setBuilding(true); setWorking('Generating your prototype…'); pushEvent('Build started'); },
      'build:instant_step': (e) => pushEvent('Step', e?.label || e?.step),
      'build:instant_ready': () => { pushEvent('Prototype ready'); markReady(); },
      'build:instant_failed': (e) => { setBuilding(false); setWorking(false); pushEvent('Build failed', e?.message); },
      'project:prototype_ready': () => { pushEvent('Prototype ready'); markReady(); },
      'project:prototype_updated': () => { pushEvent('Prototype updated'); setWorking(false); setPreviewReady(true); setVersion(Date.now()); },
      'project:chat_reply': (e) => { if (e?.reply) setMessages((m) => [...m, mkMsg('assistant', e.reply)]); setWorking(false); },
      'project:task_updated': (e) => { pushEvent(e?.agent || e?.name || 'Task', e?.status); setStatus((s) => s); refreshStatus(); },
      'project:build_log': (e) => { if (e?.type !== 'stream' && e?.text) pushEvent(e?.agentName || 'Build', e.text); },
      'project:phase_complete': (e) => pushEvent('Phase complete', e?.phase),
      'project:build_complete': () => { pushEvent('Build complete'); refreshStatus(); reloadPreview(); },
      'project:deployed': (e) => { setDeployUrl(e?.url || ''); pushEvent('Deployed', e?.url); },
      'deploy:step': (e) => pushEvent('Deploy', e?.step),
      'project:deploy_complete': (e) => { if (e?.deployedUrl) setDeployUrl(e.deployedUrl); pushEvent('Deploy complete'); },
      'balance:recharge_required': () => { setMessages((m) => [...m, mkMsg('system', 'You are low on credits — top up to continue building.')]); },
    });
    return () => { off(); leaveProject(projectId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // unmount: drop socket
  useEffect(() => () => disconnectSocket(), []);

  const refreshStatus = useCallback(async () => {
    try { setStatus(await getBuildStatus(projectId)); } catch {}
  }, [projectId]);

  // polling fallback while building / until preview exists
  useEffect(() => {
    const iv = setInterval(async () => {
      if (!previewReady) {
        const exists = await previewExists(projectId);
        if (exists) markReady();
      }
      refreshStatus();
      refreshDeploy();
      try {
        const p = await getProject(projectId);
        setProject(p);
        if (/build|research|design|develop|instant/.test(p?.stage || '')) setBuilding(true);
      } catch {}
    }, 7000);
    return () => clearInterval(iv);
  }, [projectId, previewReady, markReady, refreshStatus, refreshDeploy]);

  // chat-first kickoff — uses the chat brain to generate the first prototype
  const kickoff = useCallback(async (idea) => {
    setBuilding(true);
    setWorking('Generating your prototype…');
    setMessages([mkMsg('user', idea), mkMsg('system', 'Fatline is building your first prototype…')]);
    try {
      const data = await sendChat(projectId, idea || 'Build the first version of this app.');
      if (data?.reply) setMessages((m) => [...m, mkMsg('assistant', data.reply)]);
    } catch (e) {
      setMessages((m) => [...m, mkMsg('system', e.message || 'Failed to start build')]);
      setWorking(false);
    }
  }, [projectId]);

  const onSend = useCallback(async (text) => {
    setMessages((m) => [...m, mkMsg('user', text)]);
    setSending(true);
    try {
      const data = await sendChat(projectId, text);
      if (data?.reply || data?.response) setMessages((m) => [...m, mkMsg('assistant', data.reply || data.response)]);
      if (data?.regenerating) setWorking('Updating the preview…');
      else if (data?.prototypeUpdated) reloadPreview();
    } catch (e) {
      setMessages((m) => [...m, mkMsg('system', e.message || 'Failed to send')]);
    } finally {
      setSending(false);
    }
  }, [projectId, reloadPreview]);

  const onBuildProduction = useCallback(async () => {
    setBusy(true);
    try { await buildProduction(projectId); pushEvent('Production build requested'); setMessages((m) => [...m, mkMsg('system', 'Production build started — running the full agent pipeline.')]); }
    catch (e) { setMessages((m) => [...m, mkMsg('system', e.message)]); }
    finally { setBusy(false); }
  }, [projectId, pushEvent]);

  const onDeploy = useCallback(async () => {
    setBusy(true);
    try { const r = await deploy(projectId); if (r?.url) setDeployUrl(r.url); pushEvent('Deploy started'); }
    catch (e) { setMessages((m) => [...m, mkMsg('system', e.message)]); }
    finally { setBusy(false); }
  }, [projectId, pushEvent]);

  const onReloadFiles = useCallback(async () => {
    const f = await listFiles(projectId);
    const list = Array.isArray(f) ? f : f?.files || [];
    setFiles(list.map((x) => (typeof x === 'string' ? x : x.path || x.name)).filter(Boolean));
  }, [projectId]);

  const onSelectFile = useCallback(async (f) => {
    setActiveFile(f);
    setFileBody('// loading…');
    setFileBody((await readFile(projectId, f)) || '// (empty)');
  }, [projectId]);

  const stage = project?.stage || '';
  let phaseIdx = 0;
  if (previewReady) phaseIdx = 2;
  if (/production|building/.test(stage)) phaseIdx = 3;
  if (deployUrl || /live|complete|deployed/.test(stage)) phaseIdx = 4;

  return (
    <div className="studio">
      <div className="studio-top">
        <div className="left">
          <button className="button ghost sm" onClick={onBack}><Icon name="arrowLeft" size={15} /> Projects</button>
          <h1>{project?.name || 'Untitled project'}</h1>
        </div>
        <div className="phasebar">
          {PHASES.map((p, i) => (
            <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span className="phase-sep" />}
              <span className={`phase ${i === phaseIdx ? 'active' : ''} ${i < phaseIdx ? 'done' : ''}`}>
                <span className="pdot" />{p}
              </span>
            </span>
          ))}
        </div>
        <div className="right">
          {deployUrl
            ? <a className="button primary sm" href={deployUrl} target="_blank" rel="noreferrer"><Icon name="globe" size={14} /> Live</a>
            : <span className="pill neutral">{stage || 'draft'}</span>}
        </div>
      </div>

      <div className="panels">
        <ChatPanel messages={messages} sending={sending} working={working} onSend={onSend} />
        <PreviewPanel
          url={url} building={building} ready={previewReady}
          device={device} setDevice={setDevice} onReload={reloadPreview}
          pages={pages} currentPage={currentPage} onSelectPage={setCurrentPage}
          displayUrl={`${project?.name ? project.name.toLowerCase().replace(/\s+/g, '-') : 'app'}.produsa.app`}
        />
        <BuildPanel
          project={project} status={status} events={events} deployUrl={deployUrl} busy={busy} phase={stage}
          files={files} activeFile={activeFile} fileBody={fileBody} onSelectFile={onSelectFile}
          onBuildProduction={onBuildProduction} onDeploy={onDeploy} onReloadFiles={onReloadFiles}
        />
      </div>
    </div>
  );
}
