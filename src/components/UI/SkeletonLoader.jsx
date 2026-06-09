const pulse = {
  animation: 'skeleton-pulse 1.4s ease-in-out infinite',
  background: 'linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%)',
  backgroundSize: '400% 100%',
  borderRadius: 8,
};

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('skeleton-style')) {
  const s = document.createElement('style');
  s.id = 'skeleton-style';
  s.textContent = '@keyframes skeleton-pulse { 0%{background-position:100% 50%} 100%{background-position:0% 50%} }';
  document.head.appendChild(s);
}

function SkeletonBlock({ width = '100%', height = 16, style }) {
  return <div style={{ ...pulse, width, height, ...style }} />;
}

// Full-page loading state shown while Supabase session is being verified.
export function SkeletonPageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--bg4)', borderTop: '3px solid var(--accent)', animation: 'spin .7s linear infinite' }} />
      <p style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-body)' }}>Verificando sessão…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Generic card skeleton
export default function SkeletonLoader({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonBlock height={14} width="40%" />
          <SkeletonBlock height={12} width="70%" />
          <SkeletonBlock height={12} width="55%" />
        </div>
      ))}
    </div>
  );
}
