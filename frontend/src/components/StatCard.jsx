import React from 'react';

export default function StatCard({ label, value, variant = 'brand' }) {
  const colors = {
    brand: '#2563eb',
    green: '#166534',
    amber: '#b45309',
    red: '#b91c1c',
  };
  return (
    <div className="card stat-card">
      <div style={{ fontSize: '2rem', fontWeight: 700, color: colors[variant] || colors.brand }}>
        {value}
      </div>
      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{label}</div>
    </div>
  );
}
