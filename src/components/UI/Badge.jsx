const VARIANTS = {
  default: { background: 'var(--bg3)',                       color: 'var(--text2)'  },
  accent:  { background: 'var(--accent-bg)',                  color: 'var(--accent2)'},
  green:   { background: 'rgba(45,  212, 160, 0.12)',         color: 'var(--green)'  },
  amber:   { background: 'rgba(240, 168,  50, 0.12)',         color: 'var(--amber)'  },
  red:     { background: 'rgba(240,  92,  92, 0.12)',         color: 'var(--red)'    },
  purple:  { background: 'rgba(176, 110, 245, 0.12)',         color: 'var(--purple)' },
};

export default function Badge({ children, variant = 'default' }) {
  const style = VARIANTS[variant] ?? VARIANTS.default;
  return (
    <span style={{
      ...style,
      padding: '2px 9px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 500,
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}
