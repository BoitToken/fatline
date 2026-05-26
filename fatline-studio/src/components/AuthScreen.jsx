import { useEffect, useRef, useState } from 'react';
import { login, register, googleLogin, GOOGLE_CLIENT_ID } from '../lib/api.js';
import brandMark from '../assets/produsa-mark.png';

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const googleRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') await register(email.trim(), password, name.trim());
      else await login(email.trim(), password);
      onAuthed();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  // Google Identity Services (best-effort: the V2 client id is bound to
  // produsa.dev/.app origins, so this may be blocked on other hosts).
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const id = 'gsi-script';
    const init = () => {
      if (!window.google || !googleRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (resp) => {
            setBusy(true);
            try {
              await googleLogin(resp.credential);
              onAuthed();
            } catch (err) {
              setError(err.message || 'Google sign-in failed');
            } finally {
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(googleRef.current, {
          theme: 'filled_black', size: 'large', width: 346, text: 'continue_with',
        });
      } catch {
        /* origin not allowed — silently hide */
      }
    };
    if (document.getElementById(id)) { init(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true; s.id = id; s.onload = init;
    document.head.appendChild(s);
  }, [onAuthed]);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="mark logo-mark"><img src={brandMark} alt="Produsa" /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Produsa Studio</div>
            <div className="muted" style={{ fontSize: 12 }}>Build a real app from a sentence</div>
          </div>
        </div>

        <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted" style={{ fontSize: 13 }}>
          {mode === 'signup' ? 'Start building in seconds.' : 'Sign in to your projects.'}
        </p>

        {error && <div className="error-banner" style={{ marginTop: 14 }}>{error}</div>}

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
            </label>
          )}
          <label>
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </label>
          <button className="button primary" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="auth-or">or</div>
        <div ref={googleRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 8 }} />

        <div className="auth-switch">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </div>
    </div>
  );
}
