import { useEffect, useState } from 'react';
import { isAuthed, setToken, fetchMe, setUser } from './lib/api.js';
import AuthScreen from './components/AuthScreen.jsx';
import Dashboard from './views/Dashboard.jsx';
import StudioShell from './views/StudioShell.jsx';

export default function App() {
  const [authed, setAuthed] = useState(isAuthed());
  const [booting, setBooting] = useState(true);
  const [route, setRoute] = useState({ view: 'dashboard', projectId: null });

  // Handle OAuth redirect callbacks (?token=...&error=...) and deep links (#/studio/:id).
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token') || url.searchParams.get('jwt');
    if (token) {
      setToken(token);
      setAuthed(true);
      url.searchParams.delete('token');
      url.searchParams.delete('jwt');
      window.history.replaceState({}, '', url.pathname + url.hash);
    }
    const m = window.location.hash.match(/studio\/(\d+)/);
    if (m) setRoute({ view: 'studio', projectId: Number(m[1]) });
    setBooting(false);
  }, []);

  // Hydrate the cached user once authed.
  useEffect(() => {
    if (!authed) return;
    fetchMe().then((u) => u && setUser(u)).catch(() => {});
  }, [authed]);

  const openStudio = (projectId) => {
    setRoute({ view: 'studio', projectId });
    window.history.replaceState({}, '', `#/studio/${projectId}`);
  };
  const goDashboard = () => {
    setRoute({ view: 'dashboard', projectId: null });
    window.history.replaceState({}, '', '#/');
  };

  if (booting) {
    return <div className="auth-wrap"><div className="spinner" /></div>;
  }
  if (!authed) {
    return <AuthScreen onAuthed={() => setAuthed(true)} />;
  }
  if (route.view === 'studio' && route.projectId) {
    return <StudioShell projectId={route.projectId} onBack={goDashboard} onLogout={() => setAuthed(false)} />;
  }
  return <Dashboard onOpenStudio={openStudio} onLogout={() => setAuthed(false)} />;
}
