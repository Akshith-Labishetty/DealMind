import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, errMsg } from '../api.js';
import AiAssistant from '../components/AiAssistant.jsx';
import ChatWidget from '../components/ChatWidget.jsx';
import { mdToHtml } from '../lib/markdown.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'ai', label: 'AI Assistant' },
  { id: 'memory', label: 'Memory' },
  { id: 'risks', label: 'Risks' },
  { id: 'nextsteps', label: 'Next Steps' },
];

const healthClass = (h) => (h === 'risk' ? 'bg-red-100' : h === 'attention' ? 'bg-amber-100' : 'bg-green-100');

export default function DealDetail() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loadError, setLoadError] = useState('');

  // Memory tab state
  const [memories, setMemories] = useState([]);
  const [memTotal, setMemTotal] = useState(null);
  const [memQ, setMemQ] = useState('');
  const [memLoading, setMemLoading] = useState(false);
  const [memError, setMemError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [d, i, t] = await Promise.all([
          api.get(`/deals/${id}`),
          api.get(`/deals/${id}/interactions`),
          api.get(`/deals/${id}/timeline`),
        ]);
        if (!alive) return;
        setDeal(d.data.deal || d.data);
        setInteractions(i.data.interactions || []);
        setTimeline(t.data.timeline || []);
      } catch (e) {
        if (alive) setLoadError(errMsg(e));
      }
    };
    load();
    return () => { alive = false; };
  }, [id]);

  const listAllMemories = useCallback(async () => {
    setMemLoading(true);
    setMemError('');
    try {
      const res = await api.get(`/deals/${id}/memories`);
      setMemories(res.data.memories || []);
      setMemTotal(res.data.total ?? (res.data.memories || []).length);
      if (res.data.error) setMemError(res.data.error);
    } catch (e) {
      setMemError(errMsg(e));
    } finally {
      setMemLoading(false);
    }
  }, [id]);

  const searchMemories = async () => {
    if (!memQ.trim()) return listAllMemories();
    setMemLoading(true);
    setMemError('');
    try {
      const res = await api.post(`/deals/${id}/memories/search`, { query: memQ });
      setMemories(res.data.results || []);
      setMemTotal((res.data.results || []).length);
      if (res.data.error) setMemError(res.data.error);
    } catch (e) {
      setMemError(errMsg(e));
    } finally {
      setMemLoading(false);
    }
  };

  if (loadError) {
    return (
      <div className="card" style={{ borderColor: '#fca5a5', color: '#b91c1c' }}>
        Could not load this deal: {loadError}
        <div style={{ marginTop: '0.75rem' }}>
          <Link to="/" className="btn btn-secondary">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }
  if (!deal) return <div>Loading…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1>{deal.company}</h1>
          <div style={{ color: '#64748b' }}>
            {deal.plan} · ${Number(deal.value || 0).toLocaleString()} · {deal.stage}
          </div>
          <span className={`badge ${healthClass(deal.health)}`}>{deal.health}</span>
        </div>
        <Link to={`/add/${id}`} className="btn btn-primary">+ Add Interaction</Link>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid #cbd5e1', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <h3>Summary</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{deal.summary || '—'}</p>

          <h3 style={{ marginTop: '1rem' }}>Stakeholders</h3>
          {deal.stakeholders?.length
            ? <ul>{deal.stakeholders.map((s, i) => <li key={i}>{s.name}{s.role ? ` (${s.role})` : ''}</li>)}</ul>
            : <p style={{ color: '#64748b' }}>None yet.</p>}

          <h3 style={{ marginTop: '1rem' }}>Requirements</h3>
          {deal.requirements?.length
            ? <ul>{deal.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
            : <p style={{ color: '#64748b' }}>None yet.</p>}

          <h3 style={{ marginTop: '1rem' }}>Competitors</h3>
          {deal.competitors?.length
            ? <ul>{deal.competitors.map((c, i) => <li key={i}>{c}</li>)}</ul>
            : <p style={{ color: '#64748b' }}>None mentioned.</p>}
        </div>
      )}

      {tab === 'timeline' && (
        <div>
          {timeline.length === 0 && <p style={{ color: '#64748b' }}>No interactions yet.</p>}
          {timeline.map((t, i) => (
            <div key={i} className="timeline-item">
              <strong>{new Date(t.date).toLocaleDateString()} · {t.type}</strong>
              <div>{t.summary}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'interactions' && (
        <div>
          {interactions.length === 0 && <p style={{ color: '#64748b' }}>No interactions yet.</p>}
          {interactions.map((i) => (
            <div key={i.id} className="card" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <strong>#{i.seq} · {new Date(i.date).toLocaleDateString()} · {i.type}</strong>
                <span className={`badge ${i.memoryStored ? 'bg-green-100' : 'bg-amber-100'}`}>
                  {i.memoryStored ? 'Hindsight ✓' : 'pending'}
                </span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', marginTop: '0.3rem' }}>{i.notes}</div>
              {i.memoryError && (
                <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '0.3rem' }}>{i.memoryError}</div>
              )}
              {i.extraction?.objections?.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.3rem' }}>
                  Objections: {i.extraction.objections.map((o) => o.subject).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'ai' && <AiAssistant dealId={id} />}

      {tab === 'memory' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <input
              value={memQ}
              onChange={(e) => setMemQ(e.target.value)}
              placeholder="Search memories…"
              onKeyDown={(e) => { if (e.key === 'Enter') searchMemories(); }}
              style={{ maxWidth: '320px' }}
            />
            <button className="btn btn-primary" onClick={searchMemories} disabled={memLoading}>
              {memLoading ? 'Searching…' : 'Search'}
            </button>
            <button className="btn btn-secondary" onClick={listAllMemories} disabled={memLoading}>
              List all
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
            Bank: <code>{deal.bankId}</code>
            {memTotal !== null ? ` · ${memTotal} memories` : ''}
          </p>

          {memError && <div style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>{memError}</div>}

          {memories.length === 0 && !memLoading && !memError && (
            <p style={{ color: '#64748b' }}>
              No memories loaded yet — press <strong>List all</strong>, or log an interaction first.
            </p>
          )}

          {memories.map((m, i) => (
            <div key={m.id || i} className="card" style={{ marginBottom: '0.5rem' }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text || m.content}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.3rem' }}>
                {m.type || 'memory'}{m.date || m.occurred_start ? ` · ${new Date(m.date || m.occurred_start).toLocaleDateString()}` : ''}
                {m.context ? ` · ${m.context}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'risks' && (
        <div>
          <span className={`badge ${healthClass(deal.health)}`}>{deal.health}</span>
          {(deal.risks || []).length === 0 && (
            <p style={{ color: '#64748b', marginTop: '0.75rem' }}>No risks flagged.</p>
          )}
          {(deal.risks || []).map((r, i) => (
            <div key={i} className="card" style={{ marginTop: '0.5rem' }}>
              <span className={`badge ${r.level === 'high' ? 'bg-red-100' : 'bg-amber-100'}`}>{r.level}</span> {r.text}
              {r.source ? <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>source: {r.source}</div> : null}
            </div>
          ))}
        </div>
      )}

      {tab === 'nextsteps' && (
        (deal.nextSteps || []).length
          ? <ul>{deal.nextSteps.map((n, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>
                {n.text}{n.due ? ` (due ${n.due})` : ''}
                {n.source ? <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}> — {n.source}</span> : null}
              </li>
            ))}</ul>
          : <p style={{ color: '#64748b' }}>No next steps recorded yet.</p>
      )}

      <ChatWidget dealId={id} />
    </div>
  );
}
