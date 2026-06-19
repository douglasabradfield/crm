import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronRight, Zap } from 'lucide-react';
import { supabase } from '../../services/supabase.js';
import { addContatoAoFluxo } from '../../services/regua.js';

/**
 * Seletor de fluxo de destino para enviar um contato à Régua.
 * Usado no LeadModal (origem='funil') e ClienteModal (origem='cliente').
 */
export default function EnviarParaReguaModal({ contato, origem, onClose, onSuccess }) {
  const [fluxos,   setFluxos]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [erro,     setErro]     = useState('');
  const [query,    setQuery]    = useState('');

  useEffect(() => {
    supabase
      .from('regua_fluxos')
      .select('id, nome, steps, cor, status')
      .eq('status', 'ativo')
      .order('criado_em', { ascending: true })
      .then(({ data }) => { setFluxos(data ?? []); setLoading(false); });
  }, []);

  // Suporte aos dois formatos de contato (lead usa company/contact, cliente usa empresaNome/contato)
  const nomeContato  = contato.contact    ?? contato.contato    ?? '';
  const empresaLabel = contato.company    ?? contato.empresaNome ?? '';
  const emailContato = contato.email      ?? '';

  const filtered = fluxos.filter(f =>
    !query || f.nome.toLowerCase().includes(query.toLowerCase())
  );

  async function handleConfirmar() {
    if (!selected) return;
    setSaving(true); setErro('');

    const fluxo = fluxos.find(f => f.id === selected);
    const result = await addContatoAoFluxo({
      fluxoId:     selected,
      fluxoSteps:  fluxo?.steps ?? [],
      origem,
      leadId:      origem === 'funil'   ? contato.id : undefined,
      clienteId:   origem === 'cliente' ? contato.id : undefined,
      company:     empresaLabel,
      contact:     nomeContato,
      email:       emailContato,
      responsavel: '',
    });

    if (!result.ok) {
      if (result.motivo === 'duplicata') {
        const outraRegua = result.reguaFluxoId
          ? (fluxos.find(f => f.id === result.reguaFluxoId)?.nome ?? 'outro fluxo')
          : 'um fluxo ativo';
        setErro(`Este contato já está na régua (${outraRegua}). Não é possível adicionar novamente.`);
      } else if (result.motivo === 'fluxo_sem_passos') {
        setErro('Este fluxo não tem passos configurados. Adicione pelo menos um passo antes de incluir contatos.');
      } else {
        setErro(result.error ?? 'Erro ao enviar para a régua. Tente novamente.');
      }
      setSaving(false);
      return;
    }

    onSuccess(selected, fluxo?.nome ?? '', result.row);
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 420, maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <Zap size={14} style={{ color: 'var(--teal)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Enviar para a Régua</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {empresaLabel}{nomeContato ? ` · ${nomeContato}` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Busca */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Buscar fluxo..."
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px 7px 30px', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
          </div>
        </div>

        {/* Lista de fluxos */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Carregando fluxos…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
              {fluxos.length === 0 ? 'Nenhum fluxo ativo encontrado. Crie um fluxo na Régua primeiro.' : 'Nenhum fluxo corresponde à busca.'}
            </div>
          ) : filtered.map((f, i) => {
            const isSelected = selected === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelected(f.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '11px 20px',
                  background: isSelected ? 'rgba(91,110,245,0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 10, transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg3)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: `var(${f.cor ?? '--accent'})`, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--accent2)' : 'var(--text)' }}>{f.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{(f.steps ?? []).length} passo(s)</div>
                </div>
                {isSelected && <ChevronRight size={14} style={{ color: 'var(--accent2)', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Erro */}
        {erro && (
          <div style={{ padding: '8px 20px', background: 'rgba(240,92,92,0.1)', borderTop: '1px solid rgba(240,92,92,0.2)', fontSize: 12, color: 'var(--red)', flexShrink: 0 }}>
            {erro}
          </div>
        )}

        {/* Rodapé */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)' }}>
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!selected || saving}
            style={{ padding: '7px 16px', borderRadius: 8, background: selected && !saving ? 'var(--teal)' : 'var(--bg3)', border: 'none', color: selected && !saving ? '#fff' : 'var(--text3)', cursor: selected && !saving ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)', transition: 'all .15s' }}>
            {saving ? 'Enviando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
