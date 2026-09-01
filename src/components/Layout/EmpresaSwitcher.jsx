import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '../../store/auth.js';

/**
 * Seletor de empresa ativa no topo. Só aparece para quem tem 2+ vínculos —
 * hoje ninguém, então na prática não renderiza nada.
 *
 * Ao trocar: chama trocar_empresa_ativa no banco e, dando certo, recarrega a
 * aplicação inteira em "/". É a abordagem mais segura: todos os stores (crm,
 * metas, diretório, redes, diagnóstico...) carregaram dados da empresa anterior
 * e ficariam obsoletos — um reload completo garante que nada de uma empresa
 * vaze para a tela de outra.
 */
export default function EmpresaSwitcher() {
  const { empresas, empresaId, empresaAtiva, trocarEmpresa } = useAuth();
  const [open,     setOpen]     = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [erro,     setErro]     = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Menos de 2 vínculos: nenhum seletor, nenhum espaço vazio.
  if (!empresas || empresas.length < 2) return null;

  async function selecionar(novaEmpresaId) {
    setOpen(false);
    if (novaEmpresaId === empresaId) return;
    setErro(null);
    setTrocando(true);
    const { ok } = await trocarEmpresa(novaEmpresaId);
    if (!ok) {
      setTrocando(false);
      setErro('Não foi possível trocar de empresa. Você pode não ter mais acesso a ela.');
      return;
    }
    // Recarrega tudo já na nova empresa. window.location, não navigate — precisa
    // ser um reload real para zerar todos os stores.
    window.location.assign('/');
  }

  const nomeAtivo = empresaAtiva?.nome ?? 'Empresa';

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        className="btn-ghost"
        onClick={() => setOpen((v) => !v)}
        title="Trocar de empresa"
        style={{ maxWidth: 220 }}
      >
        <Building2 size={13} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nomeAtivo}
        </span>
        <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          minWidth: 240,
          maxWidth: 320,
          background: 'var(--bg3)',
          border: '1px solid var(--border2)',
          borderRadius: 10,
          padding: 4,
          zIndex: 60,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          <div style={{
            fontSize: 11, color: 'var(--text3)', fontWeight: 500,
            padding: '6px 10px 4px', textTransform: 'uppercase', letterSpacing: 0.3,
          }}>
            Suas empresas
          </div>
          {empresas.map((e) => {
            const ativa = e.empresaId === empresaId;
            return (
              <button
                key={e.empresaId}
                onClick={() => selecionar(e.empresaId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', textAlign: 'left',
                  padding: '8px 10px', borderRadius: 8,
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: ativa ? 'var(--text)' : 'var(--text2)',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--bg4)'; }}
                onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.nome}
                </span>
                {ativa && <Check size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}

      {erro && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          minWidth: 240, maxWidth: 320,
          background: 'var(--bg3)', border: '1px solid var(--red)',
          borderRadius: 10, padding: '10px 12px', zIndex: 60,
          fontSize: 12, color: 'var(--text)',
        }}>
          {erro}
          <button
            onClick={() => setErro(null)}
            className="btn-ghost"
            style={{ marginTop: 8, padding: '4px 10px', fontSize: 12 }}
          >
            Entendi
          </button>
        </div>
      )}

      {trocando && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'var(--bg)', opacity: 0.96,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14,
        }}>
          <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 0.9s linear infinite' }} />
          <span style={{ fontSize: 14, color: 'var(--text2)' }}>Trocando de empresa…</span>
        </div>,
        document.body,
      )}
    </div>
  );
}
