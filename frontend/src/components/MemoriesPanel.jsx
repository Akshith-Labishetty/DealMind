import React from 'react';

/**
 * "🧠 Memories used" chips — the proof that the answer came from real,
 * retrieved Hindsight memories rather than the model making things up.
 */
export default function MemoriesPanel({ memories, retrieved }) {
  if (!memories || !memories.length) return null;
  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
        🧠 Memories used ({memories.length}
        {typeof retrieved === 'number' ? ` of ${retrieved} retrieved` : ''})
      </div>
      <div>
        {memories.map((m, i) => (
          <div key={m.ref || m.id || i} className="memory-chip" style={{ maxWidth: '100%' }}>
            <strong>{m.ref}</strong>{' '}
            {m.date ? new Date(m.date).toLocaleDateString() : ''}{m.type ? ` · ${m.type}` : ''}
            {m.text ? <div style={{ color: '#334155', fontStyle: 'normal', marginTop: '0.15rem' }}>{m.text}</div> : null}
            <div className="why">{m.why}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
