import React, { useState, useEffect, useRef } from 'react';
import { api, errMsg } from '../api.js';
import ModeButtons from './ModeButtons.jsx';
import MemoriesPanel from './MemoriesPanel.jsx';
import { mdToHtml } from '../lib/markdown.js';

const pick = (data) => data?.memoriesUsed ?? data?.memories_used ?? [];

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 560;
const ENLARGED_WIDTH = 680;
const ENLARGED_HEIGHT = 720;
const MIN_WIDTH = 340;
const MIN_HEIGHT = 380;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

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

  // Position and Size states
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [pos, setPos] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const widgetRef = useRef(null);

  // Keep widget inside viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => {
        if (prev.x === null || prev.y === null) return prev;
        const maxX = Math.max(16, window.innerWidth - size.width - 16);
        const maxY = Math.max(16, window.innerHeight - size.height - 16);
        return {
          x: clamp(prev.x, 16, maxX),
          y: clamp(prev.y, 16, maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size.width, size.height]);

  const currentX = pos.x ?? Math.max(16, window.innerWidth - size.width - 24);
  const currentY = pos.y ?? Math.max(16, window.innerHeight - size.height - 24);

  // Dragging logic on top black section
  const handleHeaderPointerDown = (e) => {
    // Ignore clicks on buttons or form controls
    if (e.target.closest('button') || e.target.closest('input')) return;
    e.preventDefault();
    setIsDragging(true);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPosX = currentX;
    const startPosY = currentY;

    const onPointerMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - startClientX;
      const deltaY = moveEvt.clientY - startClientY;
      const maxX = Math.max(16, window.innerWidth - size.width - 16);
      const maxY = Math.max(16, window.innerHeight - size.height - 16);
      setPos({
        x: clamp(startPosX + deltaX, 16, maxX),
        y: clamp(startPosY + deltaY, 16, maxY),
      });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Corner resize logic
  const handleResizePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startW = size.width;
    const startH = size.height;

    const onPointerMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - startClientX;
      const deltaY = moveEvt.clientY - startClientY;
      const maxW = Math.max(MIN_WIDTH, window.innerWidth - currentX - 16);
      const maxH = Math.max(MIN_HEIGHT, window.innerHeight - currentY - 16);
      setSize({
        width: clamp(startW + deltaX, MIN_WIDTH, maxW),
        height: clamp(startH + deltaY, MIN_HEIGHT, maxH),
      });
    };

    const onPointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Enlarge / Decrease toggle
  const isEnlarged = size.width >= 580 || size.height >= 650;

  const toggleEnlarge = () => {
    if (isEnlarged) {
      // Decrease to default size
      setSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
    } else {
      // Enlarge size
      const targetW = Math.min(ENLARGED_WIDTH, window.innerWidth - 32);
      const targetH = Math.min(ENLARGED_HEIGHT, window.innerHeight - 32);
      setSize({ width: targetW, height: targetH });

      // Ensure widget doesn't overflow screen when enlarged
      setPos((prev) => {
        const x = prev.x ?? currentX;
        const y = prev.y ?? currentY;
        return {
          x: Math.min(x, Math.max(16, window.innerWidth - targetW - 16)),
          y: Math.min(y, Math.max(16, window.innerHeight - targetH - 16)),
        };
      });
    }
  };

  // Incremental step decrease / enlarge
  const handleStepDecrease = () => {
    const newW = clamp(size.width - 60, MIN_WIDTH, window.innerWidth - 32);
    const newH = clamp(size.height - 70, MIN_HEIGHT, window.innerHeight - 32);
    setSize({ width: newW, height: newH });
  };

  const handleStepEnlarge = () => {
    const newW = clamp(size.width + 60, MIN_WIDTH, window.innerWidth - 32);
    const newH = clamp(size.height + 70, MIN_HEIGHT, window.innerHeight - 32);
    setSize({ width: newW, height: newH });
    setPos((prev) => {
      const x = prev.x ?? currentX;
      const y = prev.y ?? currentY;
      return {
        x: Math.min(x, Math.max(16, window.innerWidth - newW - 16)),
        y: Math.min(y, Math.max(16, window.innerHeight - newH - 16)),
      };
    });
  };

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

  // Free text → send mode as null so the backend detects it
  const send = () => ask(q, null, useMemory);

  const headerBtnStyle = {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#e2e8f0',
    borderRadius: '0.35rem',
    cursor: 'pointer',
    padding: '0.2rem 0.45rem',
    fontSize: '0.8rem',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  };

  return (
    <>
      {!open ? (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open DealMind chat"
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            💬
          </button>
        </div>
      ) : (
        <div
          ref={widgetRef}
          style={{
            position: 'fixed',
            left: `${currentX}px`,
            top: `${currentY}px`,
            width: `${size.width}px`,
            height: `${size.height}px`,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 32px)',
            background: '#fff',
            borderRadius: '0.75rem',
            boxShadow: '0 12px 36px rgba(0,0,0,.28)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            border: '1px solid #cbd5e1',
            transition: isDragging || isResizing ? 'none' : 'width 0.18s ease, height 0.18s ease',
          }}
        >
          {/* Top Black Section: Draggable Header */}
          <div
            onPointerDown={handleHeaderPointerDown}
            title="Drag to move chat left/right"
            style={{
              background: '#1e293b',
              color: '#fff',
              padding: '0.65rem 0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              borderBottom: '1px solid #334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ opacity: 0.65, fontSize: '0.9rem', cursor: 'grab' }} title="Drag to move">
                ⠿
              </span>
              <span style={{ fontSize: '0.95rem', letterSpacing: '-0.01em' }}>DealMind Chat</span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>
                (drag to move)
              </span>
            </div>

            {/* Enlarge / Decrease Size Controls + Close Button */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Step Decrease (-) */}
              <button
                type="button"
                onClick={handleStepDecrease}
                title="Decrease size (-)"
                aria-label="Decrease size"
                style={headerBtnStyle}
              >
                −
              </button>

              {/* Step Enlarge (+) */}
              <button
                type="button"
                onClick={handleStepEnlarge}
                title="Enlarge size (+)"
                aria-label="Enlarge size"
                style={headerBtnStyle}
              >
                +
              </button>

              {/* Enlarge / Shrink Toggle Button */}
              <button
                type="button"
                onClick={toggleEnlarge}
                title={isEnlarged ? 'Decrease to normal size' : 'Enlarge chat window'}
                aria-label={isEnlarged ? 'Decrease size' : 'Enlarge size'}
                style={{
                  ...headerBtnStyle,
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  fontWeight: 500,
                  background: isEnlarged ? '#3b82f6' : 'rgba(255,255,255,0.12)',
                  borderColor: isEnlarged ? '#2563eb' : 'rgba(255,255,255,0.2)',
                }}
              >
                {isEnlarged ? '⤡ Decrease' : '⤢ Enlarge'}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                title="Close chat"
                style={{
                  ...headerBtnStyle,
                  fontSize: '0.95rem',
                  padding: '0.15rem 0.45rem',
                  marginLeft: '0.15rem',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {answer && (
              <div
                className="card chat-bubble"
                dangerouslySetInnerHTML={{ __html: mdToHtml(answer) }}
                style={{ marginBottom: '0.75rem' }}
              />
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

          {/* Chat Input Controls */}
          <div
            style={{
              borderTop: '1px solid #e2e8f0',
              padding: '0.75rem',
              position: 'relative',
              background: '#f8fafc',
            }}
          >
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
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.85rem',
                resize: 'none',
                background: '#fff',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              className="btn btn-primary"
              onClick={send}
              disabled={loading || !q.trim()}
              style={{ marginTop: '0.4rem', width: '100%' }}
            >
              {loading ? 'Thinking…' : 'Send'}
            </button>

            {/* Corner Resize Grip Handle */}
            <div
              onPointerDown={handleResizePointerDown}
              title="Drag corner to resize chat"
              style={{
                position: 'absolute',
                bottom: 3,
                right: 3,
                width: 14,
                height: 14,
                cursor: 'nwse-resize',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
                userSelect: 'none',
                opacity: 0.6,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M8 2L2 8M8 5L5 8M8 8L8 8" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
