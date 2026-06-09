import { useState, useCallback, useRef } from 'react';
import {
  Search, Zap, Bot, RefreshCw, ChevronDown,
  Building2, Phone, Mail, MapPin, X, Plus,
  Upload, FileText, AlertCircle, CheckCircle2,
  ArrowRight, History, User, MessageSquare,
  CheckSquare, Square, Filter,
} from 'lucide-react';
import { useUI }      from '../store/index.js';
import { useCRM }     from '../store/crm.js';
import { searchByCNAE }                     from '../services/cnpj.js';
import { findEmailsByDomain, hunterAvailable } from '../services/hunter.js';
import { enrichByDomain, apolloAvailable }  from '../services/apollo.js';
import PermissionGate from '../components/Auth/PermissionGate.jsx';

/* ─── UF / Porte ─────────────────────────────────────────────────────────────── */
const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];
const PORTES = [
  { value: '', label: 'Qualquer porte' },
  { value: 'MEI',   label: 'MEI' },
  { value: 'ME',    label: 'ME — Microempresa' },
  { value: 'EPP',   label: 'EPP — Empresa de Pequeno Porte' },
  { value: 'MEDIO', label: 'Médio Porte' },
];

/* ─── Status ─────────────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  nova:       { label: 'Nova',       color: 'var(--text3)',   bg: 'var(--bg4)',              border: 'var(--border)'                },
  em_regua:   { label: 'Em régua',   color: 'var(--accent2)', bg: 'rgba(91,110,245,0.12)',  border: 'rgba(91,110,245,0.3)'         },
  respondeu:  { label: 'Respondeu',  color: 'var(--green)',   bg: 'rgba(45,212,160,0.12)',  border: 'rgba(45,212,160,0.3)'         },
  no_crm:     { label: 'No CRM',     color: 'var(--purple)',  bg: 'rgba(176,110,245,0.12)', border: 'rgba(176,110,245,0.3)'        },
  descartada: { label: 'Descartada', color: 'var(--red)',     bg: 'rgba(240,92,92,0.12)',   border: 'rgba(240,92,92,0.3)'          },
};

/* ─── Email / phone / score ──────────────────────────────────────────────────── */
const EMAIL_DOT = {
  alto:           { color: 'var(--green)',  title: 'Alta confiança'   },
  medio:          { color: 'var(--amber)',  title: 'Média confiança'  },
  baixo:          { color: 'var(--red)',    title: 'Baixa confiança'  },
  nao_verificado: { color: 'var(--text3)', title: 'Não verificado'   },
};
const SCORE_CFG = {
  alto:  { color: 'var(--green)',  bg: 'rgba(45,212,160,0.1)',  border: 'rgba(45,212,160,0.25)'  },
  medio: { color: 'var(--amber)',  bg: 'rgba(240,168,50,0.1)',  border: 'rgba(240,168,50,0.25)'  },
  baixo: { color: 'var(--red)',    bg: 'rgba(240,92,92,0.1)',   border: 'rgba(240,92,92,0.25)'   },
};
const SCORE_REASON = {
  alto:  'Capital social alto + CNAE de alta conversão + contato verificado.',
  medio: 'Porte compatível, mas e-mail ou telefone sem verificação completa.',
  baixo: 'Segmento com baixa taxa histórica ou dados de contato ausentes.',
};

/* ─── Fluxos de Régua disponíveis (mirror de ReguaComunicacao) ───────────────── */
const FLUXOS_REGUA = [
  { id: 'f1', nome: 'Pós-Demo — Cold Leads',     steps: 5, duracao: '14 dias', contacts: 23, color: '--accent'  },
  { id: 'f2', nome: 'Nurturing Educacional',      steps: 6, duracao: '21 dias', contacts: 47, color: '--teal'   },
  { id: 'f3', nome: 'Reativação de Inativos',     steps: 4, duracao: '30 dias', contacts: 12, color: '--amber'  },
];

/* ─── Mock companies (extended) ─────────────────────────────────────────────── */
const MOCK_COMPANIES_BASE = [
  {
    cnpj: '12.345.678/0001-90', razaoSocial: 'Tech Solutions Ltda',      nomeFantasia: 'TechSol',
    cnae: '6201-5', cnaeDesc: 'Desenvolvimento de programas de computador sob encomenda',
    municipio: 'São Paulo', uf: 'SP', porte: 'ME', capitalSocial: 180000,
    telefone: '(11) 3000-1234', email: 'contato@techsolutions.com.br', domain: 'techsolutions.com.br',
    situacao: 'ATIVA', emailScore: 'alto', phoneStatus: 'verificado', score: 'alto',
    status: 'em_regua', fluxoId: 'f2', origem: 'busca_cnae',
    history: [
      { id: 'h1', tipo: 'descoberta',    data: '2026-05-10', descricao: 'Encontrada via busca CNAE 6201-5', usuario: 'Admin' },
      { id: 'h2', tipo: 'fluxo',         data: '2026-05-11', descricao: 'Adicionada ao fluxo "Nurturing Educacional"', usuario: 'Admin' },
      { id: 'h3', tipo: 'contato',       data: '2026-05-11', descricao: 'E-mail: Boas-vindas enviado', usuario: 'Sistema', resultado: 'sem_resposta' },
      { id: 'h4', tipo: 'status_change', data: '2026-05-13', descricao: 'Status: Nova → Em régua', usuario: 'Admin' },
    ],
  },
  {
    cnpj: '23.456.789/0001-01', razaoSocial: 'Nexus Digital Soluções Digitais S/A', nomeFantasia: 'Nexus Digital',
    cnae: '7319-0', cnaeDesc: 'Agências de publicidade',
    municipio: 'Rio de Janeiro', uf: 'RJ', porte: 'EPP', capitalSocial: 350000,
    telefone: '(21) 2200-5678', email: 'comercial@nexusdigital.com', domain: 'nexusdigital.com',
    situacao: 'ATIVA', emailScore: 'medio', phoneStatus: 'verificado', score: 'medio',
    status: 'respondeu', fluxoId: 'f1', origem: 'busca_cnae',
    history: [
      { id: 'h5', tipo: 'descoberta', data: '2026-05-08', descricao: 'Encontrada via busca CNAE 7319-0', usuario: 'Admin' },
      { id: 'h6', tipo: 'fluxo',     data: '2026-05-09', descricao: 'Adicionada ao fluxo "Pós-Demo — Cold Leads"', usuario: 'Admin' },
      { id: 'h7', tipo: 'contato',   data: '2026-05-12', descricao: 'E-mail de follow-up respondido com interesse', usuario: 'Sistema', resultado: 'interesse' },
      { id: 'h8', tipo: 'status_change', data: '2026-05-12', descricao: 'Status: Em régua → Respondeu', usuario: 'Sistema' },
    ],
  },
  {
    cnpj: '34.567.890/0001-12', razaoSocial: 'Inova Saúde Tecnologia e Serviços Ltda', nomeFantasia: 'Inova Saúde',
    cnae: '8630-5', cnaeDesc: 'Atividades de atenção ambulatorial executadas por médicos',
    municipio: 'Belo Horizonte', uf: 'MG', porte: 'ME', capitalSocial: 120000,
    telefone: '(31) 3100-9012', email: 'adm@inovasaude.com.br', domain: 'inovasaude.com.br',
    situacao: 'ATIVA', emailScore: 'medio', phoneStatus: 'nao_verificado', score: 'medio',
    status: 'nova', fluxoId: null, origem: 'busca_cnae',
    history: [
      { id: 'h9', tipo: 'descoberta', data: '2026-05-20', descricao: 'Encontrada via busca CNAE 8630-5', usuario: 'Admin' },
    ],
  },
  {
    cnpj: '45.678.901/0001-23', razaoSocial: 'Grupo Construfast Engenharia Ltda', nomeFantasia: 'Construfast',
    cnae: '4120-4', cnaeDesc: 'Construção de edifícios',
    municipio: 'Curitiba', uf: 'PR', porte: 'MEDIO', capitalSocial: 1200000,
    telefone: '(41) 3300-3456', email: '', domain: 'construfast.com.br',
    situacao: 'ATIVA', emailScore: 'baixo', phoneStatus: 'verificado', score: 'alto',
    status: 'no_crm', fluxoId: null, origem: 'busca_cnae',
    history: [
      { id: 'h10', tipo: 'descoberta',    data: '2026-05-05', descricao: 'Encontrada via busca CNAE 4120-4', usuario: 'Admin' },
      { id: 'h11', tipo: 'status_change', data: '2026-05-07', descricao: 'Adicionada ao CRM como lead', usuario: 'Admin' },
    ],
  },
  {
    cnpj: '56.789.012/0001-34', razaoSocial: 'Varejo Smart Comércio Eletrônico Ltda', nomeFantasia: 'Varejo Smart',
    cnae: '4791-9', cnaeDesc: 'Comércio varejista por correspondência ou por meio eletrônico',
    municipio: 'São Paulo', uf: 'SP', porte: 'ME', capitalSocial: 80000,
    telefone: '', email: 'contato@varejosmart.com.br', domain: 'varejosmart.com.br',
    situacao: 'ATIVA', emailScore: 'alto', phoneStatus: 'nao_encontrado', score: 'medio',
    status: 'nova', fluxoId: null, origem: 'importacao_csv',
    history: [
      { id: 'h12', tipo: 'descoberta', data: '2026-05-18', descricao: 'Importada via CSV', usuario: 'Admin' },
    ],
  },
  {
    cnpj: '67.890.123/0001-45', razaoSocial: 'LogiMais Transportes e Logística ME', nomeFantasia: 'LogiMais',
    cnae: '4930-2', cnaeDesc: 'Transporte rodoviário de carga, exceto produtos perigosos',
    municipio: 'Campinas', uf: 'SP', porte: 'ME', capitalSocial: 60000,
    telefone: '(19) 3400-7890', email: 'operacoes@logimais.com.br', domain: 'logimais.com.br',
    situacao: 'ATIVA', emailScore: 'medio', phoneStatus: 'verificado', score: 'baixo',
    status: 'descartada', fluxoId: null, origem: 'busca_cnae',
    history: [
      { id: 'h13', tipo: 'descoberta',    data: '2026-05-12', descricao: 'Encontrada via busca CNAE 4930-2', usuario: 'Admin' },
      { id: 'h14', tipo: 'status_change', data: '2026-05-15', descricao: 'Descartada — sem fit com o perfil ideal', usuario: 'Admin' },
    ],
  },
];

const fmtBRL = (n) =>
  n >= 1_000_000
    ? `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
    : `R$ ${(n / 1000).toFixed(0)}k`;

const today = () => new Date().toISOString().split('T')[0];
const fmtDate = (d) => d ? d.split('-').reverse().join('/') : '—';

const TIPO_CONTATO_LABEL = {
  descoberta:    { label: 'Descoberta',       color: 'var(--accent2)' },
  fluxo:         { label: 'Régua',            color: 'var(--teal)'   },
  contato:       { label: 'Contato',          color: 'var(--green)'  },
  status_change: { label: 'Mudança de status', color: 'var(--amber)' },
};

const RESULTADO_LABEL = {
  interesse:    { label: 'Demonstrou interesse', color: 'var(--green)' },
  pediu_retorno:{ label: 'Pediu retorno',        color: 'var(--amber)' },
  sem_resposta: { label: 'Sem resposta',         color: 'var(--text3)' },
  nao_interesse:{ label: 'Sem interesse',        color: 'var(--red)'   },
};

/* ─── CSV mock preview data ──────────────────────────────────────────────────── */
const CSV_PREVIEW_ROWS = [
  ['Empresa ABC Ltda',       '11.111.111/0001-11', '6201-5', 'São Paulo',     'SP', 'contato@abc.com.br',   '(11) 9999-8888'],
  ['Distribuidora XYZ ME',   '22.222.222/0001-22', '4691-5', 'Belo Horizonte','MG', 'vendas@xyz.com',       '(31) 8888-7777'],
  ['Consultoria Delta S/A',  '33.333.333/0001-33', '7020-4', 'Rio de Janeiro','RJ', 'comercial@delta.com',  ''],
  ['Agro Norte Ltda',        '44.444.444/0001-44', '0111-3', 'Cuiabá',        'MT', '',                     '(65) 7777-6666'],
  ['Studio Criativo Ltda',   '55.555.555/0001-55', '7319-0', 'Porto Alegre',  'RS', 'studio@criativo.com',  '(51) 6666-5555'],
];
const CSV_HEADERS = ['Empresa', 'CNPJ', 'CNAE', 'Cidade', 'UF', 'E-mail', 'Telefone'];

/* ─── Tiny helpers ───────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <span style={{
      width: 12, height: 12, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
      border: '2px solid var(--border2)', borderTopColor: 'var(--accent2)',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

function Toast({ msg, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg2)', border: '1px solid var(--border2)',
      borderRadius: 10, padding: '10px 18px', zIndex: 600,
      display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      fontSize: 13, color: 'var(--text)',
    }}>
      <CheckCircle2 size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
      {msg}
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 2 }}>
        <X size={13} />
      </button>
    </div>
  );
}

/* ─── StatusBadge ────────────────────────────────────────────────────────────── */
function StatusBadge({ status, fluxoId, size = 'sm' }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.nova;
  const fluxo = fluxoId ? FLUXOS_REGUA.find((f) => f.id === fluxoId) : null;
  const fontSize = size === 'lg' ? 12 : 10;
  const pad = size === 'lg' ? '4px 12px' : '2px 8px';
  return (
    <span style={{
      fontSize, fontWeight: 500, padding: pad, borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap', lineHeight: 1.6,
    }}>
      {cfg.label}{fluxo && status === 'em_regua' ? ` · ${fluxo.nome}` : ''}
    </span>
  );
}

/* ─── IntegrationCard ────────────────────────────────────────────────────────── */
function IntegrationCard({ icon: Icon, name, description, status, badge }) {
  const st = {
    active:  { color: 'var(--green)',  label: 'Ativo',      dot: true  },
    partial: { color: 'var(--amber)',  label: 'Conectado',  dot: true  },
    missing: { color: 'var(--text3)', label: 'Configurar', dot: false },
    soon:    { color: 'var(--text3)', label: 'Em breve',   dot: false },
  }[status];
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} style={{ color: st.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{name}</span>
          {badge && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'var(--accent-bg)', color: 'var(--accent2)', border: '1px solid rgba(91,110,245,0.2)', fontWeight: 500 }}>{badge}</span>}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{description}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        {st.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, flexShrink: 0 }} />}
        <span style={{ fontSize: 11, color: st.color }}>{st.label}</span>
      </div>
    </div>
  );
}

/* ─── SearchForm ─────────────────────────────────────────────────────────────── */
function SearchForm({ onSearch, loading }) {
  const [form, setForm] = useState({ cnae: '', uf: '', cidade: '', porte: '', capitalMin: '' });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const iS = { width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' };
  const lS = { fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 };
  const fo = (e) => { e.target.style.borderColor = 'var(--accent)'; };
  const bl = (e) => { e.target.style.borderColor = 'var(--border)'; };
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 16 }}>Filtros de busca</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 16 }}>
        <div style={{ gridColumn: '1 / 3' }}>
          <label style={lS}>CNAE</label>
          <input style={iS} value={form.cnae} onChange={(e) => set('cnae', e.target.value)} placeholder="Ex: 6201-5, 4791, 7319" onFocus={fo} onBlur={bl} />
        </div>
        <div>
          <label style={lS}>Estado (UF)</label>
          <div style={{ position: 'relative' }}>
            <select value={form.uf} onChange={(e) => set('uf', e.target.value)} style={{ ...iS, appearance: 'none', cursor: 'pointer', paddingRight: 28 }} onFocus={fo} onBlur={bl}>
              <option value="">Todos</option>
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          </div>
        </div>
        <div>
          <label style={lS}>Cidade</label>
          <input style={iS} value={form.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Ex: São Paulo" onFocus={fo} onBlur={bl} />
        </div>
        <div>
          <label style={lS}>Porte</label>
          <div style={{ position: 'relative' }}>
            <select value={form.porte} onChange={(e) => set('porte', e.target.value)} style={{ ...iS, appearance: 'none', cursor: 'pointer', paddingRight: 28 }} onFocus={fo} onBlur={bl}>
              {PORTES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>
      <button onClick={() => onSearch(form)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 7, background: loading ? 'var(--bg3)' : 'var(--accent)', color: loading ? 'var(--text3)' : '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: 'var(--font-body)' }}>
        {loading ? <Spinner /> : <Search size={14} />}
        {loading ? 'Buscando…' : 'Buscar empresas'}
      </button>
    </div>
  );
}

/* ─── CompanyDrawer ──────────────────────────────────────────────────────────── */
function CompanyDrawer({ company, onClose, onUpdateStatus, openAI }) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ descricao: '', resultado: '' });
  const [showReguaShortcut, setShowReguaShortcut] = useState(false);
  const [selectedFluxo, setSelectedFluxo] = useState('');

  const scoreCfg = SCORE_CFG[company.score] ?? SCORE_CFG.baixo;
  const statusCfg = STATUS_CFG[company.status] ?? STATUS_CFG.nova;

  function handleRegistrarContato() {
    if (!contactForm.descricao.trim()) return;
    const evento = {
      id: `h${Date.now()}`,
      tipo: 'contato',
      data: today(),
      descricao: contactForm.descricao,
      usuario: 'Admin',
      resultado: contactForm.resultado || undefined,
    };
    onUpdateStatus(company.cnpj, company.status, company.fluxoId, [evento]);
    setContactForm({ descricao: '', resultado: '' });
    setShowContactForm(false);
  }

  function handleAddToRegua() {
    if (!selectedFluxo) return;
    const fluxo = FLUXOS_REGUA.find((f) => f.id === selectedFluxo);
    const eventos = [
      { id: `h${Date.now()}`, tipo: 'fluxo', data: today(), descricao: `Adicionada ao fluxo "${fluxo.nome}"`, usuario: 'Admin' },
      { id: `h${Date.now() + 1}`, tipo: 'status_change', data: today(), descricao: `Status: ${statusCfg.label} → Em régua`, usuario: 'Admin' },
    ];
    onUpdateStatus(company.cnpj, 'em_regua', selectedFluxo, eventos);
    setShowReguaShortcut(false);
    setSelectedFluxo('');
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex' }} onClick={onClose}>
      <div style={{ flex: 1 }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400, background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3, marginBottom: 4 }}>
              {company.nomeFantasia || company.razaoSocial}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{company.cnpj}</p>
            <StatusBadge status={company.status} fluxoId={company.fluxoId} size="lg" />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Score */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Score de fit</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: scoreCfg.bg, color: scoreCfg.color, border: `1px solid ${scoreCfg.border}`, textTransform: 'capitalize' }}>
              {company.score.charAt(0).toUpperCase() + company.score.slice(1)}
            </span>
            <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.45, flex: 1 }}>{SCORE_REASON[company.score]}</p>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {company.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                <Mail size={11} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                {company.email}
              </div>
            )}
            {company.telefone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                <Phone size={11} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                {company.telefone}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
              <MapPin size={11} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              {company.municipio}, {company.uf} · {company.porte} · {fmtBRL(company.capitalSocial)}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ padding: '14px 20px', flex: 1 }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Histórico</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[...(company.history ?? [])].reverse().map((ev, i, arr) => {
              const tipoCfg = TIPO_CONTATO_LABEL[ev.tipo] ?? { label: ev.tipo, color: 'var(--text3)' };
              const resCfg = ev.resultado ? RESULTADO_LABEL[ev.resultado] : null;
              return (
                <div key={ev.id} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: tipoCfg.color, flexShrink: 0, marginTop: 4 }} />
                    {i < arr.length - 1 && <span style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 16 }} />}
                  </div>
                  <div style={{ paddingBottom: 14, flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: tipoCfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tipoCfg.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{fmtDate(ev.data)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{ev.descricao}</p>
                    {resCfg && <span style={{ fontSize: 10, color: resCfg.color, fontWeight: 500 }}>{resCfg.label}</span>}
                    {ev.usuario && <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>por {ev.usuario}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Registrar contato */}
          {!showContactForm ? (
            <button onClick={() => setShowContactForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent2)', background: 'none', border: '1px dashed rgba(91,110,245,0.3)', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%', justifyContent: 'center', marginTop: 4 }}>
              <Plus size={12} /> Registrar contato
            </button>
          ) : (
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginTop: 4 }}>
              <textarea
                value={contactForm.descricao}
                onChange={(e) => setContactForm((p) => ({ ...p, descricao: e.target.value }))}
                placeholder="Descreva o contato realizado…"
                rows={2}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
              />
              <div style={{ marginBottom: 8, position: 'relative' }}>
                <select
                  value={contactForm.resultado}
                  onChange={(e) => setContactForm((p) => ({ ...p, resultado: e.target.value }))}
                  style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: contactForm.resultado ? 'var(--text)' : 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-body)', appearance: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="">Resultado (opcional)</option>
                  {Object.entries(RESULTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleRegistrarContato} style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Salvar</button>
                <button onClick={() => { setShowContactForm(false); setContactForm({ descricao: '', resultado: '' }); }} style={{ background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => openAI(`Script de prospecção para ${company.nomeFantasia || company.razaoSocial}. Setor: ${company.cnaeDesc}. Localização: ${company.municipio}/${company.uf}. Porte: ${company.porte}. Capital: ${fmtBRL(company.capitalSocial)}. Crie uma abordagem personalizada para o primeiro contato.`)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'rgba(91,110,245,0.08)', border: '1px solid rgba(91,110,245,0.2)', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 500, color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            <Bot size={13} /> Gerar script com IA
          </button>

          {company.status !== 'em_regua' && company.status !== 'no_crm' && company.status !== 'descartada' && (
            !showReguaShortcut ? (
              <button onClick={() => setShowReguaShortcut(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Adicionar à Régua
              </button>
            ) : (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                <select value={selectedFluxo} onChange={(e) => setSelectedFluxo(e.target.value)} style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: selectedFluxo ? 'var(--text)' : 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-body)', appearance: 'none', marginBottom: 8, outline: 'none' }}>
                  <option value="">Selecione um fluxo…</option>
                  {FLUXOS_REGUA.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleAddToRegua} disabled={!selectedFluxo} style={{ flex: 1, background: selectedFluxo ? 'var(--accent)' : 'var(--bg4)', color: selectedFluxo ? '#fff' : 'var(--text3)', border: 'none', borderRadius: 6, padding: '7px', fontSize: 11, cursor: selectedFluxo ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}>Confirmar</button>
                  <button onClick={() => { setShowReguaShortcut(false); setSelectedFluxo(''); }} style={{ background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>✕</button>
                </div>
              </div>
            )
          )}

          {company.status !== 'descartada' && (
            <button
              onClick={() => onUpdateStatus(company.cnpj, 'descartada', null, [{ id: `h${Date.now()}`, tipo: 'status_change', data: today(), descricao: `Status: ${STATUS_CFG[company.status]?.label ?? ''} → Descartada`, usuario: 'Admin' }])}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'transparent', border: '1px solid rgba(240,92,92,0.25)', borderRadius: 8, padding: '8px', fontSize: 12, color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              Descartar empresa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── AddToReguaModal ────────────────────────────────────────────────────────── */
function AddToReguaModal({ count, onConfirm, onClose }) {
  const [selected, setSelected] = useState('');
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Adicionar à Régua</p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{count} empresa{count !== 1 ? 's' : ''} selecionada{count !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {FLUXOS_REGUA.map((f) => {
            const isSelected = selected === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelected(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  background: isSelected ? 'rgba(91,110,245,0.08)' : 'var(--bg3)',
                  border: `1px solid ${isSelected ? 'rgba(91,110,245,0.4)' : 'var(--border)'}`,
                  textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'all .12s',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: `var(${f.color})`, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{f.nome}</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)' }}>{f.steps} steps · {f.duracao} · {f.contacts} leads ativos</p>
                </div>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border2)'}`, background: isSelected ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            style={{ flex: 1, background: selected ? 'var(--accent)' : 'var(--bg3)', color: selected ? '#fff' : 'var(--text3)', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 500, cursor: selected ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}
          >
            Confirmar
          </button>
          <button onClick={onClose} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 16px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── AddToCRMWarningModal ───────────────────────────────────────────────────── */
function AddToCRMWarningModal({ count, onAddToRegua, onAddToCRM, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(240,168,50,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={20} style={{ color: 'var(--amber)' }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Atenção antes de continuar</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              Adicionar {count > 1 ? `${count} empresas` : 'esta empresa'} sem interesse demonstrado ao CRM pode{' '}
              <strong style={{ color: 'var(--text)' }}>inflar suas métricas de leads</strong> e{' '}
              <strong style={{ color: 'var(--text)' }}>distorcer sua taxa de conversão</strong>.
            </p>
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(240,168,50,0.06)', border: '1px solid rgba(240,168,50,0.2)' }}>
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>
                Recomendamos usar a <strong style={{ color: 'var(--amber)' }}>Régua de Comunicação</strong> primeiro e mover para o CRM apenas quando houver resposta ou interesse demonstrado.
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={onAddToRegua}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            Adicionar à Régua primeiro
          </button>
          <button
            onClick={onAddToCRM}
            style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            Adicionar ao CRM mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── CSVImportModal ─────────────────────────────────────────────────────────── */
function CSVImportModal({ onImport, onClose }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'mapping'
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState({ empresa: '0', cnpj: '1', cnae: '2', cidade: '3', uf: '4', email: '5', telefone: '6' });
  const fileRef = useRef(null);

  function simulateUpload(name) {
    setFileName(name);
    setStep('preview');
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) simulateUpload(file.name);
  }

  const FIELD_LABELS = { empresa: 'Empresa', cnpj: 'CNPJ', cnae: 'CNAE', cidade: 'Cidade', uf: 'UF', email: 'E-mail', telefone: 'Telefone' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 540, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Importar via CSV</p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {step === 'upload' ? 'Arraste ou selecione seu arquivo' : step === 'preview' ? 'Prévia — primeiras 5 linhas' : 'Mapeie as colunas'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={16} /></button>
        </div>

        {step === 'upload' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border2)'}`,
              borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
              background: isDragging ? 'rgba(91,110,245,0.05)' : 'var(--bg3)',
              transition: 'all .15s',
            }}
          >
            <Upload size={28} style={{ color: isDragging ? 'var(--accent2)' : 'var(--text3)', marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: isDragging ? 'var(--accent2)' : 'var(--text2)', fontWeight: 500, marginBottom: 4 }}>
              {isDragging ? 'Solte o arquivo aqui' : 'Arraste o CSV aqui'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>ou clique para selecionar · apenas .csv</p>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) simulateUpload(e.target.files[0].name); }} />
          </div>
        )}

        {step === 'preview' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <FileText size={13} style={{ color: 'var(--accent2)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{CSV_PREVIEW_ROWS.length} linhas encontradas</span>
            </div>
            <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>{CSV_HEADERS.map((h) => <th key={h} style={{ padding: '6px 10px', background: 'var(--bg4)', color: 'var(--text3)', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {CSV_PREVIEW_ROWS.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      {row.map((cell, j) => <td key={j} style={{ padding: '6px 10px', color: cell ? 'var(--text2)' : 'var(--text3)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell || '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('mapping')} style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Mapear colunas</button>
              <button onClick={() => setStep('upload')} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Voltar</button>
            </div>
          </>
        )}

        {step === 'mapping' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, overflowY: 'auto', flex: 1 }}>
              {Object.entries(FIELD_LABELS).map(([field, label]) => (
                <div key={field}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={mapping[field] ?? ''}
                      onChange={(e) => setMapping((p) => ({ ...p, [field]: e.target.value }))}
                      style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 28px 7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', appearance: 'none', cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="">— ignorar —</option>
                      {CSV_HEADERS.map((h, i) => <option key={i} value={String(i)}>Coluna {i + 1}: {h}</option>)}
                    </select>
                    <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onImport(CSV_PREVIEW_ROWS, mapping)} style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Confirmar importação
              </button>
              <button onClick={() => setStep('preview')} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Voltar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── BulkActionBar ──────────────────────────────────────────────────────────── */
function BulkActionBar({ count, onAddToRegua, onAddToCRM, onDiscard, onClear }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg2)', border: '1px solid var(--border2)',
      borderRadius: 10, padding: '10px 16px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      margin: '0 0 4px',
    }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', flex: 1 }}>
        {count} empresa{count !== 1 ? 's' : ''} selecionada{count !== 1 ? 's' : ''}
      </span>
      <PermissionGate module="prospeccao" action="edit">
        <button onClick={onAddToRegua} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          Adicionar à Régua
        </button>
      </PermissionGate>
      <PermissionGate module="crm" action="edit">
        <button onClick={onAddToCRM} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border2)', borderRadius: 7, padding: '7px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <AlertCircle size={12} style={{ color: 'var(--amber)' }} /> Adicionar ao CRM
        </button>
      </PermissionGate>
      <PermissionGate module="prospeccao" action="edit">
        <button onClick={onDiscard} style={{ background: 'transparent', border: '1px solid rgba(240,92,92,0.3)', borderRadius: 7, padding: '7px 12px', fontSize: 12, color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          Descartar
        </button>
      </PermissionGate>
      <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 4 }}>
        <X size={14} />
      </button>
    </div>
  );
}

/* ─── ResultRow ──────────────────────────────────────────────────────────────── */
function ResultRow({ company, selected, onToggle, onOpenDrawer, onAI, onEnrich, enrichState }) {
  const emailDot  = EMAIL_DOT[company.emailScore] ?? EMAIL_DOT.nao_verificado;
  const scoreCfg  = SCORE_CFG[company.score] ?? SCORE_CFG.baixo;
  const isEnriching = enrichState?.loading;

  return (
    <tr
      style={{ borderBottom: '1px solid var(--border)', background: selected ? 'rgba(91,110,245,0.04)' : 'transparent', transition: 'background .1s' }}
    >
      {/* Checkbox */}
      <td style={{ padding: '0 0 0 14px', width: 36, verticalAlign: 'middle' }}>
        <button onClick={(e) => { e.stopPropagation(); onToggle(company.cnpj); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, color: selected ? 'var(--accent2)' : 'var(--text3)' }}>
          {selected ? <CheckSquare size={15} /> : <Square size={15} />}
        </button>
      </td>

      {/* Empresa */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', cursor: 'pointer' }} onClick={() => onOpenDrawer(company)}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{company.nomeFantasia || company.razaoSocial}</p>
        <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{company.cnpj}</p>
      </td>

      {/* CNAE */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <p style={{ fontSize: 12, color: 'var(--text2)' }}>{company.cnae}</p>
        <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company.cnaeDesc}</p>
      </td>

      {/* Localização */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <p style={{ fontSize: 12, color: 'var(--text2)' }}>{company.municipio}, {company.uf}</p>
        <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{fmtBRL(company.capitalSocial)} · {company.porte}</p>
      </td>

      {/* E-mail */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        {isEnriching ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Spinner /><span style={{ fontSize: 11, color: 'var(--text3)' }}>Buscando…</span></div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: enrichState?.email ? 'var(--green)' : emailDot.color, flexShrink: 0 }} title={emailDot.title} />
            <span style={{ fontSize: 12, color: (enrichState?.email || company.email) ? 'var(--text2)' : 'var(--text3)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {enrichState?.email || company.email || (enrichState?.emailNotFound ? <em style={{ color: 'var(--text3)', fontStyle: 'normal' }}>Não encontrado</em> : '—')}
            </span>
          </div>
        )}
      </td>

      {/* Telefone */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        {isEnriching ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Spinner /><span style={{ fontSize: 11, color: 'var(--text3)' }}>Buscando…</span></div>
        ) : (
          <span style={{ fontSize: 12, color: (enrichState?.phone || company.telefone) ? 'var(--text2)' : 'var(--text3)' }}>
            {enrichState?.phone || company.telefone || '—'}
          </span>
        )}
      </td>

      {/* Score */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: scoreCfg.bg, color: scoreCfg.color, border: `1px solid ${scoreCfg.border}`, textTransform: 'capitalize' }}>
          {company.score.charAt(0).toUpperCase() + company.score.slice(1)}
        </span>
      </td>

      {/* Status */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <StatusBadge status={company.status} fluxoId={company.fluxoId} />
      </td>

      {/* Ações */}
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => onAI(company)} title="Script IA" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent-bg)', border: '1px solid rgba(91,110,245,0.2)', borderRadius: 6, padding: '5px 8px', color: 'var(--accent2)', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Bot size={11} /> Script
          </button>
          <PermissionGate module="prospeccao" action="edit">
            <button onClick={() => onEnrich(company)} disabled={isEnriching} title="Enriquecer contatos" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: isEnriching ? 'var(--text3)' : 'var(--text2)', fontSize: 11, cursor: isEnriching ? 'default' : 'pointer', fontFamily: 'var(--font-body)' }}>
              {isEnriching ? <Spinner /> : <Zap size={11} />} Enriquecer
            </button>
          </PermissionGate>
        </div>
      </td>
    </tr>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
const ALL_STATUS_KEYS = Object.keys(STATUS_CFG);

export default function ProspeccaoAtiva() {
  const { openAI }    = useUI();
  const { addLead }   = useCRM();

  const [companies,    setCompanies]   = useState(MOCK_COMPANIES_BASE);
  const [results,      setResults]     = useState(MOCK_COMPANIES_BASE);
  const [searching,    setSearching]   = useState(false);
  const [searchError,  setSearchError] = useState('');
  const [hasSearched,  setHasSearched] = useState(false);

  const [selected,     setSelected]    = useState(new Set());
  const [statusFilter, setStatusFilter]= useState('');

  const [drawer,       setDrawer]      = useState(null);
  const [showRegua,    setShowRegua]   = useState(false);
  const [showCRMWarn,  setShowCRMWarn] = useState(false);
  const [showCSV,      setShowCSV]     = useState(false);

  const [enrichState,  setEnrichState] = useState({});
  const [toast,        setToast]       = useState('');

  /* ── Filtered view ────────────────────────────────────────────────────────── */
  const filtered = statusFilter
    ? results.filter((c) => c.status === statusFilter)
    : results;

  /* ── Selection ────────────────────────────────────────────────────────────── */
  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.cnpj));

  function toggleOne(cnpj) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(cnpj) ? next.delete(cnpj) : next.add(cnpj);
      return next;
    });
  }
  function toggleAll() {
    if (allVisibleSelected) {
      setSelected((prev) => { const n = new Set(prev); filtered.forEach((c) => n.delete(c.cnpj)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); filtered.forEach((c) => n.add(c.cnpj)); return n; });
    }
  }

  /* ── Status update (used by drawer + bulk) ────────────────────────────────── */
  function updateStatus(cnpj, newStatus, newFluxoId, newEvents = []) {
    const update = (list) => list.map((c) =>
      c.cnpj === cnpj
        ? { ...c, status: newStatus, fluxoId: newFluxoId ?? c.fluxoId, history: [...(c.history ?? []), ...newEvents] }
        : c
    );
    setCompanies((p) => update(p));
    setResults((p) => update(p));
    if (drawer?.cnpj === cnpj) {
      setDrawer((p) => p ? { ...p, status: newStatus, fluxoId: newFluxoId ?? p.fluxoId, history: [...(p.history ?? []), ...newEvents] } : null);
    }
  }

  /* ── Search ───────────────────────────────────────────────────────────────── */
  const handleSearch = useCallback(async (form) => {
    setSearching(true); setSearchError(''); setHasSearched(true);
    try {
      const filtered = await searchByCNAE(form, companies);
      setResults(filtered);
    } catch (err) {
      setSearchError(err.message ?? 'Erro ao buscar empresas.'); setResults([]);
    } finally { setSearching(false); }
  }, [companies]);

  /* ── Individual enrich ────────────────────────────────────────────────────── */
  const handleEnrich = useCallback(async (company) => {
    setEnrichState((p) => ({ ...p, [company.cnpj]: { loading: true } }));
    try {
      const [hunterData, apolloData] = await Promise.allSettled([
        findEmailsByDomain(company.domain),
        enrichByDomain(company.domain),
      ]);
      const email = hunterData.status === 'fulfilled' && hunterData.value?.[0]?.email;
      const phone = apolloData.status === 'fulfilled' && apolloData.value?.[0]?.phone;
      setEnrichState((p) => ({
        ...p,
        [company.cnpj]: {
          loading: false,
          email: email || null,
          phone: phone || null,
          emailNotFound: !email,
        },
      }));
    } catch {
      setEnrichState((p) => ({ ...p, [company.cnpj]: { loading: false, emailNotFound: true } }));
    }
  }, []);

  /* ── AI script ────────────────────────────────────────────────────────────── */
  function handleAI(company) {
    openAI(
      `Script de prospecção para ${company.nomeFantasia || company.razaoSocial}. ` +
      `Setor: ${company.cnaeDesc}. Localização: ${company.municipio}/${company.uf}. ` +
      `Porte: ${company.porte}. Capital: ${fmtBRL(company.capitalSocial)}. ` +
      `Crie uma mensagem de primeiro contato persuasiva e personalizada.`
    );
  }

  /* ── Bulk: Adicionar à Régua ─────────────────────────────────────────────── */
  function handleConfirmRegua(fluxoId) {
    const fluxo = FLUXOS_REGUA.find((f) => f.id === fluxoId);
    selected.forEach((cnpj) => {
      const c = results.find((r) => r.cnpj === cnpj);
      if (!c) return;
      const eventos = [
        { id: `h${Date.now()}-${cnpj}`, tipo: 'fluxo', data: today(), descricao: `Adicionada ao fluxo "${fluxo.nome}"`, usuario: 'Admin' },
        { id: `h${Date.now() + 1}-${cnpj}`, tipo: 'status_change', data: today(), descricao: `Status: ${STATUS_CFG[c.status]?.label ?? ''} → Em régua`, usuario: 'Admin' },
      ];
      updateStatus(cnpj, 'em_regua', fluxoId, eventos);
    });
    setToast(`${selected.size} empresa${selected.size !== 1 ? 's adicionadas' : ' adicionada'} ao fluxo "${fluxo.nome}"`);
    setSelected(new Set()); setShowRegua(false);
    setTimeout(() => setToast(''), 4000);
  }

  /* ── Bulk: Adicionar ao CRM ──────────────────────────────────────────────── */
  function handleConfirmCRM() {
    selected.forEach((cnpj) => {
      const c = results.find((r) => r.cnpj === cnpj);
      if (!c) return;
      addLead({
        funilId: 'f1', col: 'prospeccao',
        company: c.nomeFantasia || c.razaoSocial,
        contact: '', email: c.email, phone: c.telefone,
        sector: c.cnaeDesc, tags: ['Prospecção Ativa'],
        value: 0, daysSinceContact: 0, followUpDate: null,
        notes: `Importado da Prospecção Ativa. CNPJ: ${c.cnpj}. Capital: ${fmtBRL(c.capitalSocial)}.`,
        responsavel: 'Admin', camposPersonalizados: {},
      });
      updateStatus(cnpj, 'no_crm', null, [
        { id: `h${Date.now()}-${cnpj}`, tipo: 'status_change', data: today(), descricao: 'Adicionada ao CRM como lead', usuario: 'Admin' },
      ]);
    });
    setToast(`${selected.size} empresa${selected.size !== 1 ? 's adicionadas' : ' adicionada'} ao CRM`);
    setSelected(new Set()); setShowCRMWarn(false);
    setTimeout(() => setToast(''), 4000);
  }

  /* ── Bulk: Descartar ─────────────────────────────────────────────────────── */
  function handleDiscard() {
    selected.forEach((cnpj) => {
      const c = results.find((r) => r.cnpj === cnpj);
      if (!c) return;
      updateStatus(cnpj, 'descartada', null, [
        { id: `h${Date.now()}-${cnpj}`, tipo: 'status_change', data: today(), descricao: `Status: ${STATUS_CFG[c.status]?.label ?? ''} → Descartada`, usuario: 'Admin' },
      ]);
    });
    setToast(`${selected.size} empresa${selected.size !== 1 ? 's descartadas' : ' descartada'}`);
    setSelected(new Set());
    setTimeout(() => setToast(''), 4000);
  }

  /* ── CSV import ──────────────────────────────────────────────────────────── */
  function handleCSVImport(rows, mapping) {
    const toIdx = (f) => mapping[f] !== '' ? parseInt(mapping[f], 10) : -1;
    const newCompanies = rows.map((row, i) => ({
      cnpj: row[toIdx('cnpj')] || `CSV-${Date.now()}-${i}`,
      razaoSocial: row[toIdx('empresa')] || 'Empresa importada',
      nomeFantasia: row[toIdx('empresa')] || '',
      cnae: row[toIdx('cnae')] || '',
      cnaeDesc: '',
      municipio: row[toIdx('cidade')] || '',
      uf: row[toIdx('uf')] || '',
      porte: 'ME',
      capitalSocial: 0,
      telefone: row[toIdx('telefone')] || '',
      email: row[toIdx('email')] || '',
      domain: '',
      situacao: 'ATIVA',
      emailScore: row[toIdx('email')] ? 'nao_verificado' : 'baixo',
      phoneStatus: row[toIdx('telefone')] ? 'nao_verificado' : 'nao_encontrado',
      score: 'medio',
      status: 'nova',
      fluxoId: null,
      origem: 'importacao_csv',
      history: [{ id: `h${Date.now()}-${i}`, tipo: 'descoberta', data: today(), descricao: 'Importada via CSV', usuario: 'Admin' }],
    }));
    setCompanies((p) => [...p, ...newCompanies]);
    setResults((p) => [...p, ...newCompanies]);
    setToast(`${newCompanies.length} empresa${newCompanies.length !== 1 ? 's importadas' : ' importada'} com sucesso`);
    setShowCSV(false);
    setTimeout(() => setToast(''), 4000);
  }

  /* ── Status filter counts ─────────────────────────────────────────────────── */
  const countByStatus = Object.fromEntries(ALL_STATUS_KEYS.map((k) => [k, results.filter((c) => c.status === k).length]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Integrations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <IntegrationCard icon={Building2} name="Receita Federal" description="Consulta de CNPJ e dados cadastrais" status="active" badge="Grátis" />
        <IntegrationCard icon={Mail} name="Hunter.io" description={hunterAvailable ? 'Busca de e-mails por domínio ativa' : 'Configure VITE_HUNTER_API_KEY no .env'} status={hunterAvailable ? 'partial' : 'missing'} />
        <IntegrationCard icon={Zap} name="Apollo.io" description={apolloAvailable ? 'Enriquecimento de contatos ativo' : 'Configure VITE_APOLLO_API_KEY no .env'} status={apolloAvailable ? 'partial' : 'missing'} />
        <IntegrationCard icon={Phone} name="WhatsApp Business" description="Disparo de mensagens automatizadas" status="soon" badge="Em breve" />
      </div>

      {/* Search form */}
      <SearchForm onSearch={handleSearch} loading={searching} />

      {searchError && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(240,92,92,0.08)', border: '1px solid rgba(240,92,92,0.2)', color: 'var(--red)', fontSize: 13 }}>
          {searchError}
        </div>
      )}

      {/* Results table */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>

        {/* Table header bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginRight: 4 }}>
            Resultados
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400, marginLeft: 8 }}>
              {filtered.length} de {results.length} empresa{results.length !== 1 ? 's' : ''}
            </span>
          </p>

          {/* Status filter pills */}
          <div style={{ display: 'flex', gap: 5, flex: 1, flexWrap: 'wrap' }}>
            <button
              onClick={() => setStatusFilter('')}
              style={{ fontSize: 10, padding: '2px 9px', borderRadius: 20, border: `1px solid ${!statusFilter ? 'var(--accent)' : 'var(--border)'}`, background: !statusFilter ? 'rgba(91,110,245,0.12)' : 'var(--bg3)', color: !statusFilter ? 'var(--accent2)' : 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              Todas ({results.length})
            </button>
            {ALL_STATUS_KEYS.map((k) => {
              const cfg = STATUS_CFG[k];
              const cnt = countByStatus[k];
              if (!cnt) return null;
              return (
                <button key={k} onClick={() => setStatusFilter(statusFilter === k ? '' : k)} style={{ fontSize: 10, padding: '2px 9px', borderRadius: 20, border: `1px solid ${statusFilter === k ? cfg.border : 'var(--border)'}`, background: statusFilter === k ? cfg.bg : 'var(--bg3)', color: statusFilter === k ? cfg.color : 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  {cfg.label} ({cnt})
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            <PermissionGate module="prospeccao" action="edit">
              <button onClick={() => setShowCSV(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <Upload size={12} /> Importar CSV
              </button>
            </PermissionGate>
            {hasSearched && (
              <button onClick={() => { setResults(companies); setHasSearched(false); setStatusFilter(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)' }}>
                <RefreshCw size={11} /> Limpar filtros
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Search size={28} style={{ color: 'var(--text3)', marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>Nenhuma empresa encontrada.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {/* Select all */}
                  <th style={{ padding: '10px 0 10px 14px', width: 36, background: 'var(--bg3)' }}>
                    <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, color: allVisibleSelected ? 'var(--accent2)' : 'var(--text3)' }}>
                      {allVisibleSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                    </button>
                  </th>
                  {['Empresa', 'CNAE', 'Localização', 'E-mail', 'Telefone', 'Score', 'Status', 'Ações'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg3)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((co) => (
                  <ResultRow
                    key={co.cnpj}
                    company={co}
                    selected={selected.has(co.cnpj)}
                    onToggle={toggleOne}
                    onOpenDrawer={setDrawer}
                    onAI={handleAI}
                    onEnrich={handleEnrich}
                    enrichState={enrichState[co.cnpj]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bulk action bar — inside card, sticky */}
        {selected.size > 0 && (
          <BulkActionBar
            count={selected.size}
            onAddToRegua={() => setShowRegua(true)}
            onAddToCRM={() => setShowCRMWarn(true)}
            onDiscard={handleDiscard}
            onClear={() => setSelected(new Set())}
          />
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {drawer && (
        <CompanyDrawer
          company={drawer}
          onClose={() => setDrawer(null)}
          onUpdateStatus={updateStatus}
          openAI={openAI}
        />
      )}
      {showRegua && (
        <AddToReguaModal
          count={selected.size}
          onConfirm={handleConfirmRegua}
          onClose={() => setShowRegua(false)}
        />
      )}
      {showCRMWarn && (
        <AddToCRMWarningModal
          count={selected.size}
          onAddToRegua={() => { setShowCRMWarn(false); setShowRegua(true); }}
          onAddToCRM={handleConfirmCRM}
          onClose={() => setShowCRMWarn(false)}
        />
      )}
      {showCSV && (
        <CSVImportModal
          onImport={handleCSVImport}
          onClose={() => setShowCSV(false)}
        />
      )}
      {toast && <Toast msg={toast} onDismiss={() => setToast('')} />}
    </div>
  );
}
