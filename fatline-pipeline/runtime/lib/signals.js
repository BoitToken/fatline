// Pure Manifest-signal extractors — derive #77/#88/R10/#80/#84/#87 signals from
// generated HTML/source/env. No I/O, no deps → fully unit-testable. The
// LiveGenerator feeds real artifacts in; tests feed fixtures in.
import { FOOTER } from './rules.js';

// #77 — dead controls. Scan rendered HTML for interactive elements that go nowhere.
export function scanDeadControls(html = '') {
  const controls = [];
  let i = 0;
  // anchors
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = m[0];
    const href = (tag.match(/href\s*=\s*["']([^"']*)["']/i) || [])[1];
    const wired = !!href && href !== '#' && href.toLowerCase() !== 'javascript:void(0)';
    controls.push({ id: `a#${i++}`, kind: 'link', wired });
  }
  // buttons — match the whole element so attribute values containing '>'
  // (e.g. a JSX arrow handler `=>`) don't truncate the parse.
  for (const m of html.matchAll(/<button\b[\s\S]*?<\/button>/gi)) {
    const el = m[0];
    const label = el.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const hasHandler = /\bon[a-z]+\s*=/i.test(el) || /type\s*=\s*["']submit["']/i.test(el) || /formaction/i.test(el);
    const noop = /onclick\s*=\s*\{?\s*["']?\s*\(\s*\)\s*=>\s*\{\s*\}/i.test(el);
    const comingSoon = /coming soon|todo/.test(label);
    controls.push({ id: `button#${i++}`, kind: 'button', wired: hasHandler && !noop && !comingSoon });
  }
  // forms
  for (const m of html.matchAll(/<form\b[^>]*>/gi)) {
    const tag = m[0];
    const wired = /action\s*=\s*["'][^"'#]/i.test(tag) || /on(submit)\s*=/i.test(tag);
    controls.push({ id: `form#${i++}`, kind: 'form', wired });
  }
  return controls;
}

// #88 — stub/placeholder scan.
const STUB_MARKERS = ['TODO', 'FIXME', 'not implemented', 'Lorem ipsum', 'lorem ipsum', 'example@', 'coming soon', 'Component rendered in manifest build'];
export function scanStubs(text = '') {
  return STUB_MARKERS.filter((m) => text.includes(m));
}

// R10 — footer present and exact.
export function hasFooter(html = '') {
  return html.includes(FOOTER);
}

// #80 — env: which referenced keys are missing from .env.example.
export function extractEnvRefs(source = '') {
  const keys = new Set();
  for (const m of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) keys.add(m[1]);
  for (const m of source.matchAll(/import\.meta\.env\.([A-Z0-9_]+)/g)) keys.add(m[1]);
  return [...keys];
}
export function envExampleKeys(envExample = '') {
  return envExample.split('\n').map((l) => (l.match(/^\s*([A-Z0-9_]+)\s*=/) || [])[1]).filter(Boolean);
}
export function diffEnv(referenced, envExample) {
  const declared = new Set(envExampleKeys(envExample));
  const undeclared = referenced.filter((k) => !declared.has(k));
  return { declared: [...declared], undeclared, ok: undeclared.length === 0 };
}

// #84 — resilience markers (heuristic: presence of error boundary / 404 / 500 handling).
export function resilienceMarkers(source = '') {
  return {
    error_boundary: /ErrorBoundary|componentDidCatch|getDerivedStateFromError/.test(source),
    has_404: /404|NotFound/.test(source),
    has_500: /500|ServerError|InternalError/.test(source),
    errors_surfaced: /catch\s*\(|\.catch\(|onError|toast\.error|setError/.test(source),
  };
}

// #87 — bundle size in KB (gzip estimate ~= raw/3.2 if only raw known).
export function bundleKb(rawBytes, gzipBytes) {
  return Math.round((gzipBytes ?? rawBytes / 3.2) / 1024);
}

// Compose Manifest signals from a deployed artifact + repo files + backend metadata.
// Anything not derivable here must be supplied by `backendSignals` (build workers);
// what is still unknown stays absent → the Manifest treats it as not-passing (#B2).
export function deriveSignals({ liveHtml = '', source = '', envExample = '', bundleRawBytes = 0, bundleGzipBytes, acceptance = [], backendSignals = {} } = {}) {
  const refs = extractEnvRefs(source);
  return {
    controls: scanDeadControls(liveHtml),
    source_scan: { text: liveHtml + '\n' + source },
    perf: { bundle_kb_gz: bundleKb(bundleRawBytes, bundleGzipBytes), api_p95_ms: backendSignals.api_p95_ms ?? 9999, lighthouse: backendSignals.lighthouse ?? 0 },
    resilience: { ...resilienceMarkers(liveHtml + source), ...(backendSignals.resilience || {}) },
    acceptance: acceptance.map((c) => ({ criterion: c.criterion ?? c, test_passed: !!(c.test_passed ?? backendSignals.acceptance?.[c.criterion]) })),
    // these require backend cooperation; absent → fail-safe (capability honesty #B2)
    entities: backendSignals.entities || [],
    env: { referenced: refs, declared: envExampleKeys(envExample), provisioned: backendSignals.provisioned || [], fresh_boot: !!backendSignals.fresh_boot, health_ok: !!backendSignals.health_ok },
    smoke: backendSignals.smoke || { target: 'unknown', steps: [] },
    auth: backendSignals.auth || {},
    security: backendSignals.security || {},
    integrations: backendSignals.integrations || [],
    observability: backendSignals.observability || {},
    _footer_ok: hasFooter(liveHtml),
  };
}
