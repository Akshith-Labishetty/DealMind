import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import { api } from './api.js';
import Dashboard from './pages/Dashboard.jsx';
import DealDetail from './pages/DealDetail.jsx';
import AddInteraction from './pages/AddInteraction.jsx';
import DemoPage from './pages/DemoPage.jsx';
import NotFound from './pages/NotFound.jsx';

const NAV = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    to: '/demo',
    label: 'Demo Sandbox',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
];

/**
 * Live dependency status indicator in the sidebar footer.
 */
function StatusStrip() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      let payload;
      try {
        payload = (await api.get('/health')).data;
      } catch (e) {
        payload = e.response?.data || {
          status: 'offline',
          db: { connected: false, message: 'backend unreachable' },
          llm: { ok: false, message: 'backend unreachable' },
          hindsight: { ok: false, message: 'backend unreachable' },
        };
      }
      if (alive) setHealth(payload);
    };
    check();
    const t = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const items = [
    { label: 'MongoDB', ok: Boolean(health?.db?.connected), msg: health?.db?.message },
    { label: 'Groq LLM', ok: Boolean(health?.llm?.ok), msg: health?.llm?.message },
    { label: 'Hindsight', ok: Boolean(health?.hindsight?.ok), msg: health?.hindsight?.message },
  ];

  return (
    <div
      style={{
        padding: '0.85rem 1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(0, 0, 0, 0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', fontWeight: 700 }}>
          System Health
        </span>
        {health && (
          <span
            style={{
              fontSize: '0.65rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '9999px',
              fontWeight: 600,
              background: health.status === 'ok' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: health.status === 'ok' ? '#34d399' : '#fbbf24',
              border: `1px solid ${health.status === 'ok' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}
          >
            {health.status === 'ok' ? 'All Systems Go' : 'Degraded'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {!health ? (
          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Pinging services…</span>
        ) : (
          items.map((it) => (
            <div
              key={it.label}
              title={it.msg || ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.74rem',
                color: it.ok ? '#cbd5e1' : '#f87171',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: it.ok ? '#10b981' : '#ef4444',
                    boxShadow: it.ok ? '0 0 6px rgba(16, 185, 129, 0.6)' : '0 0 6px rgba(239, 68, 68, 0.6)',
                  }}
                />
                {it.label}
              </span>
              <span style={{ color: '#64748b', fontSize: '0.68rem' }}>
                {it.ok ? 'connected' : 'offline'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="shell">
      <aside className="sidebar">
        {/* Brand Header */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🧠</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#fff' }}>
              DealMind
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>
              Persistent Memory Agent
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700, padding: '0.2rem 0.5rem', marginBottom: '0.25rem' }}>
            Navigation
          </div>
          {NAV.map((n) => {
            const isActive = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                {n.icon}
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* System & Memory Engine Highlight */}
        <div style={{ padding: '0.85rem 1rem', marginTop: 'auto' }}>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '0.65rem',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: '#93c5fd', marginBottom: '0.2rem' }}>
              <span>⚡</span> Hindsight Engine
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', lineHeight: 1.4 }}>
              Zero memory loss. Multi-strategy semantic recall on every deal.
            </div>
          </div>
        </div>

        <StatusStrip />
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/deal/:id" element={<DealDetail />} />
          <Route path="/add/:id" element={<AddInteraction />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
