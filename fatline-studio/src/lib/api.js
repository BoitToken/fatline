const DEFAULT_API_BASE = 'https://api.produsa.dev'

export function getStoredAuth() {
  return {
    apiBase: localStorage.getItem('fatline_api_base') || DEFAULT_API_BASE,
    token: localStorage.getItem('fatline_token') || localStorage.getItem('af_token') || '',
  }
}

export function setStoredAuth({ apiBase, token }) {
  if (apiBase) localStorage.setItem('fatline_api_base', apiBase)
  if (token) localStorage.setItem('fatline_token', token)
}

export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function apiFetch(path, opts = {}) {
  const { apiBase, token } = getStoredAuth()
  const url = `${apiBase}${path}`
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...authHeaders(token),
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let errMsg = `Request failed (${res.status})`
    try {
      const json = JSON.parse(text)
      errMsg = json.error || json.message || errMsg
    } catch {}
    throw new Error(errMsg)
  }
  return res.json().catch(() => ({}))
}

export async function createProject({ name, description, type }) {
  return apiFetch('/api/projects', {
    method: 'POST',
    body: JSON.stringify({
      name,
      stage: 'research',
      description,
      type: type || 'webapp',
      metadata: { original_idea: description, app_type: type || 'webapp' },
    }),
  })
}

export async function listProjects() {
  return apiFetch('/api/projects')
}

export async function getProjectStatus(projectId) {
  return apiFetch(`/api/projects/${projectId}`)
}

export async function fetchDiscoveryQuestions(projectId) {
  return apiFetch(`/api/projects/${projectId}/discovery/questions`, { method: 'POST' })
}

export async function sendDiscoveryChat(projectId, message) {
  return apiFetch(`/api/projects/${projectId}/discovery/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export async function skipDiscovery(projectId) {
  return apiFetch(`/api/projects/${projectId}/discovery/chat`, {
    method: 'POST',
    body: JSON.stringify({ skip: true }),
  })
}

export async function triggerInstantBuild(projectId) {
  return apiFetch(`/api/projects/${projectId}/build/instant`, {
    method: 'POST',
    body: JSON.stringify({ type: 'instant' }),
  })
}

export async function triggerProductionBuild(projectId) {
  return apiFetch(`/api/projects/${projectId}/build/production`, {
    method: 'POST',
    body: JSON.stringify({ type: 'production' }),
  })
}

export async function triggerDeploy(projectId) {
  // Deploy is usually part of production build finalize.
  // retry-deploy attempts to re-run the deploy step if it failed.
  return apiFetch(`/api/projects/${projectId}/build/retry-deploy`, {
    method: 'POST',
  })
}

export async function fetchMessages(projectId) {
  return apiFetch(`/api/projects/${projectId}/chat/history`)
}

export async function sendChatMessage(projectId, message) {
  return apiFetch(`/api/projects/${projectId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, projectId }),
  })
}
