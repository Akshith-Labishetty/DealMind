import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errMsg } from '../api.js';

export default function DemoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const loadDemo = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/demo/load');
      setResult({ type: 'single', ...res.data });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const loadAllDeals = async () => {
    setLoadingAll(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/demo/load-all');
      setResult({ type: 'all', count: res.data.dealsCount, deals: res.data.deals });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoadingAll(false);
    }
  };

  const resetDemo = async () => {
    if (!window.confirm('Delete ALL deals, interactions and activity across MongoDB and Hindsight?')) return;
    setResetting(true);
    setError('');
    try {
      await api.post('/demo/reset');
      setResult(null);
      alert('Database & memory banks have been reset cleanly.');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setResetting(false);
    }
  };

  const isBusy = loading || loadingAll || resetting;

  return (
    <div style={{ maxWidth: '840px' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Demo Sandbox & Data Seeder
        </h1>
        <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.925rem' }}>
          Instantly provision realistic enterprise deals with rich meeting transcripts, structured CRM facts, and persistent memory in Hindsight.
        </p>
      </div>

      {error && (
        <div
          className="card"
          style={{
            borderColor: '#fca5a5',
            background: '#fff1f2',
            color: '#b91c1c',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Feature Explainer Card */}
      <div
        className="card"
        style={{
          padding: '1.75rem',
          marginBottom: '1.5rem',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.5rem' }}>
          <span>✨</span> Provision Realistic Deals with Hindsight Memory
        </div>
        <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
          Choose between seeding the single flagship <strong>Acme Technologies</strong> deal (5 meetings) or seeding the <strong>Entire 8-Deal Pipeline</strong> spanning FinTech, Cybersecurity, Aerospace, Healthcare, and Logistics.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>1. MongoDB Persistence</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Raw meeting notes, timeline seq, and CRM entities.</div>
          </div>
          <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>2. LLM Extraction</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Automatic extraction of objections, requirements & risks.</div>
          </div>
          <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>3. Hindsight Semantic Bank</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Isolated entity graphs for each deal with RRF ranking.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Load Acme Solo */}
          <button className="btn btn-primary" onClick={loadDemo} disabled={isBusy}>
            {loading ? 'Ingesting Acme (5 Meetings)…' : '⚡ Load Acme Demo (Solo)'}
          </button>

          {/* Load All Pipeline Deals */}
          <button
            className="btn btn-secondary"
            onClick={loadAllDeals}
            disabled={isBusy}
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              borderColor: '#bfdbfe',
              fontWeight: 700,
            }}
          >
            {loadingAll ? 'Seeding All 8 Pipeline Deals…' : '🌟 Seed All 8 Pipeline Deals'}
          </button>

          {/* Reset All */}
          <button className="btn btn-secondary" onClick={resetDemo} disabled={isBusy} style={{ color: '#b91c1c' }}>
            {resetting ? 'Resetting…' : 'Reset All Deals & Banks'}
          </button>
        </div>
      </div>

      {/* Loading States */}
      {(loading || loadingAll) && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '0.25rem' }}>
            {loadingAll ? 'Ingesting All 8 Enterprise Deals & Retaining Memories…' : 'Ingesting Acme Technologies (5 Meetings)…'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Paced sequentially to respect Groq rate limits. Storing memories in Hindsight Cloud.
          </div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Results Card */}
      {result && (
        <div
          className="card"
          style={{
            padding: '1.75rem',
            border: '1px solid #bbf7d0',
            background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✅</span>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#166534' }}>
              {result.type === 'all'
                ? `All ${result.count || 8} Pipeline Deals Seeded Successfully!`
                : `${result.deal?.company} Demo Ready!`}
            </h3>
          </div>

          <div style={{ color: '#334155', fontSize: '0.9rem', marginBottom: '1rem' }}>
            {result.type === 'all'
              ? 'All 8 deals, their meeting notes, and isolated Hindsight memory banks have been initialized.'
              : `Created deal with ${result.interactions?.length || 5} historical interactions retained in Hindsight.`}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate(result.type === 'all' ? '/' : `/deal/${result.deal?.id}`)}
            >
              {result.type === 'all' ? 'Open Pipeline Dashboard →' : 'Open Deal Workspace →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
