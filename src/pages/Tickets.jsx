import { useState, useMemo, useEffect } from 'react';
import {
  Search, AlertTriangle, CheckCircle2, Clock, Loader2,
  ChevronDown, User, Calendar, Flag, Star, Plus, X, Trash2,
} from 'lucide-react';
import { useAuth } from '../store/auth.js';
import { supabase } from '../services/supabase.js';
import SkeletonLoader from '../components/UI/SkeletonLoader.jsx';

const MOCK_TICKETS = [
  // Externos
  {
    id: 1, num: '001',
    titulo: 'Erro no relatório de vendas exportado',
    tipo: 'externo', categoria: 'suporte', prioridade: 'alta', status: 'aberto',
    cliente: 'Tech Solutions Ltda',
    responsavel: { nome: 'Ana Lima', avatar: 'AL' },
    abertura: '2026-05-20', prazo: '2026-05-24',
    descricao: 'Cliente relata que o PDF exportado apresenta colunas desalinhadas.',
    csat: { nota: null, comentario: '', data: null, avaliado: false },
  },
  {
    id: 2, num: '002',
    titulo: 'Dúvida sobre cobrança da fatura de abril',
    tipo: 'externo', categoria: 'financeiro', prioridade: 'media', status: 'em_andamento',
    cliente: 'Grupo Inovação SA',
    responsavel: { nome: 'Douglas Admin', avatar: 'DA' },
    abertura: '2026-05-21', prazo: '2026-05-27',
    descricao: 'Cliente questiona cobrança duplicada identificada em abril.',
    csat: { nota: null, comentario: '', data: null, avaliado: false },
  },
  {
    id: 3, num: '003',
    titulo: 'Solicitar atualização de contrato',
    tipo: 'externo', categoria: 'comercial', prioridade: 'baixa', status: 'aguardando_cliente',
    cliente: 'Comercial Norte ME',
    responsavel: { nome: 'Carlos Melo', avatar: 'CM' },
    abertura: '2026-05-22', prazo: '2026-05-30',
    descricao: 'Aguardando assinatura do aditivo pelo cliente.',
    csat: { nota: null, comentario: '', data: null, avaliado: false },
  },
  // Internos
  {
    id: 4, num: '004',
    titulo: 'Atualizar template de proposta comercial',
    tipo: 'interno', categoria: 'comercial', prioridade: 'media', status: 'aberto',
    cliente: null,
    responsavel: { nome: 'Ana Lima', avatar: 'AL' },
    abertura: '2026-05-18', prazo: '2026-05-22',
    descricao: 'Template atual está desatualizado com a nova identidade visual.',
    csat: { nota: null, comentario: '', data: null, avaliado: false },
  },
  {
    id: 5, num: '005',
    titulo: 'Revisar política de desconto máximo',
    tipo: 'interno', categoria: 'comercial', prioridade: 'alta', status: 'em_andamento',
    cliente: null,
    responsavel: { nome: 'Douglas Admin', avatar: 'DA' },
    abertura: '2026-05-19', prazo: '2026-05-25',
    descricao: 'Definir teto de desconto por perfil de vendedor.',
    csat: { nota: null, comentario: '', data: null, avaliado: false },
  },
  {
    id: 6, num: '006',
    titulo: 'Ajustar permissões do perfil Gestor',
    tipo: 'interno', categoria: 'interno', prioridade: 'baixa', status: 'concluido',
    cliente: null,
    responsavel: { nome: 'Douglas Admin', avatar: 'DA' },
    abertura: '2026-05-15', prazo: '2026-05-20',
    descricao: 'Removido acesso a Configurações para perfil Gestor.',
    csat: { nota: null, comentario: '', data: null, avaliado: false },
  },
  {
    id: 7, num: '007',
    titulo: 'Integrar CRM com novo ERP da empresa',
    tipo: 'interno', categoria: 'produto', prioridade: 'alta', status: 'aberto',
    cliente: null,
    responsavel: { nome: 'Carlos Melo', avatar: 'CM' },
    abertura: '2026-05-23', prazo: '2026-05-28',
    descricao: 'Mapear endpoints do ERP para sincronização de clientes e pedidos.',
    csat: { nota: null, comentario: '', data: null, avaliado: false },
  },
  {
    id: 8, num: '008',
    titulo: 'Relatório NPS consolidado do Q1 2026',
    tipo: 'interno', categoria: 'produto', prioridade: 'media', status: 'concluido',
    cliente: null,
    responsavel: { nome: 'Ana Lima', avatar: 'AL' },
    abertura: '2026-05-10', prazo: '2026-05-17',
    descricao: 'NPS Q1: 72 pontos. Relatório enviado para diretoria.',
    csat: { nota: null, comentario: '', data: null, avaliado: false },
  },
];

function ticketFromRow(r) {
  return {
    id: r.id,
    num: r.num,
    titulo: r.titulo,
    tipo: r.tipo,
    categoria: r.categoria,
    prioridade: r.prioridade,
    status: r.status,
    cliente: r.cliente ?? null,
    clienteId: r.cliente_id ?? null,
    responsavel: { nome: r.responsavel_nome ?? '', avatar: r.responsavel_avatar ?? '' },
    abertura: r.abertura,
    prazo: r.prazo,
    descricao: r.descricao ?? '',
    csat: r.csat ?? { nota: null, comentario: '', data: null, avaliado: false },
    andamentos: r.andamentos ?? [],
  };
}

function ticketToRow(t) {
  return {
    num: t.num,
    titulo: t.titulo,
    tipo: t.tipo,
    categoria: t.categoria,
    prioridade: t.prioridade,
    status: t.status,
    cliente: t.cliente ?? null,
    cliente_id: t.clienteId ?? null,
    responsavel_nome: t.responsavel?.nome ?? '',
    responsavel_avatar: t.responsavel?.avatar ?? '',
    abertura: t.abertura,
    prazo: t.prazo,
    descricao: t.descricao ?? '',
    csat: t.csat ?? { nota: null, comentario: '', data: null, avaliado: false },
    andamentos: t.andamentos ?? [],
  };
}

function makeAvatar(nome) {
  return (nome || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || 'U';
}

function nextNum(tickets) {
  if (tickets.length === 0) return '001';
  const max = Math.max(...tickets.map(t => parseInt(t.num, 10) || 0));
  return String(max + 1).padStart(3, '0');
}

const TODAY = new Date().toISOString().split('T')[0];

function isVencido(ticket) {
  return ticket.status !== 'concluido' && ticket.status !== 'cancelado' && ticket.prazo != null && ticket.prazo < TODAY;
}

const PRIORIDADE_ORDER = { alta: 0, media: 1, baixa: 2 };

const STATUS_CFG = {
  aberto:           { label: 'Aberto',             bg: 'rgba(240,92,92,0.12)',    color: 'var(--red)',    border: 'rgba(240,92,92,0.25)'    },
  em_andamento:     { label: 'Em andamento',        bg: 'rgba(91,110,245,0.12)',   color: 'var(--accent2)', border: 'rgba(91,110,245,0.25)'  },
  aguardando_cliente:{ label: 'Aguardando cliente', bg: 'rgba(240,168,50,0.12)',  color: 'var(--amber)',  border: 'rgba(240,168,50,0.25)'   },
  concluido:        { label: 'Concluído',           bg: 'rgba(45,212,160,0.10)',   color: 'var(--green)', border: 'rgba(45,212,160,0.22)'   },
  cancelado:        { label: 'Cancelado',           bg: 'rgba(140,140,150,0.12)', color: 'var(--text3)', border: 'rgba(140,140,150,0.25)'  },
};

const PRIORIDADE_CFG = {
  alta:  { label: 'Alta',  color: 'var(--red)'   },
  media: { label: 'Média', color: 'var(--amber)' },
  baixa: { label: 'Baixa', color: 'var(--text3)' },
};

const CATEGORIA_LABELS = {
  suporte:    'Suporte',
  comercial:  'Comercial',
  financeiro: 'Financeiro',
  produto:    'Produto',
  interno:    'Interno',
};

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ─── Metric Card ─────────────────────────────────────────────────────────── */
function MetCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '18px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Filter Select ───────────────────────────────────────────────────────── */
function FilterSelect({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '7px 30px 7px 11px',
          color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
          outline: 'none', appearance: 'none', fontFamily: 'var(--font-body)',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
    </div>
  );
}

/* ─── Ticket Card ─────────────────────────────────────────────────────────── */
function TicketCard({ ticket, onEvaluate, onClick }) {
  const vencido = isVencido(ticket);
  const stCfg = STATUS_CFG[ticket.status];
  const prCfg = PRIORIDADE_CFG[ticket.prioridade];

  const csat = ticket.csat ?? { nota: null, comentario: '', data: null, avaliado: false };
  const [formVisible, setFormVisible] = useState(
    ticket.status === 'concluido' && !csat.avaliado,
  );
  const [formNota, setFormNota] = useState(5);
  const [formComentario, setFormComentario] = useState('');

  const csatColor = (n) => n >= 4 ? 'var(--green)' : n >= 3 ? 'var(--amber)' : 'var(--red)';

  function submitEvaluation() {
    onEvaluate(ticket.id, { nota: formNota, comentario: formComentario, data: TODAY, avaliado: true });
    setFormVisible(false);
  }

  return (
    <div onClick={onClick} style={{
      background: 'var(--bg2)',
      border: `1px solid ${vencido ? 'rgba(240,92,92,0.35)' : 'var(--border)'}`,
      borderRadius: 12, overflow: 'hidden',
      transition: 'border-color 0.15s',
      cursor: 'pointer',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* ID + prioridade stripe */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 42 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', fontFamily: 'monospace' }}>#{ticket.num}</span>
          <div style={{ width: 3, flex: 1, borderRadius: 2, minHeight: 32, background: prCfg.color, opacity: 0.7 }} />
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 7 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: vencido ? 'var(--red)' : 'var(--text)', flex: 1, minWidth: 200 }}>
              {ticket.titulo}
              {vencido && (
                <AlertTriangle size={13} style={{ color: 'var(--red)', marginLeft: 7, verticalAlign: 'middle', display: 'inline' }} />
              )}
            </span>
            <span style={{
              fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap',
              background: stCfg.bg, color: stCfg.color, border: `1px solid ${stCfg.border}`,
            }}>
              {stCfg.label}
            </span>
          </div>

          {/* Tags row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{
              fontSize: 11, padding: '1px 8px', borderRadius: 20, fontWeight: 600,
              background: ticket.tipo === 'externo' ? 'rgba(56,201,224,0.1)' : 'rgba(176,110,245,0.1)',
              color: ticket.tipo === 'externo' ? 'var(--teal)' : 'var(--purple)',
              border: `1px solid ${ticket.tipo === 'externo' ? 'rgba(56,201,224,0.2)' : 'rgba(176,110,245,0.2)'}`,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {ticket.tipo === 'externo' ? 'Externo' : 'Interno'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{CATEGORIA_LABELS[ticket.categoria]}</span>
            <span style={{ fontSize: 12, color: prCfg.color, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flag size={11} />
              {prCfg.label}
            </span>
            {ticket.cliente && (
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>· {ticket.cliente}</span>
            )}
          </div>

          {/* Footer row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', fontSize: 9, fontWeight: 600,
                background: 'var(--accent-bg)', color: 'var(--accent2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {ticket.responsavel.avatar}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{ticket.responsavel.nome}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text3)' }}>
              <Calendar size={12} />
              Aberto em {fmtDate(ticket.abertura)}
            </div>

            {ticket.prazo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: vencido ? 'var(--red)' : 'var(--text3)' }}>
                <Clock size={12} />
                Prazo: {fmtDate(ticket.prazo)}
                {vencido && <span style={{ fontWeight: 600 }}> — Vencido</span>}
              </div>
            )}

            {/* CSAT display after evaluation */}
            {csat.avaliado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                <span style={{ fontSize: 14, color: csatColor(csat.nota), letterSpacing: 1 }}>
                  {'★'.repeat(csat.nota)}{'☆'.repeat(5 - csat.nota)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(csat.data)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline CSAT evaluation form */}
      {ticket.status === 'concluido' && formVisible && (
        <div onClick={e => e.stopPropagation()} style={{
          borderTop: '1px solid var(--border)', padding: '14px 18px 16px',
          background: 'var(--bg3)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
            Como foi o atendimento?
          </div>

          {/* Nota buttons */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setFormNota(n)}
                style={{
                  width: 36, height: 36, borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${formNota === n ? csatColor(n) : 'var(--border)'}`,
                  background: formNota === n ? `color-mix(in srgb, ${csatColor(n)} 15%, transparent)` : 'var(--bg4)',
                  color: formNota === n ? csatColor(n) : 'var(--text3)',
                  fontSize: 14, fontWeight: formNota === n ? 700 : 400,
                  fontFamily: 'var(--font-body)',
                }}>
                {n}
              </button>
            ))}
            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>
              {formNota >= 4 ? 'Satisfeito' : formNota >= 3 ? 'Neutro' : 'Insatisfeito'}
            </span>
          </div>

          {/* Comentário */}
          <textarea
            value={formComentario}
            onChange={(e) => setFormComentario(e.target.value.slice(0, 200))}
            placeholder="Comentário opcional..."
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              background: 'var(--bg4)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '7px 10px', color: 'var(--text)',
              fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', lineHeight: 1.5,
            }}
          />
          {formComentario.length > 0 && (
            <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'right', marginTop: 3, marginBottom: 4 }}>
              {formComentario.length}/200
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <button onClick={submitEvaluation}
              style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 8, padding: '7px 16px', fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 500,
              }}>
              Enviar avaliação
            </button>
            <button onClick={() => setFormVisible(false)}
              style={{
                background: 'none', border: 'none', color: 'var(--text3)',
                fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
                textDecoration: 'underline', padding: 0,
              }}>
              Pular
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Ticket Detalhe Modal ───────────────────────────────────────────────────── */
function TicketDetalheModal({ ticket, onClose, onUpdateStatus, onUpdateResponsavel, onDelete, onAddAndamento, isAdmin }) {
  const stCfg   = STATUS_CFG[ticket.status] ?? STATUS_CFG.aberto;
  const prCfg   = PRIORIDADE_CFG[ticket.prioridade] ?? PRIORIDADE_CFG.media;
  const vencido = isVencido(ticket);

  const [novoResp,       setNovoResp]       = useState(ticket.responsavel.nome);
  const [savingResp,     setSavingResp]     = useState(false);
  const [savingStatus,   setSavingStatus]   = useState(false);
  const [confirmDel,     setConfirmDel]     = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [novoAndamento,  setNovoAndamento]  = useState('');
  const [savingAndamento,setSavingAndamento]= useState(false);

  const { user } = useAuth();
  const autorNome = user?.nome || user?.name || user?.email || 'Usuário';

  const csat = ticket.csat;
  const csatColor = (n) => n >= 4 ? 'var(--green)' : n >= 3 ? 'var(--amber)' : 'var(--red)';

  async function changeStatus(newStatus) {
    if (newStatus === ticket.status || savingStatus) return;
    setSavingStatus(true);
    await onUpdateStatus(ticket.id, newStatus);
    setSavingStatus(false);
  }

  async function saveResp() {
    const trimmed = novoResp.trim();
    if (!trimmed || trimmed === ticket.responsavel.nome) return;
    setSavingResp(true);
    await onUpdateResponsavel(ticket.id, trimmed);
    setSavingResp(false);
  }

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    await onDelete(ticket.id);
  }

  async function handleAddAndamento() {
    const texto = novoAndamento.trim();
    if (texto.length < 3) return;
    setSavingAndamento(true);
    const newItem = { id: crypto.randomUUID(), texto, autor_nome: autorNome, data: new Date().toISOString() };
    const newAndamentos = [...(ticket.andamentos ?? []), newItem];
    await onAddAndamento(ticket.id, newAndamentos);
    setSavingAndamento(false);
    setNovoAndamento('');
  }

  const inpStyle = {
    background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 12px', fontSize: 13, color: 'var(--text)',
    fontFamily: 'var(--font-body)', flex: 1, boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, width: 560, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', fontFamily: 'monospace' }}>#{ticket.num}</span>
              <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 500, background: stCfg.bg, color: stCfg.color, border: `1px solid ${stCfg.border}` }}>
                {stCfg.label}
              </span>
              {vencido && <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>· Vencido</span>}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{ticket.titulo}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', flexShrink: 0, marginLeft: 12 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px 12px', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Tipo</span>
            <span>
              <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, fontWeight: 600,
                background: ticket.tipo === 'externo' ? 'rgba(56,201,224,0.1)' : 'rgba(176,110,245,0.1)',
                color: ticket.tipo === 'externo' ? 'var(--teal)' : 'var(--purple)',
                border: `1px solid ${ticket.tipo === 'externo' ? 'rgba(56,201,224,0.2)' : 'rgba(176,110,245,0.2)'}`,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>{ticket.tipo === 'externo' ? 'Externo' : 'Interno'}</span>
            </span>

            {ticket.cliente && <>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Cliente</span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{ticket.cliente}</span>
            </>}

            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Categoria</span>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{CATEGORIA_LABELS[ticket.categoria] ?? ticket.categoria}</span>

            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Prioridade</span>
            <span style={{ fontSize: 13, color: prCfg.color, fontWeight: 500 }}>{prCfg.label}</span>

            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Abertura</span>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{fmtDate(ticket.abertura)}</span>

            {ticket.prazo && <>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Prazo</span>
              <span style={{ fontSize: 13, color: vencido ? 'var(--red)' : 'var(--text)' }}>
                {fmtDate(ticket.prazo)}{vencido ? ' — Vencido' : ''}
              </span>
            </>}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Descrição */}
          {ticket.descricao && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.04em' }}>DESCRIÇÃO</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ticket.descricao}</div>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Andamentos */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, fontWeight: 500, letterSpacing: '0.04em' }}>
              ANDAMENTOS
              {(ticket.andamentos ?? []).length > 0 && (
                <span style={{ fontWeight: 400, marginLeft: 5 }}>({ticket.andamentos.length})</span>
              )}
            </div>

            {(ticket.andamentos ?? []).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', paddingBottom: 4 }}>
                Nenhum andamento registrado ainda.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ticket.andamentos.map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(91,110,245,0.12)', color: 'var(--accent2)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 3 }}>
                      {makeAvatar(a.autor_nome)}
                    </div>
                    <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '9px 12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{a.autor_nome}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDateTime(a.data)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.texto}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar novo andamento */}
            <div style={{ marginTop: 10 }}>
              <textarea
                value={novoAndamento}
                onChange={e => setNovoAndamento(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddAndamento(); }}
                placeholder="Adicionar andamento... (Ctrl+Enter para registrar)"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', lineHeight: 1.5 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button onClick={handleAddAndamento}
                  disabled={savingAndamento || novoAndamento.trim().length < 3}
                  style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)', transition: 'all .15s', border: 'none', cursor: (savingAndamento || novoAndamento.trim().length < 3) ? 'default' : 'pointer', background: (savingAndamento || novoAndamento.trim().length < 3) ? 'var(--bg3)' : 'var(--accent)', color: (savingAndamento || novoAndamento.trim().length < 3) ? 'var(--text3)' : '#fff' }}>
                  {savingAndamento ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>

          {/* CSAT (se concluído e avaliado) */}
          {ticket.status === 'concluido' && csat?.avaliado && (
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.04em' }}>AVALIAÇÃO CSAT</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, color: csatColor(csat.nota), letterSpacing: 2 }}>
                  {'★'.repeat(csat.nota)}{'☆'.repeat(5 - csat.nota)}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{csat.nota}/5</span>
                {csat.data && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(csat.data)}</span>}
              </div>
              {csat.comentario && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8, lineHeight: 1.5, fontStyle: 'italic' }}>{csat.comentario}</div>
              )}
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Editable: Responsável */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.04em' }}>
              RESPONSÁVEL
              {savingResp && <span style={{ fontWeight: 400, marginLeft: 6 }}>— salvando...</span>}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(91,110,245,0.15)', color: 'var(--accent2)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {makeAvatar(novoResp)}
              </div>
              <input style={inpStyle} value={novoResp}
                onChange={e => setNovoResp(e.target.value)}
                onBlur={saveResp}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                placeholder="Nome do responsável..."
              />
            </div>
          </div>

          {/* Editable: Status */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.04em' }}>
              MUDAR STATUS
              {savingStatus && <span style={{ fontWeight: 400, marginLeft: 6 }}>— salvando...</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                <button key={key} onClick={() => changeStatus(key)} disabled={savingStatus}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                    cursor: savingStatus || ticket.status === key ? 'default' : 'pointer',
                    fontFamily: 'var(--font-body)', transition: 'all .12s',
                    background: ticket.status === key ? cfg.bg : 'transparent',
                    color: ticket.status === key ? cfg.color : 'var(--text3)',
                    border: `1px solid ${ticket.status === key ? cfg.border : 'var(--border)'}`,
                    opacity: ticket.status === key ? 1 : 0.8,
                  }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            {isAdmin && (
              <button onClick={handleDelete} disabled={deleting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: deleting ? 'default' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s', background: confirmDel ? 'rgba(240,92,92,0.15)' : 'transparent', border: `1px solid ${confirmDel ? 'rgba(240,92,92,0.4)' : 'var(--border)'}`, color: confirmDel ? 'var(--red)' : 'var(--text3)' }}>
                <Trash2 size={13} />
                {deleting ? 'Excluindo...' : confirmDel ? 'Confirmar exclusão' : 'Excluir ticket'}
              </button>
            )}
          </div>
          <button onClick={onClose} style={{ padding: '7px 20px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Novo Ticket Modal ──────────────────────────────────────────────────────── */
function NovoTicketModal({ onSave, onClose, empresaId }) {
  const [tipo,           setTipo]           = useState('externo');
  const [titulo,         setTitulo]         = useState('');
  const [clienteId,      setClienteId]      = useState('');
  const [clienteNome,    setClienteNome]    = useState('');
  const [categoria,      setCategoria]      = useState('suporte');
  const [prioridade,     setPrioridade]     = useState('media');
  const [prazo,          setPrazo]          = useState('');
  const [descricao,      setDescricao]      = useState('');
  const [responsavelNome,setResponsavelNome]= useState('');
  const [clientes,       setClientes]       = useState([]);
  const [saving,         setSaving]         = useState(false);
  const [erro,           setErro]           = useState('');

  useEffect(() => {
    if (tipo !== 'externo' || !empresaId) return;
    supabase.from('clientes').select('id, company').eq('empresa_id', empresaId).order('company').then(({ data }) => {
      if (data) setClientes(data);
    });
  }, [tipo, empresaId]);

  async function handleSave() {
    if (!titulo.trim()) { setErro('Título é obrigatório.'); return; }
    if (tipo === 'externo' && !clienteId) { setErro('Selecione um cliente.'); return; }
    setSaving(true);
    setErro('');
    await onSave({ tipo, titulo: titulo.trim(), clienteId: tipo === 'externo' ? clienteId : null, clienteNome: tipo === 'externo' ? clienteNome : null, categoria, prioridade, prazo, descricao: descricao.trim(), responsavelNome: responsavelNome.trim() });
    setSaving(false);
  }

  const inp = {
    background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 12px', fontSize: 13, color: 'var(--text)',
    fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, width: 520, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Novo chamado</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {/* Tipo */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>TIPO</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['externo', 'Externo (cliente)', 'suporte'], ['interno', 'Interno (equipe)', 'comercial']].map(([v, lbl, catDefault]) => (
                <button key={v} onClick={() => { setTipo(v); setClienteId(''); setClienteNome(''); setCategoria(catDefault); }}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .12s', border: '1px solid', background: tipo === v ? 'rgba(91,110,245,0.15)' : 'transparent', borderColor: tipo === v ? 'var(--accent)' : 'var(--border)', color: tipo === v ? 'var(--accent2)' : 'var(--text3)' }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>TÍTULO <span style={{ color: 'var(--red)' }}>*</span></label>
            <input style={inp} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Descreva o chamado brevemente..." />
          </div>

          {/* Cliente (externo only) */}
          {tipo === 'externo' && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>CLIENTE <span style={{ color: 'var(--red)' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <select style={{ ...inp, cursor: 'pointer', appearance: 'none', paddingRight: 30 }}
                  value={clienteId}
                  onChange={e => {
                    const opt = clientes.find(c => c.id === e.target.value);
                    setClienteId(e.target.value);
                    setClienteNome(opt?.company ?? '');
                  }}>
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              </div>
            </div>
          )}

          {/* Categoria + Prioridade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>CATEGORIA</label>
              <div style={{ position: 'relative' }}>
                <select style={{ ...inp, cursor: 'pointer', appearance: 'none', paddingRight: 30 }} value={categoria} onChange={e => setCategoria(e.target.value)}>
                  {tipo === 'externo'
                    ? [['suporte','Suporte'],['financeiro','Financeiro'],['comercial','Comercial']].map(([v,l]) => <option key={v} value={v}>{l}</option>)
                    : [['comercial','Comercial'],['produto','Produto'],['interno','Interno']].map(([v,l]) => <option key={v} value={v}>{l}</option>)
                  }
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>PRIORIDADE</label>
              <div style={{ position: 'relative' }}>
                <select style={{ ...inp, cursor: 'pointer', appearance: 'none', paddingRight: 30 }} value={prioridade} onChange={e => setPrioridade(e.target.value)}>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Prazo */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>PRAZO</label>
            <input type="date" style={inp} value={prazo} onChange={e => setPrazo(e.target.value)} min={TODAY} />
          </div>

          {/* Responsável */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>RESPONSÁVEL</label>
            <input style={inp} value={responsavelNome} onChange={e => setResponsavelNome(e.target.value)} placeholder="Nome do responsável..." />
          </div>

          {/* Descrição */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>DESCRIÇÃO</label>
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes do chamado..." />
          </div>

          {erro && (
            <div style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(240,92,92,0.08)', border: '1px solid rgba(240,92,92,0.25)', borderRadius: 8, padding: '8px 12px' }}>
              {erro}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, position: 'sticky', bottom: 0, background: 'var(--bg2)' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-body)', background: saving ? 'var(--bg3)' : 'var(--accent)', border: 'none', color: saving ? 'var(--text3)' : '#fff' }}>
            {saving ? 'Salvando...' : 'Abrir chamado'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Tickets() {
  const { empresaId, user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role) || ['admin', 'superadmin'].includes(user?.papel);
  const [tickets,        setTickets]        = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [filtros, setFiltros] = useState({
    tipo: 'todos', status: 'todos', prioridade: 'todos', categoria: 'todos', busca: '',
  });
  const [ordem, setOrdem] = useState('mais_recente');
  const [showModal,         setShowModal]         = useState(false);
  const [selectedTicketId,  setSelectedTicketId]  = useState(null);
  const [mostrarCancelados, setMostrarCancelados] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });
      if (cancelled) return;
      let rows = data ?? [];
      if (rows.length === 0) {
        const seedRows = MOCK_TICKETS.map(ticketToRow);
        const { data: ins } = await supabase.from('tickets').insert(seedRows).select();
        if (cancelled) return;
        rows = ins ?? [];
      }
      if (!cancelled) {
        setTickets(rows.map(ticketFromRow));
        setLoadingTickets(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [empresaId]);

  function setFiltro(key, val) {
    setFiltros(f => ({ ...f, [key]: val }));
  }

  const selectedTicket = selectedTicketId ? (tickets.find(t => t.id === selectedTicketId) ?? null) : null;

  async function handleEvaluate(ticketId, evaluation) {
    const newCsat = { nota: evaluation.nota, comentario: evaluation.comentario, data: evaluation.data, avaliado: true };
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, csat: { ...t.csat, ...newCsat } } : t));
    await supabase.from('tickets').update({ csat: newCsat, atualizado_em: new Date().toISOString() }).eq('id', ticketId);
  }

  async function handleUpdateStatus(ticketId, newStatus) {
    const { data } = await supabase.from('tickets')
      .update({ status: newStatus, atualizado_em: new Date().toISOString() })
      .eq('id', ticketId).select().single();
    if (data) setTickets(prev => prev.map(t => t.id === ticketId ? ticketFromRow(data) : t));
  }

  async function handleUpdateResponsavel(ticketId, nome) {
    const avatar = makeAvatar(nome);
    const { data } = await supabase.from('tickets')
      .update({ responsavel_nome: nome, responsavel_avatar: avatar, atualizado_em: new Date().toISOString() })
      .eq('id', ticketId).select().single();
    if (data) setTickets(prev => prev.map(t => t.id === ticketId ? ticketFromRow(data) : t));
  }

  async function handleDelete(ticketId) {
    await supabase.from('tickets').delete().eq('id', ticketId);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setSelectedTicketId(null);
  }

  async function handleAddAndamento(ticketId, andamentos) {
    const { data } = await supabase.from('tickets')
      .update({ andamentos, atualizado_em: new Date().toISOString() })
      .eq('id', ticketId).select().single();
    if (data) setTickets(prev => prev.map(t => t.id === ticketId ? ticketFromRow(data) : t));
  }

  async function handleCreate({ tipo, titulo, clienteId, clienteNome, categoria, prioridade, prazo, descricao, responsavelNome }) {
    const num = nextNum(tickets);
    const av  = makeAvatar(responsavelNome);
    const row = {
      num, titulo, tipo, categoria, prioridade, status: 'aberto',
      cliente:             clienteNome ?? null,
      cliente_id:          clienteId ?? null,
      responsavel_nome:    responsavelNome,
      responsavel_avatar:  av,
      abertura: TODAY, prazo: prazo || null, descricao,
      csat: { nota: null, comentario: '', data: null, avaliado: false },
    };
    const { data } = await supabase.from('tickets').insert(row).select().single();
    if (data) {
      setTickets(prev => [ticketFromRow(data), ...prev]);
      setShowModal(false);
    }
  }

  const metricas = useMemo(() => {
    const currentMonth = TODAY.substring(0, 7);
    const csatAvaliados = tickets.filter(
      (t) => t.status === 'concluido' && t.csat?.avaliado && t.csat?.data?.startsWith(currentMonth),
    );
    const csatMedia = csatAvaliados.length > 0
      ? (csatAvaliados.reduce((s, t) => s + t.csat.nota, 0) / csatAvaliados.length).toFixed(1)
      : null;
    return {
      abertos:    tickets.filter(t => t.status === 'aberto').length,
      andamento:  tickets.filter(t => t.status === 'em_andamento').length,
      aguardando: tickets.filter(t => t.status === 'aguardando_cliente').length,
      concluidos: tickets.filter(t => t.status === 'concluido').length,
      vencidos:   tickets.filter(t => isVencido(t)).length,
      csatMedia,
    };
  }, [tickets]);

  const csatColor = metricas.csatMedia !== null
    ? (parseFloat(metricas.csatMedia) >= 4 ? '#2dd4a0' : parseFloat(metricas.csatMedia) >= 3 ? '#f0a832' : '#f05c5c')
    : '#f0a832';

  const filtered = useMemo(() => {
    let list = tickets.filter(t => {
      if (t.status === 'cancelado' && !mostrarCancelados && filtros.status !== 'cancelado') return false;
      if (filtros.tipo !== 'todos' && t.tipo !== filtros.tipo) return false;
      if (filtros.status !== 'todos' && t.status !== filtros.status) return false;
      if (filtros.prioridade !== 'todos' && t.prioridade !== filtros.prioridade) return false;
      if (filtros.categoria !== 'todos' && t.categoria !== filtros.categoria) return false;
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        if (!t.titulo.toLowerCase().includes(q) && !(t.cliente || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });

    if (ordem === 'mais_recente') {
      list = list.slice().sort((a, b) => b.abertura.localeCompare(a.abertura));
    } else if (ordem === 'prazo') {
      list = list.slice().sort((a, b) => {
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return a.prazo.localeCompare(b.prazo);
      });
    } else if (ordem === 'prioridade') {
      list = list.slice().sort((a, b) => PRIORIDADE_ORDER[a.prioridade] - PRIORIDADE_ORDER[b.prioridade]);
    }

    return list;
  }, [tickets, filtros, ordem, mostrarCancelados]);

  if (loadingTickets) return <SkeletonLoader rows={6} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${metricas.csatMedia !== null ? 5 : 4}, 1fr)`, gap: 14 }}>
        <MetCard label="Total abertos"      value={metricas.abertos}    icon={AlertTriangle}  color="#f05c5c" sub={metricas.vencidos > 0 ? `${metricas.vencidos} vencido(s)` : undefined} />
        <MetCard label="Em andamento"       value={metricas.andamento}  icon={Loader2}        color="#5b6ef5" />
        <MetCard label="Aguardando cliente" value={metricas.aguardando} icon={Clock}          color="#f0a832" />
        <MetCard label="Concluídos"         value={metricas.concluidos} icon={CheckCircle2}   color="#2dd4a0" />
        {metricas.csatMedia !== null && (
          <MetCard label="CSAT do mês" value={metricas.csatMedia} icon={Star} color={csatColor} sub="/5.0" />
        )}
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '14px 16px',
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <FilterSelect
          value={filtros.tipo}
          onChange={v => setFiltro('tipo', v)}
          options={[
            { value: 'todos', label: 'Tipo: Todos' },
            { value: 'externo', label: 'Externo' },
            { value: 'interno', label: 'Interno' },
          ]}
        />
        <FilterSelect
          value={filtros.status}
          onChange={v => setFiltro('status', v)}
          options={[
            { value: 'todos',              label: 'Status: Todos' },
            { value: 'aberto',             label: 'Aberto' },
            { value: 'em_andamento',       label: 'Em andamento' },
            { value: 'aguardando_cliente', label: 'Aguardando cliente' },
            { value: 'concluido',          label: 'Concluído' },
            { value: 'cancelado',          label: 'Cancelado' },
          ]}
        />
        <FilterSelect
          value={filtros.prioridade}
          onChange={v => setFiltro('prioridade', v)}
          options={[
            { value: 'todos', label: 'Prioridade: Todas' },
            { value: 'alta',  label: 'Alta' },
            { value: 'media', label: 'Média' },
            { value: 'baixa', label: 'Baixa' },
          ]}
        />
        <FilterSelect
          value={filtros.categoria}
          onChange={v => setFiltro('categoria', v)}
          options={[
            { value: 'todos',      label: 'Categoria: Todas' },
            { value: 'suporte',    label: 'Suporte' },
            { value: 'comercial',  label: 'Comercial' },
            { value: 'financeiro', label: 'Financeiro' },
            { value: 'produto',    label: 'Produto' },
            { value: 'interno',    label: 'Interno' },
          ]}
        />

        {/* Search */}
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            type="text"
            placeholder="Buscar por título ou cliente..."
            value={filtros.busca}
            onChange={e => setFiltro('busca', e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '7px 10px 7px 30px',
              color: 'var(--text)', fontSize: 12, outline: 'none',
              fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        {/* Mostrar cancelados */}
        <button onClick={() => setMostrarCancelados(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', transition: 'all .12s', background: mostrarCancelados ? 'rgba(140,140,150,0.15)' : 'transparent', border: `1px solid ${mostrarCancelados ? 'rgba(140,140,150,0.35)' : 'var(--border)'}`, color: mostrarCancelados ? 'var(--text2)' : 'var(--text3)' }}>
          {mostrarCancelados ? '✕ Ocultar cancelados' : 'Mostrar cancelados'}
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>
          {filtered.length} {filtered.length === 1 ? 'ticket' : 'tickets'}
          {metricas.vencidos > 0 && (
            <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--red)', fontWeight: 500 }}>
              · {metricas.vencidos} vencido(s)
            </span>
          )}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Ordenar por:</span>
          <FilterSelect
            value={ordem}
            onChange={setOrdem}
            options={[
              { value: 'mais_recente', label: 'Mais recente' },
              { value: 'prazo',        label: 'Prazo' },
              { value: 'prioridade',   label: 'Prioridade' },
            ]}
          />
          <button
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'var(--accent)', border: 'none', color: '#fff' }}>
            <Plus size={13} /> Novo chamado
          </button>
        </div>
      </div>

      {/* Ticket list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)', fontSize: 13 }}>
          Nenhum ticket encontrado com os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(t => (
            <TicketCard key={t.id} ticket={t} onEvaluate={handleEvaluate} onClick={() => setSelectedTicketId(t.id)} />
          ))}
        </div>
      )}

      {showModal && (
        <NovoTicketModal
          empresaId={empresaId}
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}

      {selectedTicket && (
        <TicketDetalheModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicketId(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdateResponsavel={handleUpdateResponsavel}
          onDelete={handleDelete}
          onAddAndamento={handleAddAndamento}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
