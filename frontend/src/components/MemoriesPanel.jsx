import React from 'react';

/**
 * "🧠 Memories used" citation chips — proves that the answer came from real,
 * retrieved Hindsight memories rather than the model making things up.
 */
export default function MemoriesPanel({ memories, retrieved }) {
  if (!memories || !memories.length) return null;

  return (
    <div
      style={{
        marginTop: '1.25rem',
        padding: '1rem',
        borderRadius: '0.75rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>🧠</span> Memories Used as Ground Truth ({memories.length}
          {typeof retrieved === 'number' ? ` of ${retrieved} retrieved` : ''})
        </div>
        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Hindsight Semantic Recall</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {memories.map((m, i) => (
          <div
            key={m.ref || m.id || i}
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '0.5rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '0.25rem',
                  background: '#dbeafe',
                  color: '#1e40af',
                }}
              >
                {m.ref}
              </span>
              {m.date && (
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
              {m.type && (
                <span style={{ fontSize: '0.7rem', padding: '0.05rem 0.35rem', borderRadius: '0.2rem', background: '#f1f5f9', color: '#475569' }}>
                  {m.type}
                </span>
              )}
            </div>

            {m.text && (
              <div style={{ color: '#0f172a', fontSize: '0.85rem', lineHeight: 1.45, marginBottom: '0.25rem' }}>
                {m.text}
              </div>
            )}

            {m.why && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                <span style={{ fontStyle: 'normal', color: '#3b82f6' }}>↳</span> {m.why}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
