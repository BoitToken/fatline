// Socket.IO client for live build/deploy events from the V2 backend.
// Verified: io(origin, { path:'/socket.io' }); emit 'studio:join' with projectId;
// listen to project:* and build:* events (see Produsa-ai/backend/src/server.js).
import { io } from 'socket.io-client';
import { getApiBase, getToken } from './api.js';

let socket = null;
let joined = null;

export function getSocket() {
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = io(getApiBase(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      // token is optional on V2; include it so user-scoped events (balance) route.
      auth: { token: getToken() || undefined },
      reconnection: true,
      reconnectionDelay: 1200,
    });
  }
  return socket;
}

export function joinProject(projectId) {
  const s = getSocket();
  const doJoin = () => {
    s.emit('studio:join', projectId);
    s.emit('join', `project:${projectId}`); // defensive (V2 frontend does both)
    joined = projectId;
  };
  if (s.connected) doJoin();
  else s.once('connect', doJoin);
  return s;
}

export function leaveProject(projectId) {
  if (socket && projectId) socket.emit('studio:leave', projectId);
  if (joined === projectId) joined = null;
}

// Subscribe to a set of events; returns an unsubscribe fn.
export function onEvents(handlers) {
  const s = getSocket();
  const entries = Object.entries(handlers);
  entries.forEach(([ev, fn]) => s.on(ev, fn));
  return () => entries.forEach(([ev, fn]) => s.off(ev, fn));
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    joined = null;
  }
}

// The events the studio cares about, grouped for convenience.
export const BUILD_EVENTS = [
  'project:task_updated',
  'project:phase_complete',
  'project:phase_failed',
  'project:build_complete',
  'project:build_failed',
  'project:build_log',
  'project:prototype_ready',
  'project:prototype_updated',
  'project:updated',
  'project:chat_reply',
  'project:research_gate',
  'project:gate_required',
  'build:instant_started',
  'build:instant_step',
  'build:instant_ready',
  'build:instant_failed',
  'build:review_ready',
  'project:deploy_started',
  'deploy:step',
  'project:deployed',
  'project:deploy_complete',
  'project:deploy_failed',
  'balance:recharge_required',
];
