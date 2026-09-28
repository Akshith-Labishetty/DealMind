import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, errMsg } from '../api.js';

const TYPES = ['Call', 'Discovery', 'Technical', 'Commercial', 'Security', 'Follow-up', 'Email', 'Workshop'];

export default function AddInteraction() {
  const { id } = useParams();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'Call',
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
      form.participants.split(',').map((p) => p.trim()).filter(Boolean).forEach((p) => params.append('participants', p));
      params.append('notes', form.notes);

      const res = await api.post(`/deals/${id}/interactions`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      // Keep the result on screen (extraction + memory status) instead of
      // navigating straight past it — this is the interesting part of the demo.
      setResult(res.data);
      setForm((f) => ({ ...f, participants: '', notes: '' }));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Add Interaction</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        The note is saved to MongoDB, parsed into structured deal facts by the LLM, and retained in Hindsight.
      </p>

      {error && <div className="card" style={{ borderColor: '#fca5a5', color: '#b91c1c', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={submit} className="card" style={{ maxWidth: '520px' }}>
        <label>Date</label>
        <input type="date" name="date" value={form.date} onChange={handleChange} required />

        <label style={{ marginTop: '0.5rem' }}>Type</label>
        <select name="type" value={form.type} onChange={handleChange}>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>

        <label style={{ marginTop: '0.5rem' }}>Participants (comma-separated)</label>
        <input name="participants" value={form.participants} onChange={handleChange} placeholder="Sarah Mitchell, Dana Reed" />

        <label style={{ marginTop: '0.5rem' }}>Notes</label>
        <textarea
          name="notes"
          rows={5}
          value={form.notes}
          onChange={handleChange}
          required
          minLength={3}
          placeholder="What was discussed? Requirements, objections, commitments, next steps…"
        />

        <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: '1rem' }}>
          {saving ? 'Saving & remembering…' : 'Log Interaction'}
        </button>
      </form>

      {result && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>✓ Interaction logged</h3>

          <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            <strong>Memory stored in Hindsight:</strong>{' '}
            <span style={{ color: result.memory?.stored ? '#166534' : '#b91c1c' }}>
              {result.memory?.stored ? '✓ yes' : '✗ no'}
            </span>
            {result.memory?.error ? <div style={{ color: '#b91c1c' }}>{result.memory.error}</div> : null}
          </div>

          <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            <strong>Structured extraction:</strong>{' '}
            {result.extractionError
              ? <span style={{ color: '#b91c1c' }}>{result.extractionError}</span>
              : result.extraction?.summary || '—'}
          </div>

          {result.extraction?.objections?.length > 0 && (
            <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              Objections: {result.extraction.objections.map((o) => `${o.subject} (${o.status})`).join(', ')}
            </div>
          )}

          <div style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#475569' }}>
            <strong>Deal updated:</strong> {result.changes?.length ? result.changes.join('; ') : 'nothing new'}
          </div>

          <Link to={`/deal/${id}`} className="btn btn-primary">Open the deal →</Link>
        </div>
      )}
    </div>
  );
}
