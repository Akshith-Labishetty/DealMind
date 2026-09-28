import React, { useState } from 'react';
import { api, errMsg } from '../api.js';
import ModeButtons from './ModeButtons.jsx';
import MemoriesPanel from './MemoriesPanel.jsx';
import { mdToHtml } from '../lib/markdown.js';

const pick = (data) => data?.memoriesUsed ?? data?.memories_used ?? [];

export default function ChatWidget({ dealId }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('strategy');
  const [useMemory, setUseMemory] = useState(true);
  const [memories, setMemories] = useState([]);
  const [retrieved, setRetrieved] = useState(0);
  const [error, setError] = useState('');

  const ask = async (question, chosenMode = mode, mem = useMemory) => {
    const text = String(question ?? '').trim();
    if (!text || !dealId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/deals/${dealId}/ask`, {
        question: text,
        mode: chosenMode,
        useMemory: mem,
      });
      setAnswer(res.data.answer || '');
      setMemories(pick(res.data));
      setRetrieved(res.data.memoriesRetrieved || 0);
      setMode(res.data.mode || chosenMode);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  // Free text → send mode as null so the backend detects it (greetings,
  // off-topic questions, and the preset heuristics all live server-side).
  const send = () => ask(q, null, useMemory);

  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open DealMind chat"
          style={{
            width: 56, height: 56, borderRadius: '50%', background: '#2563eb', color: '#fff',
            border: 'none', fontSize: '1.5rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,.3)',
          }}
        >
          💬
        </button>
      ) : (
        <div style={{ width: 420, maxHeight: 560, background: '#fff', borderRadius: '0.75rem', boxShadow: '0 8px 32px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: '#1e293b', color: '#fff', padding: '0.75rem 1rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            <span>DealMind Chat</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {answer && (
              <div className="card chat-bubble" dangerouslySetInnerHTML={{ __html: mdToHtml(answer) }} style={{ marginBottom: '0.75rem' }} />
            )}
            {error && <div style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</div>}
            <MemoriesPanel memories={memories} retrieved={retrieved} />
            {!answer && !error && !loading && (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Ask about this deal — tap a preset below, or type your own question.
              </div>
            )}
            {loading && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Thinking…</div>}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', padding: '0.75rem' }}>
            <ModeButtons
              compact
              showInput={false}
              onAsk={ask}
              loading={loading}
              useMemory={useMemory}
              setUseMemory={setUseMemory}
            />
            <textarea
              rows={2}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type your question… Enter to send"
              style={{
                width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1',
                borderRadius: '0.375rem', fontSize: '0.85rem', resize: 'none',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button
              className="btn btn-primary"
              onClick={send}
              disabled={loading || !q.trim()}
              style={{ marginTop: '0.4rem', width: '100%' }}
            >
              {loading ? 'Thinking…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
