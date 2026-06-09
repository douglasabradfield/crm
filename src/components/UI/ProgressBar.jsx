export default function ProgressBar({ value, color = 'var(--accent)', height = 6 }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div style={{
      background: 'var(--bg4)',
      borderRadius: 99,
      height,
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${pct}%`,
        background: color,
        height: '100%',
        borderRadius: 99,
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}
