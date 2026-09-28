import React, { useState, useEffect } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import { api } from './api.js';
import Dashboard from './pages/Dashboard.jsx';
import DealDetail from './pages/DealDetail.jsx';
import AddInteraction from './pages/AddInteraction.jsx';
import DemoPage from './pages/DemoPage.jsx';
import NotFound from './pages/NotFound.jsx';

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/demo', label: 'Demo' },
];

/**
 * Live dependency strip: MongoDB / LLM / Hindsight. The API answers 503 when
 * anything is degraded, so we read the payload off either branch.
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
    const t = setInterval(check, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const items = [
    { label: 'DB', ok: Boolean(health?.db?.connected), msg: health?.db?.message },
    { label: 'AI', ok: Boolean(health?.llm?.ok), msg: health?.llm?.message },
    { label: 'Memory', ok: Boolean(health?.hindsight?.ok), msg: health?.hindsight?.message },
  ];

  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', padding: '0.6rem 1.5rem', borderBottom: '1px solid #334155', fontSize: '0.72rem' }}>
      {!health && <span style={{ color: '#94a3b8' }}>checking services…</span>}
      {health && items.map((it) => (
        <span key={it.label} title={it.msg || ''} style={{ color: it.ok ? '#86efac' : '#fca5a5' }}>
          {it.ok ? '●' : '○'} {it.label}
        </span>
      ))}
      {health && health.status !== 'ok' && (
        <span style={{ color: '#fcd34d' }}>degraded</span>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '1.25rem', borderBottom: '1px solid #334155', marginBottom: '0.5rem' }}>
          DealMind
        </div>
        {NAV.map((n) => (
          <Link key={n.to} to={n.to}>{n.label}</Link>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <StatusStrip />
        </div>
      </aside>
      <div className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/deal/:id" element={<DealDetail />} />
          <Route path="/add/:id" element={<AddInteraction />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}
