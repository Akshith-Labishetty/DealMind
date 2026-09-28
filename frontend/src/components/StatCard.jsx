import React from 'react';

const ICONS = {
  brand: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  amber: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  green: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  red: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

const BG_COLORS = {
  brand: '#eff6ff',
  amber: '#fffbeb',
  green: '#ecfdf5',
  red: '#fff1f2',
};

export default function StatCard({ label, value, variant = 'brand', subtext }) {
  return (
    <div className={`stat-card variant-${variant}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#64748b' }}>{label}</span>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '0.5rem',
            background: BG_COLORS[variant] || BG_COLORS.brand,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {ICONS[variant] || ICONS.brand}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
          {value}
        </span>
        {subtext && (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}
