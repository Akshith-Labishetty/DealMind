import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, errMsg } from '../api.js';
import AiAssistant from '../components/AiAssistant.jsx';
import ChatWidget from '../components/ChatWidget.jsx';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'timeline', label: 'Timeline', icon: '⏱' },
  { id: 'interactions', label: 'Interactions', icon: '📝' },
  { id: 'ai', label: 'AI Assistant', icon: '🤖' },
  { id: 'memory', label: 'Hindsight Memory', icon: '🧠' },
  { id: 'risks', label: 'Risks', icon: '⚠️' },
  { id: 'nextsteps', label: 'Next Steps', icon: '✅' },
];

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
    return () => {
      alive = false;
    };
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
      <div className="card" style={{ borderColor: '#fca5a5', background: '#fff1f2', color: '#b91c1c', padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Could not load deal</h3>
        <p>{loadError}</p>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/" className="btn btn-secondary">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 1s linear infinite' }} />
        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading deal intelligence…</div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
        <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>
          Pipeline
        </Link>
        <span>/</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{deal.company}</span>
      </div>

      {/* Hero Header Card */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {deal.company}
              </h1>
              <span className={`badge badge-${deal.health || 'healthy'}`}>
                {deal.health || 'healthy'}
              </span>
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '0.4rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: '#f1f5f9',
                  color: '#475569',
                }}
              >
                {deal.industry || 'Enterprise'}
              </span>
            </div>

            <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span>{deal.title}</span>
              <span>·</span>
              <span>Primary: <strong>{deal.contactName}</strong> ({deal.contactRole})</span>
              <span>·</span>
              <span>Stage: <strong>{deal.stage}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Contract Value
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                ${Number(deal.value || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{deal.plan} plan</div>
            </div>

            <Link to={`/add/${id}`} className="btn btn-primary" style={{ padding: '0.6rem 1.1rem' }}>
              <span>+</span> Add Interaction
            </Link>
          </div>
        </div>
      </div>

      {/* Segmented Tab Bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.35rem',
          background: '#f1f5f9',
          padding: '0.35rem',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          border: '1px solid #e2e8f0',
        }}
      >
        {TABS.map((t) => {
          const isActive = tab === t.id;
          let count = null;
          if (t.id === 'interactions') count = interactions.length;
          if (t.id === 'risks') count = deal.risks?.length;
          if (t.id === 'nextsteps') count = deal.nextSteps?.length;

          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.95rem',
                borderRadius: '0.55rem',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#0f172a' : '#64748b',
                background: isActive ? '#ffffff' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {typeof count === 'number' && count > 0 && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.05rem 0.35rem',
                    borderRadius: '9999px',
                    background: isActive ? '#eff6ff' : '#e2e8f0',
                    color: isActive ? '#1d4ed8' : '#475569',
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem', alignItems: 'start' }}>
          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Executive Summary
              </h3>
              <p style={{ color: '#334155', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {deal.summary || 'No summary recorded yet.'}
              </p>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Requirements ({deal.requirements?.length || 0})
              </h3>
              {!deal.requirements?.length ? (
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem' }}>None logged yet.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {deal.requirements.map((r, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: '#eff6ff',
                        color: '#1e40af',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.825rem',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓</span> {r}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Competitor Mentions
              </h3>
              {!deal.competitors?.length ? (
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem' }}>No competitors flagged.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {deal.competitors.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: '#fef2f2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span>⚔</span> {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Key Stakeholders ({deal.stakeholders?.length || 0})
              </h3>
              {!deal.stakeholders?.length ? (
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem' }}>No stakeholders identified yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {deal.stakeholders.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#3b82f6',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {s.name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {s.role || 'Stakeholder'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Memory Container
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                Isolated Hindsight Bank:
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.4rem',
                  background: '#f1f5f9',
                  color: '#1e293b',
                  border: '1px solid #cbd5e1',
                  wordBreak: 'break-all',
                }}
              >
                {deal.bankId}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIMELINE */}
      {tab === 'timeline' && (
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem' }}>
            Deal Progression Timeline
          </h3>
          {timeline.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No timeline entries available.</p>
          ) : (
            <div style={{ paddingLeft: '0.5rem' }}>
              {timeline.map((t, i) => (
                <div key={i} className="timeline-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: '#e0e7ff',
                        color: '#3730a3',
                      }}
                    >
                      {t.type}
                    </span>
                  </div>
                  <div style={{ color: '#334155', fontSize: '0.875rem', lineHeight: 1.5 }}>
                    {t.summary}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INTERACTIONS */}
      {tab === 'interactions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Historical Interactions ({interactions.length})
            </h3>
            <Link to={`/add/${id}`} className="btn btn-primary btn-sm">
              + New Interaction
            </Link>
          </div>

          {interactions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              No interactions logged for this deal.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {interactions.map((it) => (
                <div key={it.id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '0.35rem',
                          background: '#0f172a',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        #{it.seq}
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                        {it.type}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(it.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: it.memoryStored ? '#dcfce7' : '#fef3c7',
                        color: it.memoryStored ? '#15803d' : '#b45309',
                        border: `1px solid ${it.memoryStored ? '#bbf7d0' : '#fde68a'}`,
                      }}
                    >
                      {it.memoryStored ? '🧠 Hindsight Stored' : 'Pending'}
                    </span>
                  </div>

                  {it.participants?.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      <strong>Participants:</strong> {it.participants.join(', ')}
                    </div>
                  )}

                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '0.85rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      color: '#334155',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    {it.notes}
                  </div>

                  {it.extraction?.objections?.length > 0 && (
                    <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Objections raised:</span>
                      {it.extraction.objections.map((o, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '0.35rem',
                            background: o.status === 'resolved' ? '#f0fdf4' : '#fff1f2',
                            color: o.status === 'resolved' ? '#166534' : '#991b1b',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {o.subject} ({o.status})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AI ASSISTANT */}
      {tab === 'ai' && <AiAssistant dealId={id} />}

      {/* TAB 5: MEMORY BROWSER */}
      {tab === 'memory' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Hindsight Semantic Bank
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Bank ID: <code>{deal.bankId}</code>
                {memTotal !== null ? ` · ${memTotal} indexed memory facts` : ''}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={memQ}
                onChange={(e) => setMemQ(e.target.value)}
                placeholder="Search semantic facts…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') searchMemories();
                }}
                style={{ width: '240px' }}
              />
              <button className="btn btn-primary btn-sm" onClick={searchMemories} disabled={memLoading}>
                {memLoading ? 'Searching…' : 'Search'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={listAllMemories} disabled={memLoading}>
                List All
              </button>
            </div>
          </div>

          {memError && (
            <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '0.65rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {memError}
            </div>
          )}

          {memories.length === 0 && !memLoading && (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b', fontSize: '0.9rem' }}>
              No memories listed yet. Click <strong>List All</strong> to inspect facts stored in Hindsight.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {memories.map((m, i) => (
              <div
                key={m.id || i}
                style={{
                  padding: '0.85rem',
                  borderRadius: '0.5rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '0.875rem', color: '#0f172a', lineHeight: 1.5, marginBottom: '0.35rem' }}>
                  {m.text || m.content}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: '#64748b' }}>
                  <span style={{ padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: '#e2e8f0', fontWeight: 600 }}>
                    {m.type || 'fact'}
                  </span>
                  {m.date && <span>Occurred: {new Date(m.date).toLocaleDateString()}</span>}
                  {m.context && <span>Source: {m.context}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: RISKS */}
      {tab === 'risks' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Risk Assessment
            </h3>
            <span className={`badge badge-${deal.health || 'healthy'}`}>{deal.health}</span>
          </div>

          {(deal.risks || []).length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              No active risk factors identified for this deal.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {deal.risks.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '0.65rem',
                    background: r.level === 'high' ? '#fff1f2' : '#fffbeb',
                    border: `1px solid ${r.level === 'high' ? '#fecdd3' : '#fde68a'}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{r.level === 'high' ? '🚨' : '⚠️'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: r.level === 'high' ? '#9f1239' : '#92400e' }}>
                      {r.text}
                    </div>
                    {r.source && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Source: {r.source}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: NEXT STEPS */}
      {tab === 'nextsteps' && (
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
            Agreed Commitments & Next Steps
          </h3>
          {(deal.nextSteps || []).length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              No next steps logged yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {deal.nextSteps.map((n, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <input type="checkbox" defaultChecked={n.done} style={{ width: 'auto', cursor: 'pointer' }} />
                    <span style={{ fontSize: '0.9rem', color: '#334155', textDecoration: n.done ? 'line-through' : 'none' }}>
                      {n.text}
                    </span>
                  </div>
                  {n.due && (
                    <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '0.3rem', background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
                      Due: {n.due}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Chat Widget */}
      <ChatWidget dealId={id} />
    </div>
  );
}
