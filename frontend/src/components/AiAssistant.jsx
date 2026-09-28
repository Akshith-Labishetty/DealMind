import React, { useState } from 'react';
import { api } from '../api.js';
import ModeButtons from './ModeButtons.jsx';
import MemoriesPanel from './MemoriesPanel.jsx';
import { mdToHtml } from '../lib/markdown.js';

const pick = (data) => data?.memoriesUsed ?? data?.memories_used ?? [];

export default function AiAssistant({ dealId }) {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [meta, setMeta] = useState(null);
  const [memories, setMemories] = useState([]);
  const [useMemory, setUseMemory] = useState(true);
  const [compare, setCompare] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
      if (res.data.memoryWarning) setError('Memory Notice: ' + res.data.memoryWarning);
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

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <div
          className="card"
          style={{
            borderColor: '#fca5a5',
            background: '#fff1f2',
            color: '#b91c1c',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {loading && !compare && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🧠</div>
          <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
            Recalling memories & reasoning over deal graph…
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Hindsight semantic search → RRF ranker → Groq LLM synthesis
          </div>
        </div>
      )}

      {answer && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>DealMind Assistant Response</span>
              {meta && (
                <span style={{ padding: '0.15rem 0.5rem', borderRadius: '0.3rem', background: '#eff6ff', color: '#1e40af', fontWeight: 600 }}>
                  Mode: {meta.mode}
                </span>
              )}
            </div>

            <button
              onClick={handleCopy}
              className="btn btn-secondary btn-sm"
              title="Copy markdown answer"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>

          <div
            className="chat-bubble"
            style={{ border: 'none', padding: 0 }}
            dangerouslySetInnerHTML={{ __html: mdToHtml(answer) }}
          />

          {meta && (
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>Status: {meta.usedMemory ? '✅ Persistent Memory Active' : '⚪ Memory Disabled (Baseline)'}</span>
              {typeof meta.retrieved === 'number' && (
                <span>· {meta.retrieved} facts evaluated</span>
              )}
            </div>
          )}
        </div>
      )}

      <MemoriesPanel memories={memories} retrieved={meta?.retrieved} />

      {/* Side-by-Side Memory Proof Comparison */}
      {compare && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '0.75rem' }}>
            ⚖ Persistent Memory Comparison (A/B Test)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* With Memory */}
            <div
              className="card"
              style={{
                borderColor: '#bfdbfe',
                background: '#ffffff',
                boxShadow: '0 4px 16px rgba(37,99,235,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>✅</span> With Hindsight Persistent Memory
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                Grounded in specific historical conversations, unresolved objections, and commitments.
              </div>
              <div
                style={{
                  fontSize: '0.85rem',
                  lineHeight: 1.55,
                  color: '#334155',
                  whiteSpace: 'pre-wrap',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                {compare.with || '(empty)'}
              </div>
            </div>

            {/* Without Memory */}
            <div
              className="card"
              style={{
                borderColor: '#e2e8f0',
                background: '#fafafa',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>❌</span> Without Memory (Generic Chatbot)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                Generic sales advice with no context on stakeholders, pricing constraints, or past meetings.
              </div>
              <div
                style={{
                  fontSize: '0.85rem',
                  lineHeight: 1.55,
                  color: '#64748b',
                  whiteSpace: 'pre-wrap',
                  background: '#ffffff',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                {compare.without || '(empty)'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
