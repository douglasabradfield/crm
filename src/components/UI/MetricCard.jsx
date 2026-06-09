import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

export default function MetricCard({ label, value, change, positive, onAskAI }) {
  const isDown   = change.startsWith('-');
  const Arrow    = isDown ? TrendingDown : TrendingUp;
  const changeColor = positive ? 'var(--green)' : 'var(--red)';

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
        {label}
      </span>

      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: 30,
        color: 'var(--text)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Arrow size={13} style={{ color: changeColor }} />
          <span style={{ fontSize: 12, color: changeColor, fontWeight: 500 }}>{change}</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>vs mês ant.</span>
        </div>

        {onAskAI && (
          <button
            onClick={onAskAI}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '3px 6px', borderRadius: 5,
              border: 'none', background: 'none',
              color: 'var(--text3)', cursor: 'pointer',
              fontSize: 11, fontFamily: 'var(--font-body)',
              transition: 'color 0.13s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          >
            <Sparkles size={11} />
            IA
          </button>
        )}
      </div>
    </div>
  );
}
