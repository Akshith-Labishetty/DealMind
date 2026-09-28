import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errMsg } from '../api.js';

export default function DemoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const loadDemo = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/demo/load');
      setResult(res.data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const resetDemo = async () => {
    if (!window.confirm('Delete ALL deals, interactions and activity?')) return;
    setResetting(true);
    setError('');
    try {
      await api.post('/demo/reset');
      setResult(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setResetting(false);
    }
  };

  const n = result?.interactions?.length ?? 0;

  return (
    <div>
      <h1>Demo</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        Loads a realistic <strong>Acme Technologies</strong> deal with {n || 'several'} historical
        interactions — each one extracted into structured deal facts and retained in Hindsight.
        This wipes whatever is currently in the database.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={loadDemo} disabled={loading || resetting}>
          {loading ? 'Loading & retaining memories…' : 'Load Acme Demo'}
        </button>
        <button className="btn btn-secondary" onClick={resetDemo} disabled={loading || resetting}>
          {resetting ? 'Resetting…' : 'Reset database'}
        </button>
      </div>

      {loading && (
        <div className="card" style={{ marginTop: '1rem', color: '#475569' }}>
          Running LLM extraction + Hindsight retain for every interaction — this can take ~20–40 seconds.
        </div>
      )}

      {error && <div style={{ color: '#b91c1c', marginTop: '0.75rem' }}>{error}</div>}

      {result && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Loaded: {result.deal?.company}</h3>
          <p>${Number(result.deal?.value || 0).toLocaleString()} · {result.deal?.stage}</p>
          <p>
            {n} interactions ·{' '}
            {result.warnings?.length ? `${result.warnings.length} warning(s)` : 'no warnings'}
          </p>

          {result.warnings?.map((w, i) => (
            <div key={i} style={{ fontSize: '0.85rem', color: '#b45309' }}>⚠ {w}</div>
          ))}

          <button
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={() => navigate(`/deal/${result.deal?.id}`)}
          >
            Open Deal Detail →
          </button>
        </div>
      )}
    </div>
  );
}
