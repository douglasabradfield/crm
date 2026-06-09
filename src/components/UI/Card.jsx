import { Sparkles } from 'lucide-react';

export default function Card({ title, children, onAskAI, action, style }) {
  const hasHeader = title || onAskAI || action;

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: hasHeader ? 16 : 0,
      ...style,
    }}>
      {hasHeader && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {title && (
            <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>
              {title}
            </h3>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            {action}
            {onAskAI && (
              <button
                onClick={onAskAI}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 9px', borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'none', cursor: 'pointer',
                  color: 'var(--text3)', fontSize: 11,
                  fontFamily: 'var(--font-body)',
                  transition: 'color 0.13s, border-color 0.13s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--accent2)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text3)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <Sparkles size={11} />
                Perguntar IA
              </button>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
