import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { useAI } from '../../hooks/useAI.js';

const QUICK_CHIPS = [
  'Gerar mais leads',
  'Script de prospecção',
  'Como reduzir meu CAC?',
  'Plano rápido para este mês',
];

function TypingDot({ delay }) {
  return (
    <span style={{
      width: 6, height: 6,
      borderRadius: '50%',
      background: 'var(--text3)',
      display: 'inline-block',
      animation: `bounce-dot 1.2s ease-in-out ${delay}s infinite`,
    }} />
  );
}

function Bubble({ role, content }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '83%',
        padding: '9px 13px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'var(--accent-bg)' : 'var(--bg3)',
        color: isUser ? 'var(--accent2)' : 'var(--text)',
        fontSize: 13,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {content}
      </div>
    </div>
  );
}

export default function AIPanel({ open, onClose, pageContext = '', initialPrompt = '', promptKey = 0 }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const { send, loading, error } = useAI();
  const bottomRef    = useRef(null);
  const textareaRef  = useRef(null);
  const prevKeyRef   = useRef(0);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* Focus on open */
  useEffect(() => {
    if (open && !initialPrompt) {
      const id = setTimeout(() => textareaRef.current?.focus(), 260);
      return () => clearTimeout(id);
    }
  }, [open, initialPrompt]);

  /* Auto-send when opened with a contextual prompt from a card button */
  useEffect(() => {
    if (promptKey > 0 && promptKey !== prevKeyRef.current && initialPrompt) {
      prevKeyRef.current = promptKey;
      const capturedPrompt  = initialPrompt;
      const capturedContext = pageContext;

      setMessages([{ role: 'user', content: capturedPrompt }]);
      setInput('');

      send(capturedPrompt, capturedContext, []).then((reply) => {
        if (reply) {
          setMessages([
            { role: 'user',      content: capturedPrompt },
            { role: 'assistant', content: reply },
          ]);
        }
      });
    }
  }, [promptKey]); // intentionally narrow — captures prompt/context at call time

  /* Auto-resize textarea */
  function resizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  const handleSend = useCallback(async (overrideText) => {
    const userText = (overrideText ?? input).trim();
    if (!userText || loading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const history = messages;
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);

    const reply = await send(userText, pageContext, history);
    if (reply) {
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    }
  }, [input, loading, messages, pageContext, send]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = input.trim().length > 0 && !loading;

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 99,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.22s ease',
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Assistente IA"
        aria-hidden={!open}
        style={{
          position: 'fixed', top: 0, right: 0,
          height: '100vh', width: 380,
          background: 'var(--bg2)',
          borderLeft: '1px solid var(--border)',
          zIndex: 100,
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <span className="pulse-dot" style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--green)', flexShrink: 0,
          }} />
          <Sparkles size={14} style={{ color: 'var(--accent2)', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
            Assistente IA
          </span>
          <button
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center',
              transition: 'color 0.13s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {messages.length === 0 && !loading && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, textAlign: 'center' }}>
                Como posso ajudar?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {QUICK_CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleSend(chip)}
                    tabIndex={open ? 0 : -1}
                    style={{
                      background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', color: 'var(--text2)',
                      fontSize: 12, padding: '8px 12px', cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'var(--font-body)',
                      transition: 'background 0.13s, color 0.13s, border-color 0.13s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background  = 'var(--accent-bg)';
                      e.currentTarget.style.color       = 'var(--accent2)';
                      e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background  = 'var(--bg3)';
                      e.currentTarget.style.color       = 'var(--text2)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => <Bubble key={i} role={msg.role} content={msg.content} />)}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '11px 15px', borderRadius: '14px 14px 14px 4px',
                background: 'var(--bg3)', display: 'flex', gap: 5, alignItems: 'center',
              }}>
                <TypingDot delay={0} />
                <TypingDot delay={0.2} />
                <TypingDot delay={0.4} />
              </div>
            </div>
          )}

          {error && !loading && (
            <div style={{
              padding: '9px 13px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(240,92,92,0.08)',
              border: '1px solid rgba(240,92,92,0.25)',
              color: 'var(--red)', fontSize: 12, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '10px 12px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', gap: 8,
            background: 'var(--bg4)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '8px 10px', alignItems: 'flex-end',
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              tabIndex={open ? 0 : -1}
              placeholder="Pergunte algo..."
              onChange={e => { setInput(e.target.value); resizeTextarea(e.target); }}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)',
                resize: 'none', lineHeight: 1.5, maxHeight: 120, overflow: 'auto',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!canSend}
              tabIndex={open ? 0 : -1}
              style={{
                background: canSend ? 'var(--accent)' : 'var(--bg3)',
                border: 'none', borderRadius: 6,
                cursor: canSend ? 'pointer' : 'default',
                color: canSend ? '#fff' : 'var(--text3)',
                padding: '5px 7px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.13s', flexShrink: 0,
              }}
            >
              <Send size={14} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textAlign: 'center' }}>
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </>
  );
}
