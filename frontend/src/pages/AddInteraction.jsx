import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, errMsg } from '../api.js';

const TYPES = ['Call', 'Discovery', 'Technical', 'Commercial', 'Security', 'Follow-up', 'Email', 'Workshop'];

export default function AddInteraction() {
  const { id } = useParams();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'Discovery',
    participants: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setResult(null);
    try {
      const params = new URLSearchParams();
      params.append('date', form.date);
      params.append('type', form.type);
      form.participants
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((p) => params.append('participants', p));
      params.append('notes', form.notes);

      const res = await api.post(`/deals/${id}/interactions`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      setResult(res.data);
      setForm((f) => ({ ...f, participants: '', notes: '' }));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
        <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>
          Pipeline
        </Link>
        <span>/</span>
        <Link to={`/deal/${id}`} style={{ color: '#64748b', textDecoration: 'none' }}>
          Deal Detail
        </Link>
        <span>/</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>Log Interaction</span>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Log Customer Interaction
        </h1>
        <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Raw conversation notes are simultaneously ingested into <strong>MongoDB</strong> (structured state), analyzed by the <strong>Groq LLM</strong> (signal extraction), and retained in <strong>Hindsight</strong> (knowledge graph memory).
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

      {/* Form Card */}
      <form onSubmit={submit} className="card" style={{ padding: '1.75rem' }}>
        {/* Interaction Type Segmented Selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ marginBottom: '0.5rem' }}>Interaction Type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: form.type === t ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: form.type === t ? '#eff6ff' : '#f8fafc',
                  color: form.type === t ? '#1d4ed8' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Date and Participants Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label>Meeting Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} required />
          </div>

          <div>
            <label>Participants</label>
            <input
              name="participants"
              value={form.participants}
              onChange={handleChange}
              placeholder="e.g. Sarah Mitchell (CTO), Daniel Choi"
            />
          </div>
        </div>

        {/* Notes Area */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label style={{ margin: 0 }}>Meeting Notes / Transcript</label>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Min 3 characters · Captures requirements, blockers & quotes
            </span>
          </div>
          <textarea
            name="notes"
            rows={6}
            value={form.notes}
            onChange={handleChange}
            required
            minLength={3}
            placeholder="Discussed enterprise pricing concessions, SOC 2 Type II audit report delivery, API rate limits, and confirmed a pilot kickoff for next week..."
            style={{ lineHeight: 1.5 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
          <Link to={`/deal/${id}`} className="btn btn-secondary">
            Cancel
          </Link>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Extracting & Retaining Memory…' : 'Save & Retain in Hindsight →'}
          </button>
        </div>
      </form>

      {/* Live Result Feedback Card */}
      {result && (
        <div
          className="card"
          style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            border: '1px solid #bbf7d0',
            background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🎉</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>
              Interaction Successfully Processed & Retained
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Hindsight Memory Status
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: result.memory?.stored ? '#15803d' : '#b91c1c', marginTop: '0.2rem' }}>
                {result.memory?.stored ? '✓ Retained in Semantic Graph' : '✗ Failed to retain'}
              </div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Structured Updates
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                {result.changes?.length ? `${result.changes.length} deal attributes updated` : 'Deal state verified'}
              </div>
            </div>
          </div>

          {result.extraction?.summary && (
            <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, marginBottom: '0.75rem', padding: '0.75rem', background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <strong>AI Extraction Digest:</strong> {result.extraction.summary}
            </div>
          )}

          {result.changes?.length > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
              <strong>Changes Applied:</strong> {result.changes.join(' · ')}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to={`/deal/${id}`} className="btn btn-primary">
              Return to Deal Detail →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
