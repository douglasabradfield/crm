import { useState, useEffect, useRef } from 'react';
import { GLOSSARIO } from '../../data/glossario.js';

function normalizar(str) {
  return String(str).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

let _uid = 0;

export default function Termo({ children, id }) {
  const chave = id ?? normalizar(children);
  const definicao = GLOSSARIO[chave];

  const ref = useRef(null);
  const [tooltipId] = useState(() => `termo-${++_uid}`);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [clicked, setClicked] = useState(false);

  const visible = (hovered || focused || clicked) && !!definicao;

  useEffect(() => {
    if (!clicked) return;
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setClicked(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [clicked]);

  if (!definicao) return <>{children}</>;

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={(e) => { e.stopPropagation(); setClicked(v => !v); }}
      tabIndex={0}
      aria-describedby={tooltipId}
    >
      <span style={{ borderBottom: '1px dotted var(--text3)', cursor: 'help', outline: 'none' }}>
        {children}
      </span>

      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 260,
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12,
            color: 'var(--text2)',
            lineHeight: 1.55,
            zIndex: 9999,
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
            whiteSpace: 'normal',
            textAlign: 'left',
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
          }}
        >
          {definicao}
          <span style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid var(--bg3)',
          }} />
        </span>
      )}
    </span>
  );
}
