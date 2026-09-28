import React, { useState } from 'react';

const MODES = [
  { id: 'brief', label: 'Meeting Brief', icon: '📋', q: 'Give me a complete briefing for my next meeting.' },
  { id: 'objections', label: 'Objections', icon: '🛡️', q: "What are this customer's biggest concerns?" },
  { id: 'strategy', label: 'Strategy', icon: '🎯', q: 'How should I prepare for my next meeting?' },
  { id: 'history', label: 'History', icon: '📜', q: 'What happened in our previous meetings?' },
  { id: 'followup', label: 'Follow-up Email', icon: '✉️', q: 'Draft a follow-up email.' },
  { id: 'risk', label: 'Deal Risk', icon: '⚠️', q: 'Is this deal at risk and why?' },
];

export default function ModeButtons({
  onAsk,
  loading,
  useMemory,
  setUseMemory,
  onCompare,
  showInput = true,
  compact = false,
}) {
  const [mode, setMode] = useState('brief');
  const [q, setQ] = useState(MODES[0].q);

  const pickPreset = (m) => {
    if (!showInput) {
      onAsk?.(m.q, m.id, useMemory);
      return;
    }
    setMode(m.id);
    setQ(m.q);
  };

  const run = () => {
    const preset = MODES.find((m) => m.id === mode);
    const isPresetText = Boolean(preset) && q === preset.q;
    onAsk?.(q, isPresetText ? mode : null, useMemory);
  };

  return (
    <div
      className={compact ? '' : 'card'}
      style={compact ? {} : { marginBottom: '1.25rem', background: '#ffffff', border: '1px solid #e2e8f0' }}
    >
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span>⚡</span> Intelligent Copilot Queries
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Select a preset or ask freeform</span>
        </div>
      )}

      {/* Preset Pill Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
        {MODES.map((m) => {
          const isSelected = showInput && mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => pickPreset(m)}
              disabled={loading}
              title={showInput ? undefined : m.q}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: compact ? '0.25rem 0.55rem' : '0.35rem 0.75rem',
                borderRadius: '0.5rem',
                fontSize: compact ? '0.75rem' : '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: isSelected ? '#eff6ff' : '#f8fafc',
                color: isSelected ? '#1d4ed8' : '#334155',
                boxShadow: isSelected ? '0 1px 3px rgba(37,99,235,0.15)' : 'none',
              }}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {showInput && (
        <textarea
          rows={2}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask DealMind anything about requirements, history, or strategy..."
          style={{
            marginBottom: '0.75rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '0.5rem',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem',
            lineHeight: 1.4,
          }}
        />
      )}

      {/* Bottom Action Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.825rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: useMemory ? '#1d4ed8' : '#64748b',
            background: useMemory ? '#eff6ff' : '#f1f5f9',
            padding: '0.3rem 0.65rem',
            borderRadius: '0.4rem',
            border: `1px solid ${useMemory ? '#bfdbfe' : '#e2e8f0'}`,
            userSelect: 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="checkbox"
            checked={useMemory}
            onChange={(e) => setUseMemory?.(e.target.checked)}
            disabled={loading}
            style={{ width: 'auto', margin: 0 }}
          />
          <span>🧠 Hindsight Memory</span>
        </label>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {showInput && onCompare && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onCompare(q, mode)}
              disabled={loading}
              title="Compare agent answer with persistent memory vs without memory"
            >
              ⚖ Compare Memory
            </button>
          )}

          {showInput && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={run}
              disabled={loading}
              style={{ minWidth: '80px' }}
            >
              {loading ? 'Thinking…' : 'Run Query →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
