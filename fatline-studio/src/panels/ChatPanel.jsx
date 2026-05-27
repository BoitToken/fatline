import { useEffect, useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';

const QUICK = [
  'Make the hero bolder and the CTA clearer',
  'Add a pricing section with three tiers',
  'Make it feel more premium and calm',
  'Add customer testimonials',
];

export default function ChatPanel({ messages, sending, working, onSend, mode = 'review', disco = null }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, working]);

  const submit = (e) => {
    e?.preventDefault();
    const v = text.trim();
    if (!v || sending) return;
    setText('');
    onSend(v);
  };

  return (
    <div className="panel chat">
      <div className="panel-head">
        <div className="t"><Icon name="sparkles" size={15} style={{ verticalAlign: -2, marginRight: 6 }} />{mode === 'discovery' ? 'Onboarding' : 'Produsa Chat'}</div>
        <span className="pill neutral">{mode === 'discovery' ? (disco ? `Question ${disco.n} of ~${disco.total}` : 'A few quick questions') : 'Opus build agent'}</span>
      </div>

      <div className="chat-log">
        {messages.length === 0 && !working && (
          <div className="empty-state">
            <div className="empty-title">Describe a change</div>
            Tell the builder what to create or refine. It updates the live preview as it works.
          </div>
        )}
        {messages.map((m, idx) => {
          const isLast = idx === messages.length - 1;
          const isAsst = m.role === 'assistant';
          // CEO mandate 2026-05-28 (Item 3 + 6): render assistant questions as
          // rich multiple-choice cards when the backend returns options. Clicking
          // a chip auto-sends that option as the answer.
          const showOptions = isAsst && isLast && !sending && !working && mode === 'discovery'
            && Array.isArray(m.options) && m.options.length > 0;
          return (
            <div key={m.id} className={`msg ${m.role}`}>
              <div className="who">{m.role === 'user' ? 'You' : m.role === 'system' ? 'Build' : 'Produsa'}</div>
              {isAsst && m.n && m.total ? (
                <div className="q-meta muted" style={{ fontSize: 11, marginBottom: 4 }}>Question {m.n} of ~{m.total}</div>
              ) : null}
              <div className="body">{m.content}</div>
              {isAsst && m.helper ? (
                <div className="q-helper muted" style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>{m.helper}</div>
              ) : null}
              {showOptions && (
                <div className="q-options">
                  {m.options.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      className="q-option-card"
                      disabled={sending}
                      onClick={() => { if (!sending) onSend(opt); }}
                    >
                      <span className="q-option-num">{i + 1}</span>
                      <span className="q-option-label">{opt}</span>
                    </button>
                  ))}
                  <div className="q-option-hint muted" style={{ fontSize: 11, marginTop: 4 }}>Pick one, or type your own answer below</div>
                </div>
              )}
            </div>
          );
        })}
        {working && (
          <div className="msg assistant">
            <div className="who">Produsa</div>
            <div className="body working">
              <span className="typing-dots"><span></span><span></span><span></span></span>
              <span className="muted">{typeof working === 'string' ? working : 'Working on it…'}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {mode !== 'discovery' && messages.length <= 2 && (
        <div className="quick-prompts">
          {QUICK.map((q) => <button key={q} className="chip" onClick={() => setText(q)}>{q}</button>)}
        </div>
      )}

      <form className="composer" onSubmit={submit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'discovery' ? "Type your answer… (or 'skip' to build now)" : 'Tell the builder what to change…'}
          rows={2}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
        />
        <div className="actions">
          <span className="muted" style={{ fontSize: 12 }}>Enter to send · Shift+Enter for newline</span>
          <button className="button primary sm" type="submit" disabled={sending || !text.trim()}>
            <Icon name="send" size={14} /> {sending ? 'Sending' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
