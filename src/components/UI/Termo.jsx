import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSARIO } from '../../data/glossario.js';

function normalizar(str) {
  return String(str).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

let _uid = 0;

const TOOLTIP_W = 260;
const MARGIN = 8;

function calcPos(rect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Horizontal: center on term, clamp to viewport with margin
  let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
  left = Math.max(MARGIN, Math.min(left, vw - TOOLTIP_W - MARGIN));

  // Arrow horizontal offset: center of term relative to tooltip left edge
  const centerX = rect.left + rect.width / 2;
  const arrowLeft = Math.max(14, Math.min(TOOLTIP_W - 14, centerX - left));

  // Vertical: show below if not enough room above (estimate ~90px tooltip height)
  const showBelow = rect.top < 90 + MARGIN + 8;

  return {
    left,
    arrowLeft,
    showBelow,
    top:    showBelow ? rect.bottom + 8 : undefined,
    bottom: showBelow ? undefined : vh - rect.top + 8,
  };
}

export default function Termo({ children, id }) {
  const chave = id ?? normalizar(children);
  const definicao = GLOSSARIO[chave];

  const ref = useRef(null);
  const [tooltipId] = useState(() => `termo-${++_uid}`);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [pos, setPos] = useState(null);

  const visible = (hovered || focused || clicked) && !!definicao;

  // Recalculate fixed position each time the tooltip opens
  useEffect(() => {
    if (!visible || !ref.current) { setPos(null); return; }
    setPos(calcPos(ref.current.getBoundingClientRect()));
  }, [visible]);

  // Close (and discard stale position) on scroll or resize
  useEffect(() => {
    if (!visible) return;
    const close = () => { setHovered(false); setFocused(false); setClicked(false); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [visible]);

  // Close on outside click (mobile toggle)
  useEffect(() => {
    if (!clicked) return;
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setClicked(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [clicked]);

  if (!definicao) return <>{children}</>;

  const tooltip = visible && pos
    ? createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'fixed',
            left: pos.left,
            ...(pos.showBelow ? { top: pos.top } : { bottom: pos.bottom }),
            width: TOOLTIP_W,
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
            boxSizing: 'border-box',
          }}
        >
          {definicao}
          {/* Arrow pointing toward the term */}
          <span
            style={{
              position: 'absolute',
              left: pos.arrowLeft,
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              ...(pos.showBelow
                ? {
                    top: -5,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderBottom: '5px solid var(--bg3)',
                  }
                : {
                    bottom: -5,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '5px solid var(--bg3)',
                  }),
            }}
          />
        </span>,
        document.body,
      )
    : null;

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
      {tooltip}
    </span>
  );
}
