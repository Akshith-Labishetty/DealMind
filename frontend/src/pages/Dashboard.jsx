import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api.js';
import StatCard from '../components/StatCard.jsx';
import ChatWidget from '../components/ChatWidget.jsx';

const healthClass = (h) => (h === 'risk' ? 'bg-red-100' : h === 'attention' ? 'bg-amber-100' : 'bg-green-100');

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
    return () => { alive = false; };
  }, []);

  const s = data?.stats || {};
  const activity = data?.recentInteractions || [];

  if (loading) return <div>Loading dashboard…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ marginBottom: '1rem' }}>DealMind</h1>
        {typeof data?.memoriesRetained === 'number' && (
          <span style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
            🧠 {data.memoriesRetained} memories retained
          </span>
        )}
      </div>

      {error && (
        <div className="card" style={{ borderColor: '#fca5a5', color: '#b91c1c', marginBottom: '1rem' }}>
          {error} — check that MongoDB is running and the backend is on port 4000.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Active Deals" value={s.activeDeals || 0} />
        <StatCard label="Needs Attention" value={s.needsAttention || 0} variant="amber" />
        <StatCard label="Upcoming Meetings" value={s.upcomingMeetings || 0} />
        <StatCard label="Open Objections" value={s.openObjections || 0} variant="red" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <section>
          <h2 style={{ marginBottom: '0.5rem' }}>Deals</h2>
          {deals.length === 0 && !error && (
            <div className="card" style={{ color: '#64748b' }}>
              No deals yet. Load the demo to get started.
            </div>
          )}
          {deals.length > 0 && (
            <table>
              <thead>
                <tr><th>Company</th><th>Deal</th><th>Value</th><th>Stage</th><th>Health</th></tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id}>
                    <td><Link to={`/deal/${d.id}`} style={{ color: '#2563eb' }}>{d.company}</Link></td>
                    <td>{d.title}</td>
                    <td>${Number(d.value || 0).toLocaleString()}</td>
                    <td>{d.stage}</td>
                    <td><span className={`badge ${healthClass(d.health)}`}>{d.health}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 style={{ marginBottom: '0.5rem' }}>Recent activity</h2>
          {activity.length === 0 ? (
            <div className="card" style={{ color: '#64748b' }}>Nothing logged yet.</div>
          ) : (
            <div className="card" style={{ padding: '0.75rem 1rem' }}>
              {activity.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap', minWidth: '70px' }}>
                    {new Date(a.date).toLocaleDateString()}
                  </span>
                  <span style={{ fontSize: '0.85rem' }}>
                    <strong>{a.company}</strong> · {a.type}{' '}
                    {a.memoryStored ? '· 🧠' : ''}
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{a.summary}</div>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link to="/demo" className="btn btn-primary">Load Acme Demo</Link>
        <Link to={deals.length ? `/deal/${deals[0].id}` : '/demo'} className="btn btn-secondary">Open latest deal</Link>
      </div>

      {deals.length > 0 && <ChatWidget dealId={deals[0].id} />}
    </div>
  );
}
