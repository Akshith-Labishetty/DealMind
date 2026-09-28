import React, { useState } from 'react';
import { api } from '../api.js';
import ModeButtons from './ModeButtons.jsx';
import MemoriesPanel from './MemoriesPanel.jsx';
import { mdToHtml } from '../lib/markdown.js';

/** The backend answers with `memoriesUsed` (and a `memories_used` alias). */
const pick = (data) => data?.memoriesUsed ?? data?.memories_used ?? [];

export default function AiAssistant({ dealId }) {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [meta, setMeta] = useState(null);
  const [memories, setMemories] = useState([]);
  const [useMemory, setUseMemory] = useState(true);
  const [compare, setCompare] = useState(null);
  const [error, setError] = useState('');

  const ask = async (question, mode, mem) => {
    if (!question?.trim()) return;
    setLoading(true);
    setError('');
    setCompare(null);
    try {
      const res = await api.post(`/deals/${dealId}/ask`, { question, mode, useMemory: mem });
      setAnswer(res.data.answer || '');
      setMemories(pick(res.data));
      setMeta({
        mode: res.data.mode,
        usedMemory: res.data.usedMemory,
        retrieved: res.data.memoriesRetrieved,
        warning: res.data.memoryWarning,
      });
      if (res.data.memoryWarning) setError('Memory: ' + res.data.memoryWarning);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const compareBoth = async (question, mode) => {
    if (!question?.trim()) return;
    setLoading(true);
    setError('');
    setAnswer('');
    setCompare({ with: '', without: '' });
    try {
      // allSettled: one failing side must not hide the other.
      const [a, b] = await Promise.allSettled([
        api.post(`/deals/${dealId}/ask`, { question, mode, useMemory: true }),
        api.post(`/deals/${dealId}/ask`, { question, mode, useMemory: false }),
      ]);
      const okValue = (r) => (r.status === 'fulfilled' ? r.value.data.answer || '' : '(request failed)');
      const withMem = okValue(a);
      const withoutMem = okValue(b);
      setCompare({ with: withMem, without: withoutMem });
      if (a.status === 'fulfilled') setMemories(pick(a.value.data));
      if (a.status === 'rejected' && b.status === 'rejected') setError('Both requests failed.');
    } catch {
      setError('Comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ModeButtons
        onAsk={ask}
        loading={loading}
        useMemory={useMemory}
        setUseMemory={setUseMemory}
        onCompare={compareBoth}
      />

      {error && (
        <div className="card" style={{ borderColor: '#fca5a5', color: '#b91c1c', marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      {answer && (
        <div className="card chat-bubble" dangerouslySetInnerHTML={{ __html: mdToHtml(answer) }} />
      )}

      {meta && !compare && (
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem' }}>
          mode: <strong>{meta.mode}</strong> · {meta.usedMemory ? `memory on · ${meta.retrieved ?? 0} recalled` : 'memory off (baseline answer)'}
        </div>
      )}

      <MemoriesPanel memories={memories} retrieved={meta?.retrieved} />

      {compare && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>✅ With memory</div>
            <div className="chat-bubble" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
              {compare.with || '(empty)'}
            </div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: '0.3rem', color: '#94a3b8' }}>❌ Without memory</div>
            <div className="chat-bubble" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
              {compare.without || '(empty)'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
