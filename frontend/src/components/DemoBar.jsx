import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errMsg } from '../api.js';

/**
 * NOTE: this component is not currently mounted anywhere (App routes to
 * pages/DemoPage.jsx instead). It is kept as an embeddable alternative —
 * drop it into any page to get an inline "load the demo" button.
 */
export default function DemoBar() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/demo/load');
      const { deal, interactions, timeline, warnings } = res.data;
      setLoaded(true);
      // stash into window so any out-of-React demo script can pick it up
      window.__dealmindDeal = deal;
      window.__dealmindInteractions = (interactions || []).map((i) => ({
        ...i,
        date: i.date ? new Date(i.date).toISOString() : i.date,
        extraction: i.extraction || null,
        memoryStored: i.memoryStored || false,
        memoryError: i.memoryError || '',
      }));
      window.__dealmindTimeline = timeline;
      if (deal?.id) navigate(`/deal/${deal.id}`);
      return warnings;
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  if (loaded) return null;

  return (
    <section className="container">
      <h1 className="text-2xl font-bold mb-4">Demo</h1>
      <p className="muted mb-4">
        Click below to load a realistic Acme Technologies deal with historical
        interactions already retained in Hindsight.
      </p>
      {loading && <div>Loading demo…</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <button type="button" onClick={load} className="btn btn-primary" disabled={loading}>
        {loading ? 'Loading…' : 'Load Acme Demo'}
      </button>
    </section>
  );
}