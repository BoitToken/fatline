// Fatline Studio API client — talks to the live Produsa V2 backend.
// Contracts verified against Produsa-ai/backend/src/routes/*.js (2026-05-22).
// Token is stored under `af_token` (same key V2's own frontend uses) so a token
// minted here works interchangeably with produsa.app.

const DEFAULT_API_BASE = 'https://api.produsa.app';
export const GOOGLE_CLIENT_ID =
  '836230886355-odist15j1koc4lh0kh21c29df6haj01u.apps.googleusercontent.com';

export function getApiBase() {
  // Only honour an explicit api.produsa.app override; ignore stale/dead bases
  // (e.g. a leftover `https://api.produsa.dev` from the old build's Settings).
  const stored = localStorage.getItem('fatline_api_base');
  if (stored && /^https:\/\/api\.produsa\.app/.test(stored)) return stored;
  if (stored) localStorage.removeItem('fatline_api_base'); // clear stale value
  return DEFAULT_API_BASE;
}
export function setApiBase(base) {
  if (base) localStorage.setItem('fatline_api_base', base);
}

export function getToken() {
  return localStorage.getItem('af_token') || '';
}
export function setToken(token) {
  if (token) localStorage.setItem('af_token', token);
}
export function clearAuth() {
  localStorage.removeItem('af_token');
  localStorage.removeItem('user');
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}
export function setUser(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user));
}
export function isAuthed() {
  return !!getToken();
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
export { ApiError };

async function request(path, { method = 'GET', body, headers, raw, isForm } = {}) {
  const url = `${getApiBase()}${path}`;
  const opts = { method, headers: { ...authHeaders(), ...(headers || {}) } };
  if (body !== undefined) {
    if (isForm) {
      opts.body = body; // FormData — let browser set Content-Type
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new ApiError(`Network error reaching ${getApiBase()}`, 0, null);
  }
  if (raw) return res;
  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      (res.status === 401 ? 'Not authenticated' : `Request failed (${res.status})`);
    throw new ApiError(msg, res.status, data);
  }
  return data;
}

/* ---------------------------------- Auth ---------------------------------- */

export async function login(email, password) {
  const data = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  if (data?.token) setToken(data.token);
  if (data?.user) setUser(data.user);
  return data;
}

export async function register(email, password, name) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: { email, password, ...(name ? { name } : {}) },
  });
  if (data?.token) setToken(data.token);
  if (data?.user) setUser(data.user);
  return data;
}

export async function googleLogin(credential) {
  const data = await request('/api/auth/google', { method: 'POST', body: { credential } });
  if (data?.token) setToken(data.token);
  if (data?.user) setUser(data.user);
  return data;
}

export async function fetchMe() {
  return request('/api/users/me');
}

/* -------------------------------- Projects -------------------------------- */

export async function listProjects() {
  const data = await request('/api/projects');
  return data?.projects || [];
}

export async function getProject(projectId) {
  const data = await request(`/api/projects/${projectId}`);
  return data?.project || data;
}

// V2 requires { name, stage }. We seed an instant-pipeline project.
export async function createProject({ name, description, type = 'webapp' }) {
  const data = await request('/api/projects', {
    method: 'POST',
    body: {
      name,
      stage: 'discovery',
      description,
      type,
      metadata: { original_idea: description, app_type: type, source: 'fatline-studio' },
    },
  });
  return data?.project || data;
}

/* ------------------------------- Discovery -------------------------------- */
// Canonical conversational endpoint is /discovery/chat (questions/answers deprecated).

export async function discoveryChat(projectId, message, { skip = false } = {}) {
  return request(`/api/projects/${projectId}/discovery/chat`, {
    method: 'POST',
    body: skip ? { skip: true } : { message },
  });
}

export async function getDiscovery(projectId) {
  return request(`/api/projects/${projectId}/discovery`);
}

/* --------------------------------- Build ---------------------------------- */

export async function buildInstant(projectId, opts = {}) {
  return request(`/api/projects/${projectId}/build/instant`, { method: 'POST', body: opts });
}

export async function buildProduction(projectId, opts = {}) {
  return request(`/api/projects/${projectId}/build/production`, { method: 'POST', body: opts });
}

export async function getBuildStatus(projectId) {
  // public (no auth needed) — safe to poll.
  return request(`/api/projects/${projectId}/build/status`);
}

export async function getBuildEstimate(projectId) {
  return request(`/api/projects/${projectId}/build/estimate`);
}

export async function getStudio(projectId) {
  return request(`/api/projects/${projectId}/studio`);
}

export async function getBuildEvents(projectId, after = 0) {
  return request(`/api/projects/${projectId}/build-events?after=${after}`);
}

export async function approveResearch(projectId) {
  return request(`/api/projects/${projectId}/build/approve-research`, { method: 'POST' });
}

export async function retryDeploy(projectId) {
  return request(`/api/projects/${projectId}/build/retry-deploy`, { method: 'POST' });
}

/* --------------------------------- Deploy --------------------------------- */

export async function deployEstimate(projectId) {
  return request(`/api/projects/${projectId}/deploy/estimate`, { method: 'POST' });
}

export async function deploy(projectId) {
  return request(`/api/projects/${projectId}/deploy`, { method: 'POST', body: { approved: true } });
}

export async function deployStatus(projectId) {
  return request(`/api/projects/${projectId}/deploy/status`);
}

/* ---------------------------------- Chat ---------------------------------- */
// Project-scoped chat is the web-native "brain": runs the LLM server-side and
// emits socket events (project:chat_reply / project:prototype_updated). Returns
// { reply, prototypeUpdated?, regenerating? }.

export async function sendChat(projectId, message, files) {
  if (files && files.length) {
    const fd = new FormData();
    fd.append('message', message || 'See attached files');
    fd.append('projectId', String(projectId));
    files.forEach((f) => fd.append('files', f));
    return request(`/api/projects/${projectId}/chat`, { method: 'POST', body: fd, isForm: true });
  }
  return request(`/api/projects/${projectId}/chat`, {
    method: 'POST',
    body: { message, projectId },
  });
}

// chat/history returns a BARE array: [{ role, text, created_at }]
export async function chatHistory(projectId) {
  const res = await request(`/api/projects/${projectId}/chat/history`, { raw: true });
  if (!res.ok) return [];
  const arr = await res.json().catch(() => []);
  return Array.isArray(arr) ? arr : [];
}

/* -------------------------------- Preview --------------------------------- */
// Public, iframe-safe. ?v= cache-busts. Pages navigated via postMessage({page}).

export function previewUrl(projectId, version) {
  return `${getApiBase()}/api/projects/${projectId}/preview?v=${version || Date.now()}`;
}

export async function previewManifest(projectId) {
  const res = await request(`/api/projects/${projectId}/preview/manifest`, { raw: true });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

// Returns true if a real prototype shell exists (vs the "Building…" 202 placeholder).
export async function previewExists(projectId) {
  try {
    const res = await fetch(`${getApiBase()}/api/projects/${projectId}/preview?t=${Date.now()}`, {
      headers: { Range: 'bytes=0-400' },
    });
    if (res.status === 202) return false;
    const snippet = await res.text().catch(() => '');
    return /<!doctype html|<html/i.test(snippet);
  } catch {
    return false;
  }
}

/* -------------------------------- Billing --------------------------------- */

export async function getCredits() {
  try {
    const d = await request('/api/billing/credits');
    return d?.balance ?? d?.credits ?? d?.tokens ?? 0;
  } catch {
    return null;
  }
}

/* --------------------------------- Files ---------------------------------- */

export async function listFiles(projectId) {
  try {
    return await request(`/api/projects/${projectId}/files`);
  } catch {
    return null;
  }
}

export async function readFile(projectId, filePath) {
  const res = await request(`/api/projects/${projectId}/files/${encodeURIComponent(filePath)}`, {
    raw: true,
  });
  if (!res.ok) return '';
  return res.text();
}
