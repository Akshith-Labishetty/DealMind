import React, { useState } from 'react';

const MODES = [
  { id: 'brief', label: 'Meeting Brief', q: 'Give me a complete briefing for my next meeting.' },
  { id: 'objections', label: 'Objections', q: "What are this customer's biggest concerns?" },
  { id: 'strategy', label: 'Strategy', q: 'How should I prepare for my next meeting?' },
  { id: 'history', label: 'History', q: 'What happened in our previous meetings?' },
  { id: 'followup', label: 'Follow-up Email', q: 'Draft a follow-up email.' },
  { id: 'risk', label: 'Deal Risk', q: 'Is this deal at risk and why?' },
];

/**
 * Preset questions + "Use Hindsight memory" toggle.
 *
 * Two shapes:
 *  - `showInput` (default): owns a textarea; "Run" sends `(q, mode, useMemory)`.
 *  - `showInput={false}`: the caller owns the input (the floating chat widget),
 *    so a preset click fires `onAsk(presetQuestion, presetMode, useMemory)`
 *    immediately and no Run button is rendered. Never two competing textareas.
 */
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

  // A preset button is an explicit mode choice. If the text no longer matches
  // that preset the user is asking something free-form, so let the backend
  // detect the mode (that is what makes greetings, off-topic questions etc.
  // behave sensibly instead of being forced into a briefing).
  const run = () => {
    const preset = MODES.find((m) => m.id === mode);
    const isPresetText = Boolean(preset) && q === preset.q;
    onAsk?.(q, isPresetText ? mode : null, useMemory);
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      {!compact && <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>🤖 Ask DealMind</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.6rem' }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`btn btn-sm ${showInput && mode === m.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => pickPreset(m)}
            disabled={loading}
            title={showInput ? undefined : m.q}
          >
            {m.label}
          </button>
        ))}
      </div>

      {showInput && (
        <textarea
          rows={2}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type your question..."
          style={{ marginBottom: '0.5rem' }}
        />
      )}

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={useMemory}
            onChange={(e) => setUseMemory?.(e.target.checked)}
            disabled={loading}
            style={{ marginRight: '0.3rem' }}
          />
          Use Hindsight memory
        </label>

        {showInput && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={run}
            disabled={loading}
          >
            {loading ? 'Thinking…' : 'Run'}
          </button>
        )}

        {showInput && onCompare && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onCompare(q, mode)}
            disabled={loading}
          >
            ⚖ Compare w/ &amp; w/o memory
          </button>
        )}
      </div>
    </div>
  );
}
