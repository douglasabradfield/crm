import { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  TrendingUp, TrendingDown, Target, Users, DollarSign, Percent,
  Calendar, Bot, CheckCircle2, Clock, AlertCircle, Plus, X,
  HelpCircle, GripVertical, Pencil, Trash2, ArrowUp, ArrowDown,
  Download, Settings, Check, AlertTriangle, ChevronDown, BarChart2,
} from 'lucide-react';
import { useUI } from '../store/index.js';
import { useAI } from '../hooks/useAI.js';
import { useCRM } from '../store/crm.js';
import PermissionGate from '../components/Auth/PermissionGate.jsx';

/* ─── Constants ──────────────────────────────────────────────────────────────── */

const PERIOD_OPTIONS = [
  { id: 'hoje',      label: 'Hoje' },
  { id: 'semana',    label: 'Semana' },
  { id: 'mes',       label: 'Mês' },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'semestre',  label: 'Semestre' },
  { id: 'ano',       label: 'Ano' },
  { id: 'custom',    label: 'Personalizado' },
];

const PERIOD_LABEL = {
  hoje: 'vs ontem', semana: 'vs semana anterior', mes: 'vs mês anterior',
  trimestre: 'vs trimestre anterior', semestre: 'vs semestre anterior', ano: 'vs ano anterior',
};

const KPI_TIPOS = [
  { value: 'numero',     label: 'Número' },
  { value: 'moeda',      label: 'Moeda (R$)' },
  { value: 'percentual', label: 'Percentual (%)' },
  { value: 'tempo',      label: 'Tempo (dias)' },
];

const KPI_FONTES = [
  { value: 'leads',          label: 'Leads gerados (CRM)' },
  { value: 'conversao',      label: 'Taxa de conversão (calculada)' },
  { value: 'cac',            label: 'CAC (calculado)' },
  { value: 'ticket_medio',   label: 'Ticket médio (calculado)' },
  { value: 'clientes_ativos',label: 'Clientes ativos (CRM)' },
  { value: 'nps',            label: 'NPS médio (CRM)' },
  { value: 'posts',          label: 'Posts publicados (Redes)' },
];

const CICLOS = ['Mensal', 'Trimestral', 'Semestral', 'Anual'];
const FREQUENCIAS = [{ value: 'diaria', label: 'Diária' }, { value: 'semanal', label: 'Semanal' }, { value: 'mensal', label: 'Mensal' }];
const PRIORIDADES = [{ value: 'alta', label: 'Alta', color: '--red' }, { value: 'media', label: 'Média', color: '--amber' }, { value: 'baixa', label: 'Baixa', color: '--teal' }];
const PROJ_STATUS = [
  { value: 'nao_iniciado', label: 'Não iniciado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido',    label: 'Concluído' },
  { value: 'bloqueado',    label: 'Bloqueado' },
];
const SETORES = ['SaaS / Tecnologia', 'Consultoria', 'E-commerce', 'Serviços B2B', 'Varejo', 'Educação', 'Saúde', 'Construção', 'Alimentação', 'Outro'];
const PORTES = ['MEI', 'ME', 'EPP', 'Médio'];
const MODELOS = ['B2B', 'B2C', 'Recorrência / SaaS', 'Por projeto', 'Marketplace'];
const REGIOES = ['Sul', 'Sudeste', 'Centro-Oeste', 'Norte', 'Nordeste'];

/* ─── Mock data ──────────────────────────────────────────────────────────────── */

const KPIS_INIT = [
  { id: 'k1', nome: 'Receita Mensal',      tipo: 'moeda',      calculo: 'manual',     fonte: null,             valor: 127000, meta: 150000, tendencia: 8.4,  prazo: '2026-06-30', frequencia: 'mensal', invertGoal: false, descricao: 'Total de receita reconhecida no mês vigente, incluindo novos contratos e recorrência.', formula: 'Soma de todas as faturas emitidas ou contratos fechados no período.', exemplo: 'Abril: R$ 117k → Maio: R$ 127k → variação +8,5%' },
  { id: 'k2', nome: 'Novos Clientes',      tipo: 'numero',     calculo: 'automatico', fonte: 'clientes_ativos', valor: 8,      meta: 12,     tendencia: -16.7,prazo: '2026-06-30', frequencia: 'mensal', invertGoal: false, descricao: 'Número de novos clientes adquiridos no período. Não conta reativações.', formula: 'Contagem de leads convertidos com data de conversão dentro do período.', exemplo: 'Abril: 10 → Maio: 8 → meta: 12' },
  { id: 'k3', nome: 'Taxa de Conversão',   tipo: 'percentual', calculo: 'automatico', fonte: 'conversao',       valor: 23,     meta: 30,     tendencia: 3.1,  prazo: '2026-06-30', frequencia: 'mensal', invertGoal: false, descricao: 'Percentual de leads qualificados que se tornam clientes.', formula: '(Clientes fechados ÷ Leads qualificados) × 100', exemplo: '165 leads → 38 fecharam → 23%' },
  { id: 'k4', nome: 'CAC Médio',           tipo: 'moeda',      calculo: 'manual',     fonte: null,             valor: 420,    meta: 350,    tendencia: 12,   prazo: '2026-06-30', frequencia: 'mensal', invertGoal: true,  descricao: 'Custo médio para adquirir um novo cliente.', formula: 'Investimento total em marketing + vendas ÷ Clientes adquiridos', exemplo: 'R$ 3.360 ÷ 8 clientes = R$ 420 por cliente' },
  { id: 'k5', nome: 'Ticket Médio',        tipo: 'moeda',      calculo: 'automatico', fonte: 'ticket_medio',   valor: 4200,   meta: 5000,   tendencia: 5.2,  prazo: '2026-06-30', frequencia: 'mensal', invertGoal: false, descricao: 'Valor médio de cada contrato fechado no período.', formula: 'Receita total ÷ Número de contratos fechados', exemplo: 'R$ 33.600 em 8 contratos = R$ 4.200' },
  { id: 'k6', nome: 'Leads Qualificados',  tipo: 'numero',     calculo: 'automatico', fonte: 'leads',          valor: 38,     meta: 60,     tendencia: -5,   prazo: '2026-06-30', frequencia: 'mensal', invertGoal: false, descricao: 'Leads que passaram pelos critérios de qualificação (BANT ou similar) no período.', formula: 'Contagem de leads com estágio ≥ "Qualificado" criados no período.', exemplo: '165 leads totais → 38 qualificados (23%)' },
];

const OKRS_INIT = [
  {
    id: 'o1', ciclo: 'Trimestral', periodo: 'Q2 2026',
    titulo: 'Tornar o comercial o principal motor de crescimento da empresa',
    krs: [
      { id: 'kr1', descricao: 'Atingir R$ 150k de receita mensal', atual: 127000, meta: 150000, unidade: 'R$', prazo: '2026-06-30', invertGoal: false },
      { id: 'kr2', descricao: 'Converter 30% dos leads qualificados em clientes', atual: 23, meta: 30, unidade: '%', prazo: '2026-06-30', invertGoal: false },
      { id: 'kr3', descricao: 'Gerar 60 leads qualificados por mês', atual: 38, meta: 60, unidade: 'leads', prazo: '2026-06-30', invertGoal: false },
      { id: 'kr4', descricao: 'Reduzir CAC para R$ 350', atual: 420, meta: 350, unidade: 'R$', prazo: '2026-06-30', invertGoal: true },
    ],
  },
  {
    id: 'o2', ciclo: 'Trimestral', periodo: 'Q2 2026',
    titulo: 'Elevar a satisfação e retenção dos clientes atuais',
    krs: [
      { id: 'kr5', descricao: 'Aumentar NPS para 70+', atual: 67, meta: 70, unidade: 'pts', prazo: '2026-06-30', invertGoal: false },
      { id: 'kr6', descricao: 'Manter churn mensal abaixo de 2%', atual: 2.1, meta: 2, unidade: '%', prazo: '2026-06-30', invertGoal: true },
    ],
  },
];

const PROJETOS_INIT = [
  {
    id: 'p1', titulo: 'Régua de follow-up automatizada', responsavel: 'Douglas', prazo: '2026-06-10',
    prioridade: 'alta', status: 'em_andamento', okrVinculado: 'o1',
    descricao: 'Configurar fluxos na Régua de Comunicação para leads em cada estágio do funil.',
    subtarefas: [
      { id: 'st1', texto: 'Mapear estágios do funil', responsavel: 'Douglas', prazo: '2026-05-25', done: true },
      { id: 'st2', texto: 'Criar templates de e-mail', responsavel: 'Ana', prazo: '2026-06-01', done: true },
      { id: 'st3', texto: 'Configurar automação no sistema', responsavel: 'Douglas', prazo: '2026-06-05', done: false },
      { id: 'st4', texto: 'Testar e ajustar fluxos', responsavel: 'Douglas', prazo: '2026-06-10', done: false },
    ],
  },
  {
    id: 'p2', titulo: 'Programa de indicação para clientes', responsavel: 'Ana', prazo: '2026-07-01',
    prioridade: 'media', status: 'nao_iniciado', okrVinculado: 'o1',
    descricao: 'Desenvolver mecânica de referral para clientes ativos gerarem novos leads.',
    subtarefas: [
      { id: 'st5', texto: 'Pesquisar modelos de referral do setor', responsavel: 'Ana', prazo: '2026-06-01', done: false },
      { id: 'st6', texto: 'Definir benefícios para indicador e indicado', responsavel: 'Ana', prazo: '2026-06-15', done: false },
    ],
  },
  {
    id: 'p3', titulo: 'Reestruturar processo de NPS', responsavel: 'Marcos', prazo: '2026-05-30',
    prioridade: 'alta', status: 'bloqueado', okrVinculado: 'o2',
    descricao: 'Automatizar envio de NPS e criar plano de ação para detratores.',
    subtarefas: [
      { id: 'st7', texto: 'Escolher ferramenta de NPS', responsavel: 'Marcos', prazo: '2026-05-20', done: true },
      { id: 'st8', texto: 'Integrar ferramenta com CRM', responsavel: 'Douglas', prazo: '2026-05-28', done: false },
    ],
  },
];

const BENCHMARKS_INIT = [
  { id: 'b1', kpi: 'Taxa de Conversão', sua: 23,   bm: 18,   unidade: '%',    prefix: false, maior_melhor: true },
  { id: 'b2', kpi: 'CAC',               sua: 420,  bm: 380,  unidade: 'R$',   prefix: true,  maior_melhor: false },
  { id: 'b3', kpi: 'Ticket Médio',      sua: 4200, bm: 3600, unidade: 'R$',   prefix: true,  maior_melhor: true },
  { id: 'b4', kpi: 'Ciclo de Venda',    sua: 28,   bm: 32,   unidade: 'dias', prefix: false, maior_melhor: false },
  { id: 'b5', kpi: 'Churn Mensal',      sua: 2.1,  bm: 3.4,  unidade: '%',    prefix: false, maior_melhor: false },
  { id: 'b6', kpi: 'LTV / CAC',         sua: 8.2,  bm: 6.0,  unidade: 'x',    prefix: false, maior_melhor: true },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────────── */

const fmtBRL = (n) =>
  n >= 1_000_000 ? `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  : n >= 1_000   ? `R$ ${(n / 1_000).toFixed(0)}k`
  : `R$ ${n.toLocaleString('pt-BR')}`;

function fmtValue(val, tipo) {
  if (tipo === 'moeda')      return fmtBRL(val);
  if (tipo === 'percentual') return `${val}%`;
  if (tipo === 'tempo')      return `${val}d`;
  return String(val);
}

function fmtBenchmark(val, unidade, prefix) {
  if (prefix) return fmtBRL(val);
  return `${val}${unidade}`;
}

function krProgress(kr) {
  if (kr.invertGoal) return kr.atual <= kr.meta ? 100 : Math.round((kr.meta / kr.atual) * 100);
  return Math.min(100, Math.round((kr.atual / kr.meta) * 100));
}

function okrAvgProgress(okr) {
  if (!okr.krs.length) return 0;
  return Math.round(okr.krs.reduce((s, kr) => s + krProgress(kr), 0) / okr.krs.length);
}

function okrStatus(pct) {
  if (pct >= 70) return { label: 'No caminho',  color: 'var(--green)',  bg: 'rgba(45,212,160,0.12)', icon: CheckCircle2 };
  if (pct >= 40) return { label: 'Em risco',    color: 'var(--amber)',  bg: 'rgba(240,168,50,0.12)', icon: AlertCircle  };
  return           { label: 'Atrasado',          color: 'var(--red)',    bg: 'rgba(240,92,92,0.12)',  icon: AlertTriangle };
}

function projStatusCfg(s) {
  const map = {
    nao_iniciado: { label: 'Não iniciado', color: 'var(--text3)',   bg: 'var(--bg4)' },
    em_andamento: { label: 'Em andamento', color: 'var(--accent2)', bg: 'rgba(91,110,245,0.12)' },
    concluido:    { label: 'Concluído',    color: 'var(--green)',   bg: 'rgba(45,212,160,0.12)' },
    bloqueado:    { label: 'Bloqueado',    color: 'var(--red)',     bg: 'rgba(240,92,92,0.12)' },
  };
  return map[s] || map.nao_iniciado;
}

function uid() { return `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

function isOverdue(prazo) {
  return prazo && prazo < new Date().toISOString().split('T')[0];
}

/* ─── Small components ───────────────────────────────────────────────────────── */

function CircleProgress({ pct, color = 'var(--accent2)', size = 44, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct, 100) / 100;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
    </svg>
  );
}

function DiffBadge({ tendencia, invertGoal, period }) {
  const improved = invertGoal ? tendencia < 0 : tendencia > 0;
  const color = improved ? 'var(--green)' : 'var(--red)';
  const Icon  = improved ? ArrowUp : ArrowDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color }}>
      <Icon size={11} />
      {Math.abs(tendencia).toFixed(1)}% {PERIOD_LABEL[period] || 'vs anterior'}
    </span>
  );
}

function PriorityBadge({ prioridade }) {
  const cfg = PRIORIDADES.find(p => p.value === prioridade) || PRIORIDADES[1];
  return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, color: `var(${cfg.color})`, background: `color-mix(in srgb, var(${cfg.color}) 15%, transparent)` }}>{cfg.label}</span>;
}

function ProgressBar({ pct, color = 'var(--accent2)', height = 4 }) {
  return (
    <div style={{ height, background: 'var(--bg4)', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 99, transition: 'width .4s' }} />
    </div>
  );
}

/* ─── KPIHelpModal ───────────────────────────────────────────────────────────── */

function KPIHelpModal({ kpi, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 440, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <HelpCircle size={16} style={{ color: 'var(--accent2)' }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', flex: 1 }}>{kpi.nome}</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'DEFINIÇÃO', value: kpi.descricao },
            { label: 'FÓRMULA DE CÁLCULO', value: kpi.formula },
            { label: 'EXEMPLO PRÁTICO', value: kpi.exemplo },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, background: 'var(--bg3)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── KPIFormModal ───────────────────────────────────────────────────────────── */

function KPIFormModal({ kpi, onSave, onClose }) {
  const empty = { nome: '', tipo: 'numero', calculo: 'manual', fonte: 'leads', valor: '', meta: '', prazo: '', frequencia: 'mensal', invertGoal: false, descricao: '', formula: '', exemplo: '' };
  const [form, setForm] = useState(kpi ? { ...kpi } : empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.nome.trim() && form.meta !== '';

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: 20 }}>
      <div style={{ width: 480, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{kpi ? 'Editar KPI' : 'Novo KPI'}</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Nome */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Nome do KPI *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Taxa de Conversão"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
          </div>

          {/* Tipo + Cálculo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                {KPI_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Cálculo</label>
              <div style={{ display: 'flex', gap: 6, height: 34 }}>
                {['manual', 'automatico'].map(c => (
                  <button key={c} onClick={() => set('calculo', c)}
                    style={{ flex: 1, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', border: '1px solid',
                      background: form.calculo === c ? 'var(--accent)' : 'var(--bg4)',
                      borderColor: form.calculo === c ? 'var(--accent)' : 'var(--border)',
                      color: form.calculo === c ? '#fff' : 'var(--text3)',
                    }}>
                    {c === 'manual' ? 'Manual' : 'Automático'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fonte (if automático) */}
          {form.calculo === 'automatico' && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Fonte de dados</label>
              <select value={form.fonte || 'leads'} onChange={e => set('fonte', e.target.value)}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                {KPI_FONTES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          )}

          {/* Valor atual (if manual) */}
          {form.calculo === 'manual' && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Valor atual</label>
              <input type="number" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
            </div>
          )}

          {/* Meta + Prazo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Meta *</label>
              <input type="number" value={form.meta} onChange={e => set('meta', e.target.value)} placeholder="0"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Prazo</label>
              <input type="date" value={form.prazo} onChange={e => set('prazo', e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
            </div>
          </div>

          {/* Frequência + Invertido */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Frequência</label>
              <select value={form.frequencia} onChange={e => set('frequencia', e.target.value)}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                {FREQUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
                <input type="checkbox" checked={form.invertGoal} onChange={e => set('invertGoal', e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                Menor valor é melhor
              </label>
              <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Ex: CAC, churn, prazo</span>
            </div>
          </div>

          {/* Description (optional) */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Descrição <span style={{ color: 'var(--border2)' }}>(opcional)</span></label>
            <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={2}
              placeholder="O que este KPI mede..."
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'var(--font-body)', lineHeight: 1.5 }} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancelar</button>
            <button onClick={() => valid && onSave({ ...form, id: form.id || uid(), tendencia: form.tendencia ?? 0 })} disabled={!valid}
              style={{ flex: 2, padding: '8px', borderRadius: 8, background: valid ? 'var(--accent)' : 'var(--bg3)', color: valid ? '#fff' : 'var(--text3)', border: 'none', fontSize: 13, fontWeight: 500, cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)' }}>
              {kpi ? 'Salvar alterações' : 'Criar KPI'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ManageKPIsModal ────────────────────────────────────────────────────────── */

function ManageKPIsModal({ kpis, onReorder, onDelete, onEdit, onAdd, onClose }) {
  function handleDragEnd(result) {
    if (!result.destination || result.destination.index === result.source.index) return;
    const arr = [...kpis];
    const [item] = arr.splice(result.source.index, 1);
    arr.splice(result.destination.index, 0, item);
    onReorder(arr);
  }

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 500, maxHeight: '85vh', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Gerenciar KPIs</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>{kpis.length} de 20</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="manage-kpis">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {kpis.map((kpi, i) => (
                    <Draggable key={kpi.id} draggableId={kpi.id} index={i}>
                      {(dp, snap) => (
                        <div ref={dp.innerRef} {...dp.draggableProps}
                          style={{ ...dp.draggableProps.style, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: snap.isDragging ? 'var(--bg3)' : 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
                          <div {...dp.dragHandleProps} style={{ color: 'var(--text3)', cursor: 'grab', display: 'flex' }}><GripVertical size={14} /></div>
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)' }}>{kpi.nome}</span>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--text3)' }}>{KPI_TIPOS.find(t => t.value === kpi.tipo)?.label}</span>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: kpi.calculo === 'automatico' ? 'rgba(45,212,160,0.1)' : 'var(--bg4)', color: kpi.calculo === 'automatico' ? 'var(--green)' : 'var(--text3)' }}>
                            {kpi.calculo === 'automatico' ? 'Auto' : 'Manual'}
                          </span>
                          <PermissionGate module="kpis" action="edit">
                            <button onClick={() => onEdit(kpi)} style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={11} /></button>
                          </PermissionGate>
                          <PermissionGate module="kpis" action="delete">
                            <button onClick={() => onDelete(kpi.id)} style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={11} /></button>
                          </PermissionGate>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Arraste para reordenar</span>
          <PermissionGate module="kpis" action="edit">
            <button onClick={onAdd} disabled={kpis.length >= 20}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: kpis.length >= 20 ? 'var(--bg3)' : 'var(--accent)', color: kpis.length >= 20 ? 'var(--text3)' : '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 500, cursor: kpis.length >= 20 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}>
              <Plus size={12} /> Novo KPI
            </button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}

/* ─── OKRFormModal ───────────────────────────────────────────────────────────── */

function OKRFormModal({ okr, onSave, onClose }) {
  const empty = { titulo: '', ciclo: 'Trimestral', periodo: 'Q3 2026', krs: [{ id: uid(), descricao: '', atual: '', meta: '', unidade: '', prazo: '', invertGoal: false }] };
  const [form, setForm] = useState(okr ? { ...okr, krs: okr.krs.map(k => ({ ...k })) } : empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.titulo.trim() && form.krs.some(k => k.descricao.trim());

  function setKR(i, k, v) {
    setForm(f => ({ ...f, krs: f.krs.map((kr, idx) => idx === i ? { ...kr, [k]: v } : kr) }));
  }
  function addKR() { if (form.krs.length < 4) setForm(f => ({ ...f, krs: [...f.krs, { id: uid(), descricao: '', atual: '', meta: '', unidade: '', prazo: '', invertGoal: false }] })); }
  function removeKR(i) { setForm(f => ({ ...f, krs: f.krs.filter((_, idx) => idx !== i) })); }

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div style={{ width: 560, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{okr ? 'Editar OKR' : 'Novo OKR'}</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '75vh', overflowY: 'auto' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Objetivo (qualitativo) *</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Tornar o comercial o motor de crescimento..."
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Ciclo</label>
              <select value={form.ciclo} onChange={e => set('ciclo', e.target.value)}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                {CICLOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Período</label>
              <input value={form.periodo} onChange={e => set('periodo', e.target.value)} placeholder="Ex: Q3 2026"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>RESULTADOS-CHAVE ({form.krs.length}/4)</label>
              {form.krs.length < 4 && (
                <button onClick={addKR} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <Plus size={11} /> Adicionar KR
                </button>
              )}
            </div>
            {form.krs.map((kr, i) => (
              <div key={kr.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent2)', background: 'rgba(91,110,245,0.15)', padding: '2px 7px', borderRadius: 20 }}>KR {i + 1}</span>
                  {form.krs.length > 1 && <button onClick={() => removeKR(i)} style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} /></button>}
                </div>
                <input value={kr.descricao} onChange={e => setKR(i, 'descricao', e.target.value)} placeholder="Descrição do resultado-chave"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 9px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)', marginBottom: 7 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 7 }}>
                  {[['atual', 'Atual'], ['meta', 'Meta'], ['unidade', 'Unidade']].map(([field, lbl]) => (
                    <div key={field}>
                      <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>{lbl}</label>
                      <input value={kr[field]} onChange={e => setKR(i, field, e.target.value)} placeholder={field === 'unidade' ? 'R$, %, leads...' : '0'}
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text3)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={kr.invertGoal} onChange={e => setKR(i, 'invertGoal', e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                      Menor melhor
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancelar</button>
            <button onClick={() => valid && onSave({ ...form, id: form.id || uid() })} disabled={!valid}
              style={{ flex: 2, padding: '8px', borderRadius: 8, background: valid ? 'var(--accent)' : 'var(--bg3)', color: valid ? '#fff' : 'var(--text3)', border: 'none', fontSize: 13, fontWeight: 500, cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)' }}>
              {okr ? 'Salvar OKR' : 'Criar OKR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ProjectFormModal ───────────────────────────────────────────────────────── */

function ProjectFormModal({ projeto, okrs, onSave, onClose }) {
  const empty = { titulo: '', descricao: '', responsavel: '', prazo: '', prioridade: 'media', status: 'nao_iniciado', okrVinculado: '', subtarefas: [] };
  const [form, setForm] = useState(projeto ? { ...projeto, subtarefas: projeto.subtarefas.map(s => ({ ...s })) } : empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.titulo.trim();

  function addST() { setForm(f => ({ ...f, subtarefas: [...f.subtarefas, { id: uid(), texto: '', responsavel: '', prazo: '', done: false }] })); }
  function setST(i, k, v) { setForm(f => ({ ...f, subtarefas: f.subtarefas.map((s, idx) => idx === i ? { ...s, [k]: v } : s) })); }
  function removeST(i) { setForm(f => ({ ...f, subtarefas: f.subtarefas.filter((_, idx) => idx !== i) })); }

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div style={{ width: 540, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{projeto ? 'Editar Projeto' : 'Novo Projeto'}</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '75vh', overflowY: 'auto' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Título *</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Implementar régua de follow-up"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Descrição</label>
            <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={2} placeholder="Contexto e objetivo do projeto..."
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'var(--font-body)', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Responsável</label>
              <input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} placeholder="Nome..."
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Prazo</label>
              <input type="date" value={form.prazo} onChange={e => set('prazo', e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Prioridade</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {PRIORIDADES.map(p => (
                  <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: form.prioridade === p.value ? `var(${p.color})` : 'var(--text3)' }}>
                    <input type="radio" name="prioridade" value={p.value} checked={form.prioridade === p.value} onChange={() => set('prioridade', p.value)} style={{ accentColor: `var(${p.color})` }} />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                {PROJ_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>OKR vinculado</label>
              <select value={form.okrVinculado} onChange={e => set('okrVinculado', e.target.value)}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                <option value="">Nenhum</option>
                {okrs.map(o => <option key={o.id} value={o.id}>{o.titulo.slice(0, 30)}...</option>)}
              </select>
            </div>
          </div>

          {/* Subtarefas */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>SUBTAREFAS</label>
              <button onClick={addST} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}><Plus size={11} /> Adicionar</button>
            </div>
            {form.subtarefas.map((st, i) => (
              <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <input type="checkbox" checked={st.done} onChange={e => setST(i, 'done', e.target.checked)} style={{ accentColor: 'var(--green)', flexShrink: 0 }} />
                <input value={st.texto} onChange={e => setST(i, 'texto', e.target.value)} placeholder="Descrição da subtarefa..."
                  style={{ flex: 2, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
                <input value={st.responsavel} onChange={e => setST(i, 'responsavel', e.target.value)} placeholder="Resp."
                  style={{ flex: 1, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
                <button onClick={() => removeST(i)} style={{ width: 22, height: 22, borderRadius: 5, background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={10} /></button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancelar</button>
            <button onClick={() => valid && onSave({ ...form, id: form.id || uid() })} disabled={!valid}
              style={{ flex: 2, padding: '8px', borderRadius: 8, background: valid ? 'var(--accent)' : 'var(--bg3)', color: valid ? '#fff' : 'var(--text3)', border: 'none', fontSize: 13, fontWeight: 500, cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)' }}>
              {projeto ? 'Salvar projeto' : 'Criar projeto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ExportModal ────────────────────────────────────────────────────────────── */

function ExportModal({ period, onClose }) {
  const [step, setStep] = useState('config'); // config | generating | done
  const [email, setEmail] = useState('');

  function handleGenerate() {
    setStep('generating');
    setTimeout(() => setStep('done'), 1800);
  }

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 420, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Download size={14} style={{ color: 'var(--accent2)' }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', flex: 1 }}>Exportar relatório</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>

        <div style={{ padding: 20 }}>
          {step === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>CONTEÚDO DO RELATÓRIO</div>
                {['KPIs com valores e metas', 'Comparativo com período anterior', 'OKRs do ciclo atual', 'Projetos em andamento', 'Benchmarks do setor'].map(item => (
                  <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
                    <Check size={12} style={{ color: 'var(--green)' }} />
                    {item}
                  </label>
                ))}
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Envio mensal por e-mail (opcional)</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seu@email.com"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={handleGenerate}
                  style={{ flex: 2, padding: '8px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Gerar relatório
                </button>
              </div>
            </div>
          )}
          {step === 'generating' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>Gerando relatório...</p>
            </div>
          )}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(45,212,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={24} style={{ color: 'var(--green)' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Relatório gerado!</p>
              {email && <p style={{ fontSize: 12, color: 'var(--text3)' }}>Envio mensal configurado para {email}</p>}
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Fechar</button>
                <button onClick={() => window.print()}
                  style={{ flex: 2, padding: '8px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Download size={13} /> Imprimir / Salvar PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── MetricKPICard ──────────────────────────────────────────────────────────── */

function MetricKPICard({ kpi, period, onHelp }) {
  const pct      = kpi.invertGoal
    ? (kpi.atual <= kpi.meta ? 100 : Math.round((kpi.meta / kpi.valor) * 100))
    : Math.min(100, Math.round((kpi.valor / kpi.meta) * 100));
  const onTrack  = pct >= 85;
  const color    = pct >= 85 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.nome}</p>
            <button onClick={() => onHelp(kpi)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text3)', display: 'flex', lineHeight: 1 }}
              title="Saiba mais">
              <HelpCircle size={12} />
            </button>
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text)', lineHeight: 1 }}>
            {fmtValue(kpi.valor, kpi.tipo)}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>meta: {fmtValue(kpi.meta, kpi.tipo)}</p>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <CircleProgress pct={pct} color={color} size={48} stroke={4} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color }}>
            {pct}%
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>Progresso</span>
          <span style={{ fontSize: 10, fontWeight: 500, color }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} color={color} height={5} />
      </div>

      <DiffBadge tendencia={kpi.tendencia} invertGoal={kpi.invertGoal} period={period} />
    </div>
  );
}

/* ─── BenchmarkCard ──────────────────────────────────────────────────────────── */

function BenchmarkCard({ kpis }) {
  const { send, loading } = useAI();
  const [benchmarks, setBenchmarks] = useState(BENCHMARKS_INIT);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [aiComment, setAiComment] = useState('');
  const [ctx, setCtx] = useState({ setor: '', porte: 'ME', modelo: 'B2B', regiao: 'Sudeste' });

  async function handleConsult() {
    const prompt = `Sou uma empresa do setor "${ctx.setor}", porte ${ctx.porte}, modelo ${ctx.modelo}, região ${ctx.regiao}.
Fornece benchmarks estimados para PMEs brasileiras com esse perfil nos seguintes KPIs:
- Taxa de conversão de leads (%)
- CAC — Custo de Aquisição de Cliente (R$)
- Ticket médio (R$)
- Ciclo de venda (dias)
- Churn mensal (%)
- LTV/CAC (múltiplo)
Apresente faixas típicas (mínimo–máximo) e uma observação prática para cada. Seja direto e objetivo. Máx 300 palavras.`;
    const result = await send(prompt, 'Módulo KPIs — Benchmark do setor', []);
    if (result) {
      setAiComment(result);
      setLastUpdate(new Date().toLocaleDateString('pt-BR'));
      setShowForm(false);
    }
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={14} style={{ color: 'var(--accent2)' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Benchmarks do Setor</span>
          {lastUpdate && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Atualizado em {lastUpdate}</span>}
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(91,110,245,0.1)', border: '1px solid rgba(91,110,245,0.3)', borderRadius: 8, padding: '5px 10px', fontSize: 11, color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <Bot size={11} /> {aiComment ? 'Atualizar benchmark' : 'Consultar IA'}
        </button>
      </div>

      {/* Context form */}
      {showForm && (
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>Contexto da sua empresa para benchmarks mais precisos:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Setor</label>
              <select value={ctx.setor} onChange={e => setCtx(c => ({ ...c, setor: e.target.value }))}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                <option value="">Selecione...</option>
                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Porte</label>
              <select value={ctx.porte} onChange={e => setCtx(c => ({ ...c, porte: e.target.value }))}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                {PORTES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Modelo</label>
              <select value={ctx.modelo} onChange={e => setCtx(c => ({ ...c, modelo: e.target.value }))}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                {MODELOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Região</label>
              <select value={ctx.regiao} onChange={e => setCtx(c => ({ ...c, regiao: e.target.value }))}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                {REGIOES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleConsult} disabled={!ctx.setor || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: ctx.setor && !loading ? 'var(--accent)' : 'var(--bg4)', color: ctx.setor && !loading ? '#fff' : 'var(--text3)', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: ctx.setor && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)' }}>
            <Bot size={12} />{loading ? 'Consultando IA...' : 'Gerar benchmark'}
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg3)' }}>
              {['KPI', 'Sua empresa', 'Benchmark est.', 'Diferença'].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((b, i) => {
              const better = b.maior_melhor ? b.sua > b.bm : b.sua < b.bm;
              const diff   = b.maior_melhor
                ? ((b.sua - b.bm) / b.bm * 100).toFixed(1)
                : ((b.bm - b.sua) / b.bm * 100).toFixed(1);
              const color  = better ? 'var(--green)' : 'var(--amber)';
              const DiffIcon = better ? TrendingUp : TrendingDown;
              return (
                <tr key={b.id} style={{ borderBottom: i < benchmarks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text2)', fontWeight: 500 }}>{b.kpi}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)', fontWeight: 600 }}>{fmtBenchmark(b.sua, b.unidade, b.prefix)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text3)' }}>{fmtBenchmark(b.bm, b.unidade, b.prefix)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color, fontSize: 11, fontWeight: 600 }}>
                      <DiffIcon size={11} />{better ? '+' : '-'}{Math.abs(diff)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AI Commentary */}
      {aiComment && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Bot size={12} style={{ color: 'var(--accent2)' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent2)' }}>Análise da IA</span>
          </div>
          <pre style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', margin: 0 }}>{aiComment}</pre>
        </div>
      )}

      {/* Mandatory disclaimer */}
      <div style={{ padding: '10px 16px', background: 'rgba(240,168,50,0.06)', borderTop: '1px solid rgba(240,168,50,0.2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <AlertTriangle size={12} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--amber)', lineHeight: 1.5 }}>
          Estimativa baseada em fontes públicas disponíveis. Valores aproximados — use como referência, não como verdade absoluta. Consulte associações do seu setor para dados oficiais.
        </span>
      </div>
    </div>
  );
}

/* ─── OKRCard ────────────────────────────────────────────────────────────────── */

function OKRCard({ okr, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const pct = okrAvgProgress(okr);
  const st  = okrStatus(pct);
  const StIcon = st.icon;

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <div onClick={() => setExpanded(v => !v)} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <CircleProgress pct={pct} color={st.color} size={46} stroke={4} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: st.color }}>{pct}%</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{okr.titulo}</span>
            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'var(--bg3)', color: 'var(--text3)' }}>{okr.ciclo} · {okr.periodo}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: st.bg, color: st.color }}>
              <StIcon size={10} />{st.label}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{okr.krs.length} resultado{okr.krs.length !== 1 ? 's' : ''}-chave</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <PermissionGate module="kpis" action="edit">
            <button onClick={e => { e.stopPropagation(); onEdit(okr); }} style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={12} /></button>
          </PermissionGate>
          <PermissionGate module="kpis" action="delete">
            <button onClick={e => { e.stopPropagation(); onDelete(okr.id); }} style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
          </PermissionGate>
          <ChevronDown size={16} style={{ color: 'var(--text3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', alignSelf: 'center' }} />
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', background: 'var(--bg3)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {okr.krs.map((kr, i) => {
            const kpct = krProgress(kr);
            const kcolor = kpct >= 85 ? 'var(--green)' : kpct >= 50 ? 'var(--amber)' : 'var(--red)';
            return (
              <div key={kr.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent2)', background: 'rgba(91,110,245,0.15)', padding: '2px 6px', borderRadius: 20, flexShrink: 0 }}>KR{i + 1}</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>{kr.descricao}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: kcolor, flexShrink: 0 }}>{kpct}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ProgressBar pct={kpct} color={kcolor} height={4} />
                  <span style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {kr.unidade === 'R$' ? fmtBRL(Number(kr.atual)) : `${kr.atual} ${kr.unidade}`} / {kr.unidade === 'R$' ? fmtBRL(Number(kr.meta)) : `${kr.meta} ${kr.unidade}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── ProjectCard ────────────────────────────────────────────────────────────── */

function ProjectCard({ projeto, okrs, onEdit, onDelete, onToggleST }) {
  const [expanded, setExpanded] = useState(false);
  const done  = projeto.subtarefas.filter(s => s.done).length;
  const total = projeto.subtarefas.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const st    = projStatusCfg(projeto.status);
  const overdue = isOverdue(projeto.prazo);
  const linkedOKR = okrs.find(o => o.id === projeto.okrVinculado);
  const pri   = PRIORIDADES.find(p => p.value === projeto.prioridade) || PRIORIDADES[1];

  return (
    <div style={{ background: 'var(--bg2)', border: `1px solid ${overdue && projeto.status !== 'concluido' ? 'rgba(240,92,92,0.4)' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden' }}>
      <div onClick={() => setExpanded(v => !v)} style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: overdue && projeto.status !== 'concluido' ? 'var(--red)' : 'var(--text)' }}>{projeto.titulo}</span>
            <PriorityBadge prioridade={projeto.prioridade} />
            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: st.bg, color: st.color }}>{st.label}</span>
          </div>
          {projeto.descricao && <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 8 }}>{projeto.descricao}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ProgressBar pct={pct} color={pct === 100 ? 'var(--green)' : 'var(--accent2)'} height={4} />
            <span style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{done}/{total} tarefas</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <PermissionGate module="kpis" action="edit">
              <button onClick={e => { e.stopPropagation(); onEdit(projeto); }} style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={11} /></button>
            </PermissionGate>
            <PermissionGate module="kpis" action="delete">
              <button onClick={e => { e.stopPropagation(); onDelete(projeto.id); }} style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={11} /></button>
            </PermissionGate>
            <ChevronDown size={14} style={{ color: 'var(--text3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', alignSelf: 'center' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: overdue && projeto.status !== 'concluido' ? 'var(--red)' : 'var(--text3)' }}>
            <Calendar size={11} style={{ alignSelf: 'center' }} />
            {projeto.prazo?.split('-').reverse().join('/')} · {projeto.responsavel}
          </div>
          {linkedOKR && <span style={{ fontSize: 10, color: 'var(--accent2)', background: 'rgba(91,110,245,0.1)', padding: '2px 7px', borderRadius: 20 }}>↗ {linkedOKR.titulo.slice(0, 25)}...</span>}
        </div>
      </div>

      {expanded && total > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 18px 14px', background: 'var(--bg3)' }}>
          {projeto.subtarefas.map(st => (
            <label key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={st.done} onChange={() => onToggleST(projeto.id, st.id)}
                style={{ accentColor: 'var(--green)', width: 14, height: 14, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: st.done ? 'var(--text3)' : 'var(--text2)', textDecoration: st.done ? 'line-through' : 'none', flex: 1 }}>{st.texto}</span>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>{st.responsavel}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function KPIs() {
  const { openAI } = useUI();
  const { leads, clientes } = useCRM();

  const [tab,         setTab]         = useState('kpis');
  const [okrSubTab,   setOkrSubTab]   = useState('okrs');
  const [period,      setPeriod]      = useState('mes');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [kpis, setKpis] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('kpis_data') ?? 'null');
      return Array.isArray(saved) && saved.length > 0 ? saved : KPIS_INIT;
    } catch { return KPIS_INIT; }
  });
  const [okrs,        setOkrs]        = useState(OKRS_INIT);
  const [projetos,    setProjetos]    = useState(PROJETOS_INIT);

  useEffect(() => {
    try { localStorage.setItem('kpis_data', JSON.stringify(kpis)); } catch {}
  }, [kpis]);

  const [showManage,      setShowManage]      = useState(false);
  const [kpiForm,         setKpiForm]         = useState(null);  // null | 'new' | kpi object
  const [helpKPI,         setHelpKPI]         = useState(null);
  const [okrForm,         setOkrForm]         = useState(null);
  const [projectForm,     setProjectForm]     = useState(null);
  const [showExport,      setShowExport]      = useState(false);
  const [projFilter,      setProjFilter]      = useState({ status: 'todos', prioridade: 'todos', responsavel: '' });

  // Derive automatic KPI values from CRM store
  const autoValues = {
    leads:           leads.length,
    conversao:       leads.length > 0 ? Math.round((leads.filter(l => l.convertido).length / leads.length) * 100) : 0,
    clientes_ativos: clientes.filter(c => c.status === 'ativo').length,
    ticket_medio:    4200,
    cac:             420,
    nps:             67,
    posts:           24,
  };

  const resolvedKpis = kpis.map(k => k.calculo === 'automatico' && k.fonte && autoValues[k.fonte] !== undefined
    ? { ...k, valor: autoValues[k.fonte] }
    : k
  );

  // KPI CRUD
  function saveKPI(data) {
    if (kpis.find(k => k.id === data.id)) setKpis(prev => prev.map(k => k.id === data.id ? data : k));
    else setKpis(prev => [...prev, data]);
    setKpiForm(null);
    setShowManage(false);
  }
  function deleteKPI(id) { setKpis(prev => prev.filter(k => k.id !== id)); }

  // OKR CRUD
  function saveOKR(data) {
    if (okrs.find(o => o.id === data.id)) setOkrs(prev => prev.map(o => o.id === data.id ? data : o));
    else setOkrs(prev => [...prev, data]);
    setOkrForm(null);
  }
  function deleteOKR(id) { setOkrs(prev => prev.filter(o => o.id !== id)); }

  // Project CRUD
  function saveProject(data) {
    if (projetos.find(p => p.id === data.id)) setProjetos(prev => prev.map(p => p.id === data.id ? data : p));
    else setProjetos(prev => [...prev, data]);
    setProjectForm(null);
  }
  function deleteProject(id) { setProjetos(prev => prev.filter(p => p.id !== id)); }
  function toggleST(projId, stId) {
    setProjetos(prev => prev.map(p => p.id !== projId ? p : {
      ...p, subtarefas: p.subtarefas.map(s => s.id === stId ? { ...s, done: !s.done } : s)
    }));
  }

  // Filtered projects
  const filteredProjects = projetos.filter(p => {
    const s = projFilter.status === 'todos' || p.status === projFilter.status;
    const pr = projFilter.prioridade === 'todos' || p.prioridade === projFilter.prioridade;
    const r = !projFilter.responsavel || p.responsavel.toLowerCase().includes(projFilter.responsavel.toLowerCase());
    return s && pr && r;
  });

  return (
    <div style={{ padding: '0 0 24px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, gap: 2 }}>
          {[{ id: 'kpis', label: 'KPIs & Metas' }, { id: 'okrs', label: 'OKRs & Projetos' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '6px 14px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s',
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text3)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Period filter (KPIs tab) */}
        {tab === 'kpis' && (
          <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, gap: 2, flexWrap: 'wrap' }}>
            {PERIOD_OPTIONS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                style={{ padding: '5px 10px', borderRadius: 7, border: 'none', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', transition: 'all .15s',
                  background: period === p.id ? 'var(--bg4)' : 'transparent',
                  color: period === p.id ? 'var(--text)' : 'var(--text3)',
                  fontWeight: period === p.id ? 500 : 400,
                }}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        {tab === 'kpis' && period === 'custom' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="date" value={customRange.from} onChange={e => setCustomRange(r => ({ ...r, from: e.target.value }))}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', fontSize: 11, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>até</span>
            <input type="date" value={customRange.to} onChange={e => setCustomRange(r => ({ ...r, to: e.target.value }))}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', fontSize: 11, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }} />
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowExport(true)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Download size={13} /> Exportar
          </button>
          <PermissionGate module="kpis" action="edit">
            <button onClick={() => setShowManage(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Settings size={13} /> Gerenciar KPIs
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* KPIs Tab */}
      {tab === 'kpis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {resolvedKpis.map(k => (
              <MetricKPICard key={k.id} kpi={k} period={period} onHelp={setHelpKPI} />
            ))}
          </div>
          <BenchmarkCard kpis={resolvedKpis} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => openAI(`Meus KPIs atuais: ${resolvedKpis.map(k => `${k.nome}: ${fmtValue(k.valor, k.tipo)} (meta: ${fmtValue(k.meta, k.tipo)}, ${Math.round((k.valor/k.meta)*100)}%)`).join(', ')}. Quais são as 3 ações prioritárias que devo tomar essa semana para fechar o período na meta?`)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Bot size={14} /> IA: Top 3 ações desta semana
            </button>
          </div>
        </div>
      )}

      {/* OKRs & Projetos Tab */}
      {tab === 'okrs' && (
        <div>
          {/* Sub-tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            {[{ id: 'okrs', label: 'OKRs', count: okrs.length }, { id: 'projetos', label: 'Projetos', count: projetos.length }].map(t => (
              <button key={t.id} onClick={() => setOkrSubTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', background: 'transparent',
                  color: okrSubTab === t.id ? 'var(--text)' : 'var(--text3)',
                  borderBottom: `2px solid ${okrSubTab === t.id ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: -1,
                }}>
                {t.label}
                <span style={{ padding: '1px 6px', borderRadius: 20, fontSize: 10, background: okrSubTab === t.id ? 'var(--accent)' : 'var(--bg3)', color: okrSubTab === t.id ? '#fff' : 'var(--text3)' }}>{t.count}</span>
              </button>
            ))}
          </div>

          {okrSubTab === 'okrs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <PermissionGate module="kpis" action="edit">
                  <button onClick={() => setOkrForm('new')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    <Plus size={13} /> Novo OKR
                  </button>
                </PermissionGate>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {okrs.map(o => <OKRCard key={o.id} okr={o} onEdit={setOkrForm} onDelete={deleteOKR} />)}
              </div>
            </div>
          )}

          {okrSubTab === 'projetos' && (
            <div>
              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <select value={projFilter.status} onChange={e => setProjFilter(f => ({ ...f, status: e.target.value }))}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                  <option value="todos">Todos os status</option>
                  {PROJ_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={projFilter.prioridade} onChange={e => setProjFilter(f => ({ ...f, prioridade: e.target.value }))}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                  <option value="todos">Todas as prioridades</option>
                  {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <input value={projFilter.responsavel} onChange={e => setProjFilter(f => ({ ...f, responsavel: e.target.value }))}
                  placeholder="Filtrar por responsável..."
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)', width: 180 }} />
                <div style={{ marginLeft: 'auto' }}>
                  <PermissionGate module="kpis" action="edit">
                    <button onClick={() => setProjectForm('new')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                      <Plus size={13} /> Novo projeto
                    </button>
                  </PermissionGate>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredProjects.map(p => (
                  <ProjectCard key={p.id} projeto={p} okrs={okrs} onEdit={setProjectForm} onDelete={deleteProject} onToggleST={toggleST} />
                ))}
                {filteredProjects.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Nenhum projeto encontrado com esses filtros.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {helpKPI && <KPIHelpModal kpi={helpKPI} onClose={() => setHelpKPI(null)} />}

      {showManage && (
        <ManageKPIsModal
          kpis={kpis}
          onReorder={setKpis}
          onDelete={deleteKPI}
          onEdit={(k) => { setShowManage(false); setKpiForm(k); }}
          onAdd={() => { setShowManage(false); setKpiForm('new'); }}
          onClose={() => setShowManage(false)}
        />
      )}

      {kpiForm && (
        <KPIFormModal
          kpi={kpiForm === 'new' ? null : kpiForm}
          onSave={saveKPI}
          onClose={() => setKpiForm(null)}
        />
      )}

      {okrForm && (
        <OKRFormModal
          okr={okrForm === 'new' ? null : okrForm}
          onSave={saveOKR}
          onClose={() => setOkrForm(null)}
        />
      )}

      {projectForm && (
        <ProjectFormModal
          projeto={projectForm === 'new' ? null : projectForm}
          okrs={okrs}
          onSave={saveProject}
          onClose={() => setProjectForm(null)}
        />
      )}

      {showExport && <ExportModal period={period} onClose={() => setShowExport(false)} />}
    </div>
  );
}
