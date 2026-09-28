import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api.js';
import StatCard from '../components/StatCard.jsx';
import ChatWidget from '../components/ChatWidget.jsx';

// Stage color styling map
const stageBadgeClass = (stage = '') => {
  const s = stage.toLowerCase();
  if (s.includes('discovery')) return 'badge-stage-discovery';
  if (s.includes('proposal')) return 'badge-stage-proposal';
  if (s.includes('eval') || s.includes('tech')) return 'badge-stage-technical';
  if (s.includes('negotiat')) return 'badge-stage-negotiation';
  if (s.includes('won') || s.includes('closed')) return 'badge-stage-won';
  return 'badge-stage-discovery';
};

// Generates an avatar gradient based on string
const getAvatarGradient = (name = '') => {
  const gradients = [
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return gradients[Math.abs(hash) % gradients.length];
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.get('/dashboard'), api.get('/deals')]).then(([dash, list]) => {
      if (!alive) return;
      if (dash.status === 'fulfilled') setData(dash.value.data);
      if (list.status === 'fulfilled') setDeals(list.value.data.deals || []);
      const firstError = [dash, list].find((r) => r.status === 'rejected');
      if (firstError) setError(errMsg(firstError.reason));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const s = data?.stats || {};
  const activity = data?.recentInteractions || [];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 1s linear infinite' }} />
        <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>Loading intelligence workspace…</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Top Banner / Hero Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>
            Pipeline Intelligence
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Continuous persistent memory for every active sales opportunity.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {typeof data?.memoriesRetained === 'number' && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '9999px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                fontSize: '0.825rem',
                color: '#334155',
                fontWeight: 600,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <span style={{ fontSize: '1rem' }}>🧠</span>
              <span>{data.memoriesRetained} memories retained</span>
            </div>
          )}
          <Link to="/demo" className="btn btn-primary">
            <span>⚡</span> Load Acme Demo
          </Link>
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            borderColor: '#fca5a5',
            background: '#fff1f2',
            color: '#b91c1c',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <span>⚠</span>
          <div>
            <strong>Service Notice:</strong> {error} — check MongoDB and backend API on port 4000.
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard label="Active Deals" value={s.activeDeals || deals.length || 0} variant="brand" subtext="in pipeline" />
        <StatCard label="Needs Attention" value={s.needsAttention || 0} variant="amber" subtext="objection / risk" />
        <StatCard label="Upcoming Meetings" value={s.upcomingMeetings || 0} variant="green" subtext="scheduled" />
        <StatCard label="Open Objections" value={s.openObjections || 0} variant="red" subtext="unresolved" />
      </div>

      {/* Two Column Section: Deals Table + Activity Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.75rem', alignItems: 'start' }}>
        {/* Left Column: Deals Table */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Deals ({deals.length})
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Sorted by recent activity</span>
          </div>

          <div className="table-container">
            {deals.length === 0 && !error ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📂</div>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>No deals in pipeline</div>
                <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Click below to seed sample enterprise deals with full memory histories.</div>
                <Link to="/demo" className="btn btn-primary btn-sm">Load Demo Deals</Link>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Opportunity</th>
                    <th>Product / Scope</th>
                    <th>Value</th>
                    <th>Stage</th>
                    <th>Health</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d) => {
                    const initials = d.company
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();
                    return (
                      <tr key={d.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '0.5rem',
                                background: getAvatarGradient(d.company),
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <Link
                                to={`/deal/${d.id}`}
                                style={{
                                  fontWeight: 600,
                                  color: '#0f172a',
                                  textDecoration: 'none',
                                  fontSize: '0.9rem',
                                }}
                                onMouseEnter={(e) => (e.target.style.color = '#2563eb')}
                                onMouseLeave={(e) => (e.target.style.color = '#0f172a')}
                              >
                                {d.company}
                              </Link>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {d.industry || 'Enterprise'} · {d.contactName || 'Lead'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>
                            {d.title || d.plan || 'Platform'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{d.plan} tier</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            ${Number(d.value || 0).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span className={`badge-stage ${stageBadgeClass(d.stage)}`}>
                            {d.stage}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${d.health || 'healthy'}`}>
                            {d.health || 'healthy'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            to={`/deal/${d.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem' }}
                            title="Open deal details"
                          >
                            →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Right Column: Recent Activity Feed */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Activity Feed
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Live audit</span>
          </div>

          <div className="card" style={{ padding: '0.85rem' }}>
            {activity.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No recent activity logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {activity.map((a, i) => (
                  <div
                    key={a.id || i}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '0.5rem',
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                        {a.company}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                      <span
                        style={{
                          padding: '0.1rem 0.4rem',
                          borderRadius: '0.3rem',
                          background: '#e0e7ff',
                          color: '#3730a3',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      >
                        {a.type}
                      </span>
                      {a.memoryStored && (
                        <span
                          style={{
                            padding: '0.1rem 0.4rem',
                            borderRadius: '0.3rem',
                            background: '#dcfce7',
                            color: '#15803d',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          🧠 Hindsight ✓
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, marginTop: '0.1rem' }}>
                      {a.summary}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Floating Chat Widget attached to the top deal */}
      {deals.length > 0 && <ChatWidget dealId={deals[0].id} />}
    </div>
  );
}
