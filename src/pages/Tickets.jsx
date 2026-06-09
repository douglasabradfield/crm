import { useState, useMemo } from 'react';
import {
  Search, AlertTriangle, CheckCircle2, Clock, Loader2,
  ChevronDown, User, Calendar, Flag,
} from 'lucide-react';

const LS_TICKETS = 'crm_tickets';

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
  },
  {
    id: 2, num: '002',
    titulo: 'Dúvida sobre cobrança da fatura de abril',
    tipo: 'externo', categoria: 'financeiro', prioridade: 'media', status: 'em_andamento',
    cliente: 'Grupo Inovação SA',
    responsavel: { nome: 'Douglas Admin', avatar: 'DA' },
    abertura: '2026-05-21', prazo: '2026-05-27',
    descricao: 'Cliente questiona cobrança duplicada identificada em abril.',
  },
  {
    id: 3, num: '003',
    titulo: 'Solicitar atualização de contrato',
    tipo: 'externo', categoria: 'comercial', prioridade: 'baixa', status: 'aguardando_cliente',
    cliente: 'Comercial Norte ME',
    responsavel: { nome: 'Carlos Melo', avatar: 'CM' },
    abertura: '2026-05-22', prazo: '2026-05-30',
    descricao: 'Aguardando assinatura do aditivo pelo cliente.',
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
  },
  {
    id: 5, num: '005',
    titulo: 'Revisar política de desconto máximo',
    tipo: 'interno', categoria: 'comercial', prioridade: 'alta', status: 'em_andamento',
    cliente: null,
    responsavel: { nome: 'Douglas Admin', avatar: 'DA' },
    abertura: '2026-05-19', prazo: '2026-05-25',
    descricao: 'Definir teto de desconto por perfil de vendedor.',
  },
  {
    id: 6, num: '006',
    titulo: 'Ajustar permissões do perfil Gestor',
    tipo: 'interno', categoria: 'interno', prioridade: 'baixa', status: 'concluido',
    cliente: null,
    responsavel: { nome: 'Douglas Admin', avatar: 'DA' },
    abertura: '2026-05-15', prazo: '2026-05-20',
    descricao: 'Removido acesso a Configurações para perfil Gestor.',
  },
  {
    id: 7, num: '007',
    titulo: 'Integrar CRM com novo ERP da empresa',
    tipo: 'interno', categoria: 'produto', prioridade: 'alta', status: 'aberto',
    cliente: null,
    responsavel: { nome: 'Carlos Melo', avatar: 'CM' },
    abertura: '2026-05-23', prazo: '2026-05-28',
    descricao: 'Mapear endpoints do ERP para sincronização de clientes e pedidos.',
  },
  {
    id: 8, num: '008',
    titulo: 'Relatório NPS consolidado do Q1 2026',
    tipo: 'interno', categoria: 'produto', prioridade: 'media', status: 'concluido',
    cliente: null,
    responsavel: { nome: 'Ana Lima', avatar: 'AL' },
    abertura: '2026-05-10', prazo: '2026-05-17',
    descricao: 'NPS Q1: 72 pontos. Relatório enviado para diretoria.',
  },
];

// Seed on module load so sidebar badge is immediately accurate
(function () {
  if (!localStorage.getItem(LS_TICKETS)) {
    localStorage.setItem(LS_TICKETS, JSON.stringify(MOCK_TICKETS));
  }
})();

function loadTickets() {
  try {
    const saved = localStorage.getItem(LS_TICKETS);
    if (saved) return JSON.parse(saved);
    localStorage.setItem(LS_TICKETS, JSON.stringify(MOCK_TICKETS));
    return MOCK_TICKETS;
  } catch { return MOCK_TICKETS; }
}

const TODAY = '2026-05-24';

function isVencido(ticket) {
  return ticket.status !== 'concluido' && ticket.prazo < TODAY;
}

const PRIORIDADE_ORDER = { alta: 0, media: 1, baixa: 2 };

const STATUS_CFG = {
  aberto:           { label: 'Aberto',             bg: 'rgba(240,92,92,0.12)',    color: 'var(--red)',    border: 'rgba(240,92,92,0.25)'    },
  em_andamento:     { label: 'Em andamento',        bg: 'rgba(91,110,245,0.12)',   color: 'var(--accent2)', border: 'rgba(91,110,245,0.25)'  },
  aguardando_cliente:{ label: 'Aguardando cliente', bg: 'rgba(240,168,50,0.12)',  color: 'var(--amber)',  border: 'rgba(240,168,50,0.25)'   },
  concluido:        { label: 'Concluído',           bg: 'rgba(45,212,160,0.10)',   color: 'var(--green)', border: 'rgba(45,212,160,0.22)'   },
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
function TicketCard({ ticket }) {
  const vencido = isVencido(ticket);
  const stCfg = STATUS_CFG[ticket.status];
  const prCfg = PRIORIDADE_CFG[ticket.prioridade];

  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid ${vencido ? 'rgba(240,92,92,0.35)' : 'var(--border)'}`,
      borderRadius: 12, padding: '14px 18px',
      display: 'flex', gap: 16, alignItems: 'flex-start',
      transition: 'border-color 0.15s',
    }}>
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
          {/* Status badge */}
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
          {/* Responsável */}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: vencido ? 'var(--red)' : 'var(--text3)' }}>
            <Clock size={12} />
            Prazo: {fmtDate(ticket.prazo)}
            {vencido && <span style={{ fontWeight: 600 }}> — Vencido</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Tickets() {
  const [tickets] = useState(loadTickets);
  const [filtros, setFiltros] = useState({
    tipo: 'todos', status: 'todos', prioridade: 'todos', categoria: 'todos', busca: '',
  });
  const [ordem, setOrdem] = useState('mais_recente');

  function setFiltro(key, val) {
    setFiltros(f => ({ ...f, [key]: val }));
  }

  const metricas = useMemo(() => ({
    abertos:    tickets.filter(t => t.status === 'aberto').length,
    andamento:  tickets.filter(t => t.status === 'em_andamento').length,
    aguardando: tickets.filter(t => t.status === 'aguardando_cliente').length,
    concluidos: tickets.filter(t => t.status === 'concluido').length,
    vencidos:   tickets.filter(t => isVencido(t)).length,
  }), [tickets]);

  const filtered = useMemo(() => {
    let list = tickets.filter(t => {
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
      list = list.slice().sort((a, b) => a.prazo.localeCompare(b.prazo));
    } else if (ordem === 'prioridade') {
      list = list.slice().sort((a, b) => PRIORIDADE_ORDER[a.prioridade] - PRIORIDADE_ORDER[b.prioridade]);
    }

    return list;
  }, [tickets, filtros, ordem]);

  const selectStyle = { fontSize: 12 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetCard label="Total abertos"      value={metricas.abertos}    icon={AlertTriangle}  color="#f05c5c" sub={metricas.vencidos > 0 ? `${metricas.vencidos} vencido(s)` : undefined} />
        <MetCard label="Em andamento"       value={metricas.andamento}  icon={Loader2}        color="#5b6ef5" />
        <MetCard label="Aguardando cliente" value={metricas.aguardando} icon={Clock}          color="#f0a832" />
        <MetCard label="Concluídos"         value={metricas.concluidos} icon={CheckCircle2}   color="#2dd4a0" />
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
            { value: 'todos',             label: 'Status: Todos' },
            { value: 'aberto',            label: 'Aberto' },
            { value: 'em_andamento',      label: 'Em andamento' },
            { value: 'aguardando_cliente',label: 'Aguardando cliente' },
            { value: 'concluido',         label: 'Concluído' },
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
        </div>
      </div>

      {/* Ticket list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)', fontSize: 13 }}>
          Nenhum ticket encontrado com os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(t => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}
    </div>
  );
}
