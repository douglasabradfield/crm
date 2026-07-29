import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  TrendingUp, TrendingDown, HelpCircle, X, Plus,
  GripVertical, Settings2, Save, Check,
  AlertCircle, CheckCircle, Calendar, Sparkles,
} from 'lucide-react';

import { useUI, useTheme } from '../store/index.js';
import { useAuth } from '../store/auth.js';
import { useCRM } from '../store/crm.js';
import { useNotifications } from '../hooks/useNotifications.js';
import { supabase } from '../services/supabase.js';
import Card from '../components/UI/Card.jsx';
import ProgressBar from '../components/UI/ProgressBar.jsx';
import SkeletonLoader from '../components/UI/SkeletonLoader.jsx';

// ── Constants ─────────────────────────────────────────────────────────────────

const TIME_FILTERS = ['Hoje', 'Semana', 'Mês', 'Trimestre', 'Semestre', 'Ano', 'Total', 'Personalizado'];

const DEFAULT_LAYOUT = [
  'metric_leads', 'metric_conversao', 'metric_cac', 'metric_pipeline',
  'alertas', 'atividades',
  'grafico_leads', 'top_clientes',
];

const ALERT_CONFIG = {
  warning: { Icon: AlertCircle, color: 'var(--amber)',   bg: 'rgba(240,168,50,0.08)',  border: 'rgba(240,168,50,0.2)'  },
  info:    { Icon: Calendar,    color: 'var(--accent2)', bg: 'rgba(91,110,245,0.06)',  border: 'rgba(91,110,245,0.2)'  },
};

const PERIOD_VS = {
  Hoje: 'dia anterior', Semana: 'semana anterior', Mês: 'mês anterior',
  Trimestre: 'trimestre anterior', Semestre: 'semestre anterior',
  Ano: 'ano anterior', Total: 'todo o histórico', Personalizado: 'período anterior',
};

const LIBRARY_CATEGORIES = [
  { id: 'comercial',           label: 'Métricas Comerciais'  },
  { id: 'clientes',            label: 'Métricas de Clientes' },
  { id: 'atividades_metricas', label: 'Atividades'           },
  { id: 'redes_metricas',      label: 'Redes Sociais'        },
  { id: 'widgets',             label: 'Widgets Compostos'    },
];

// Metadados estáticos por widget — nunca dados (valor/variação vêm sempre de computeMetrics
// ou de fetch real dentro do próprio widget composto).
const WIDGET_META = {
  metric_leads: {
    label: 'Leads Gerados', category: 'comercial', cols: 1,
    def: 'Total de novos leads gerados no período selecionado.',
    formula: 'Contagem de leads com data de criação dentro do período',
    example: 'Se você criou 47 leads este mês, esse é o seu número de leads gerados.',
  },
  metric_conversao: {
    label: 'Taxa de Conversão', category: 'comercial', cols: 1,
    def: 'Percentual de leads do período que já viraram clientes.',
    formula: 'Leads convertidos no período ÷ Total de leads do período × 100',
    example: 'Se você teve 45 leads e converteu 5, sua taxa de conversão é 11,1%.',
  },
  metric_cac: {
    label: 'CAC Médio', category: 'comercial', cols: 1,
    def: 'Custo médio para adquirir um novo cliente no período.',
    formula: 'Total gasto em marketing e vendas ÷ Clientes adquiridos',
    example: 'Ainda não há uma fonte de investimento em marketing conectada para calcular este indicador.',
  },
  metric_pipeline: {
    label: 'Receita Pipeline', category: 'comercial', cols: 1,
    def: 'Soma de todas as oportunidades abertas no CRM (leads ativos).',
    formula: 'Σ valor de todos os leads com status diferente de Ganho/Convertido',
    example: 'Se você tem 9 oportunidades com valores variados, o pipeline total é a soma delas.',
  },
  metric_ticket: {
    label: 'Ticket Médio', category: 'comercial', cols: 1,
    def: 'Valor médio gasto por cliente com valor registrado.',
    formula: 'Σ valor total gasto pelos clientes ÷ Número de clientes com valor > 0',
    example: 'Se 5 clientes já gastaram no total R$ 7.400, o ticket médio é R$ 1.480.',
  },
  metric_propostas: {
    label: 'Propostas Enviadas', category: 'comercial', cols: 1,
    def: 'Número de propostas comerciais enviadas no período.',
    formula: 'Contagem de leads que avançaram para a etapa "Proposta" no período',
    example: 'Ainda não há rastreamento de propostas enviadas conectado.',
  },
  metric_fechamento: {
    label: 'Taxa de Fechamento', category: 'comercial', cols: 1,
    def: 'Percentual de propostas enviadas que resultaram em venda.',
    formula: 'Vendas fechadas ÷ Propostas enviadas × 100',
    example: 'Ainda não há rastreamento de propostas enviadas conectado.',
  },
  metric_clientes: {
    label: 'Clientes Cadastrados', category: 'clientes', cols: 1,
    def: 'Total de clientes cadastrados na plataforma.',
    formula: 'Contagem de registros em Clientes',
    example: 'Se você tem 34 clientes cadastrados, esse é o número exibido.',
  },
  metric_churn: {
    label: 'Churn', category: 'clientes', cols: 1,
    def: 'Percentual de clientes que cancelaram ou foram perdidos no período.',
    formula: 'Clientes cancelados ÷ Total de clientes no início do período × 100',
    example: 'Ainda não há um registro de cancelamentos para calcular este indicador.',
  },
  metric_nps: {
    label: 'NPS Médio', category: 'clientes', cols: 1,
    def: 'Net Promoter Score médio dos clientes — mede lealdade e satisfação.',
    formula: 'Média das notas de NPS registradas em Clientes',
    example: 'Se as notas registradas somam 720 em 10 avaliações, o NPS médio é 72.',
  },
  metric_ltv: {
    label: 'LTV Médio', category: 'clientes', cols: 1,
    def: 'Valor médio total gerado por um cliente ao longo do relacionamento.',
    formula: 'Ticket médio × Frequência de compra mensal × Meses de retenção médio',
    example: 'Ainda não há um modelo de frequência/retenção conectado para calcular este indicador.',
  },
  metric_tarefas: {
    label: 'Tarefas Concluídas', category: 'atividades_metricas', cols: 1,
    def: 'Número de tarefas marcadas como concluídas (leads + clientes).',
    formula: 'Contagem de tarefas com status = Concluída',
    example: 'Se você concluiu 18 tarefas, esse é o número exibido.',
  },
  metric_followups: {
    label: 'Follow-ups Pendentes', category: 'atividades_metricas', cols: 1,
    def: 'Follow-ups agendados para hoje ou já vencidos.',
    formula: 'Contagem de leads não convertidos com data de follow-up ≤ hoje',
    example: 'Se você tem 7 follow-ups na fila, esse é o número exibido.',
  },
  metric_alcance: {
    label: 'Alcance Total', category: 'redes_metricas', cols: 1,
    def: 'Pessoas únicas alcançadas em todas as redes sociais conectadas.',
    formula: 'Soma do alcance orgânico + pago em todas as redes no período',
    example: 'Ainda não há dados de alcance conectados a este painel.',
  },
  metric_engajamento: {
    label: 'Engajamento Médio', category: 'redes_metricas', cols: 1,
    def: 'Taxa média de engajamento por post em todas as redes.',
    formula: '(Curtidas + Comentários + Compartilhamentos) ÷ Alcance × 100',
    example: 'Ainda não há dados de engajamento conectados a este painel.',
  },
  metric_posts: {
    label: 'Posts Publicados', category: 'redes_metricas', cols: 1,
    def: 'Total de posts publicados em todas as redes no período.',
    formula: 'Contagem de posts com status = Publicado e data dentro do período',
    example: 'Ainda não há dados de publicações conectados a este painel.',
  },
  alertas:       { label: 'Alertas e Follow-ups',   category: 'widgets', cols: 2 },
  atividades:    { label: 'Atividades do Dia',      category: 'widgets', cols: 2 },
  grafico_leads: { label: 'Leads por Mês',          category: 'widgets', cols: 2 },
  top_clientes:  { label: 'Top Clientes por Valor', category: 'widgets', cols: 2 },
  pipeline_mini: { label: 'Pipeline Resumido',      category: 'widgets', cols: 4 },
  okrs:          { label: 'OKRs em Andamento',      category: 'widgets', cols: 4 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (n) => `R$ ${Number(n).toLocaleString('pt-BR')}`;
const fmtChange = (n) => `${n > 0 ? '+' : ''}${n.toLocaleString('pt-BR')}%`;

function getWidgetMeta(id) {
  return WIDGET_META[id] ?? { id, label: id, cols: 2, category: 'widgets' };
}

function isMetricWidget(meta) {
  return meta.category !== 'widgets';
}

function krProgress(kr) {
  if (kr.invertGoal) return kr.atual <= kr.meta ? 100 : Math.round((kr.meta / kr.atual) * 100);
  return Math.min(100, Math.round((kr.atual / kr.meta) * 100));
}

// ── Period math (real date ranges, nunca dado fixo) ────────────────────────────

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d)   { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function getPeriodRange(period, customRange) {
  const now = new Date();
  let start;
  switch (period) {
    case 'Hoje':      start = startOfDay(now); break;
    case 'Semana':    start = startOfDay(new Date(now.getTime() - 7 * 86_400_000)); break;
    case 'Mês':       start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'Trimestre': start = new Date(now.getFullYear(), now.getMonth() - 3, 1); break;
    case 'Semestre':  start = new Date(now.getFullYear(), now.getMonth() - 6, 1); break;
    case 'Ano':       start = new Date(now.getFullYear(), 0, 1); break;
    case 'Personalizado':
      start = customRange.start ? startOfDay(new Date(customRange.start)) : new Date(0);
      break;
    case 'Total':
    default:
      start = new Date(0);
  }
  const end = period === 'Personalizado' && customRange.end
    ? endOfDay(new Date(customRange.end))
    : endOfDay(now);
  return { start, end };
}

function getPreviousRange({ start, end }) {
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { start: prevStart, end: prevEnd };
}

function inRange(dateStr, range) {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

// null = sem base de comparação real (exibe "—"), nunca um número inventado
function pctChange(curr, prev) {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

// ── Metric computation (dados reais de leads/clientes) ─────────────────────────

function computeMetrics({ leads, clientes, period, customRange }) {
  const range = getPeriodRange(period, customRange);
  const prevRange = getPreviousRange(range);

  const leadsInPeriod = leads.filter((l) => inRange(l.createdAt, range));
  const leadsInPrev   = leads.filter((l) => inRange(l.createdAt, prevRange));
  const leadsChange   = pctChange(leadsInPeriod.length, leadsInPrev.length);

  const convertidosPeriodo = leadsInPeriod.filter((l) => l.convertido).length;
  const conversaoPct = leadsInPeriod.length > 0
    ? Math.round((convertidosPeriodo / leadsInPeriod.length) * 1000) / 10
    : null;

  const leadsAbertos  = leads.filter((l) => l.col !== 'ganho' && !l.convertido);
  const pipelineValor = leadsAbertos.reduce((s, l) => s + (l.value || 0), 0);

  const clientesComValor = clientes.filter((c) => c.valorTotalGasto > 0);
  const ticketMedio = clientesComValor.length > 0
    ? clientesComValor.reduce((s, c) => s + c.valorTotalGasto, 0) / clientesComValor.length
    : null;

  const todosNps = clientes.flatMap((c) => c.npsHistorico ?? []);
  const npsMedio = todosNps.length > 0
    ? Math.round(todosNps.reduce((s, n) => s + n.nota, 0) / todosNps.length)
    : null;

  const todasTarefas = [
    ...leads.flatMap((l) => l.tarefas ?? []),
    ...clientes.flatMap((c) => c.tarefas ?? []),
  ];
  const tarefasConcluidas = todasTarefas.filter((t) => t.status === 'concluida').length;

  const hoje = new Date().toISOString().split('T')[0];
  const followupsPendentes = leads.filter((l) => !l.convertido && l.followUpDate && l.followUpDate <= hoje).length;

  return {
    metric_leads:       { value: String(leadsInPeriod.length), change: leadsChange },
    metric_conversao:   { value: conversaoPct != null ? `${conversaoPct.toLocaleString('pt-BR')}%` : null, change: null },
    metric_cac:         { value: null, change: null },
    metric_pipeline:    { value: fmtBRL(pipelineValor), change: null },
    metric_ticket:      { value: ticketMedio != null ? fmtBRL(Math.round(ticketMedio)) : null, change: null },
    metric_propostas:   { value: null, change: null },
    metric_fechamento:  { value: null, change: null },
    metric_clientes:    { value: String(clientes.length), change: null },
    metric_churn:       { value: null, change: null },
    metric_nps:         { value: npsMedio != null ? String(npsMedio) : null, change: null },
    metric_ltv:         { value: null, change: null },
    metric_tarefas:     { value: String(tarefasConcluidas), change: null },
    metric_followups:   { value: String(followupsPendentes), change: null },
    metric_alcance:     { value: null, change: null },
    metric_engajamento: { value: null, change: null },
    metric_posts:       { value: null, change: null },
  };
}

function buildLeadsPorMes(leads) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), leads: 0 });
  }
  leads.forEach((l) => {
    if (!l.createdAt) return;
    const d = new Date(l.createdAt);
    const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (bucket) bucket.leads += 1;
  });
  return months;
}

// ── CSS injection: animations + DnD placeholder grid fix ──────────────────────

function EditModeStyles({ draggingCols }) {
  return (
    <style>{`
      @keyframes badgePulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(240,168,50,0.5); }
        50%       { box-shadow: 0 0 0 6px rgba(240,168,50,0); }
      }
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(12px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
      }
      ${draggingCols != null ? `
        [data-rbd-placeholder-context-id] {
          grid-column: span ${draggingCols} !important;
          border-radius: 14px !important;
          background: rgba(91,110,245,0.06) !important;
          border: 2px dashed rgba(91,110,245,0.4) !important;
          opacity: 1 !important;
        }
      ` : ''}
    `}</style>
  );
}

// ── EditOverlay: wraps each widget in edit mode ───────────────────────────────

function EditOverlay({ children, onRemove, dragHandleProps }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      {...dragHandleProps}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        cursor: 'grab',
        borderRadius: 14,
        outline: `2px dashed rgba(91,110,245,${hovered ? 0.85 : 0.35})`,
        outlineOffset: 3,
        transition: 'outline-color 0.15s',
        userSelect: 'none',
      }}
    >
      {/* Widget content — interactions disabled while editing */}
      <div style={{ pointerEvents: 'none' }}>
        {children}
      </div>

      {/* Dimming overlay + grab hint */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: `rgba(14,15,18,${hovered ? 0.52 : 0.12})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
        pointerEvents: 'none',
      }}>
        {hovered && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '7px 13px',
            color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 500,
          }}>
            <GripVertical size={14} />
            Arrastar para mover
          </div>
        )}
      </div>

      {/* X remove button */}
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{
          position: 'absolute', top: 9, right: 9, zIndex: 20,
          width: 22, height: 22, borderRadius: 6,
          background: 'rgba(14,15,18,0.88)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--red)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(14,15,18,0.88)';
          e.currentTarget.style.color = 'var(--text3)';
        }}
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--bg3)', border: '1px solid var(--green)',
      borderRadius: 10, padding: '10px 20px',
      display: 'flex', alignItems: 'center', gap: 8,
      color: 'var(--green)', fontSize: 13, fontWeight: 500,
      zIndex: 500, boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
      animation: 'toastIn 0.2s ease',
      whiteSpace: 'nowrap',
    }}>
      <CheckCircle size={15} />
      {message}
    </div>
  );
}

// ── Recharts tooltip ──────────────────────────────────────────────────────────

function RTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent2)' }}>{payload[0].value} leads</p>
    </div>
  );
}

// ── MetricCard with HelpCircle ────────────────────────────────────────────────

function MetricCardDash({ metric, periodLabel, onAskAI, onSaibaMais, editMode }) {
  const [tip, setTip] = useState(false);
  const hasChange = metric.change != null;
  const positive = hasChange && metric.change >= 0;
  const Arrow = positive ? TrendingUp : TrendingDown;
  const changeColor = positive ? 'var(--green)' : 'var(--red)';

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 10, height: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{metric.label}</span>
        <div style={{ position: 'relative' }}>
          <button
            onMouseEnter={() => setTip(true)}
            onMouseLeave={() => setTip(false)}
            onClick={() => !editMode && onSaibaMais?.(metric)}
            style={{
              background: 'none', border: 'none',
              cursor: editMode ? 'default' : 'pointer',
              color: 'var(--text3)', padding: 2,
              display: 'flex', alignItems: 'center', borderRadius: 4,
            }}
          >
            <HelpCircle size={13} />
          </button>
          {tip && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)',
              background: 'var(--bg3)', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '10px 12px', width: 220,
              zIndex: 100, pointerEvents: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>
              <p style={{ fontSize: 12, color: 'var(--text)', marginBottom: 5, fontWeight: 500 }}>{metric.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.45, marginBottom: 6 }}>{metric.def}</p>
              <p style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.4 }}>
                <span style={{ color: 'var(--accent2)' }}>Fórmula: </span>{metric.formula}
              </p>
              {!editMode && (
                <p style={{ fontSize: 10, color: 'var(--accent2)', marginTop: 6 }}>Clique para saber mais →</p>
              )}
            </div>
          )}
        </div>
      </div>

      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 30,
        color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.02em',
      }}>
        {metric.value ?? '—'}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {hasChange ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Arrow size={13} style={{ color: changeColor }} />
            <span style={{ fontSize: 12, color: changeColor, fontWeight: 500 }}>{fmtChange(metric.change)}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>vs {periodLabel}</span>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>— sem dado do {periodLabel}</span>
        )}
        {!editMode && onAskAI && (
          <button
            onClick={onAskAI}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '3px 6px', borderRadius: 5, border: 'none',
              background: 'none', color: 'var(--text3)', cursor: 'pointer',
              fontSize: 11, fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent2)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}
          >
            <Sparkles size={11} /> IA
          </button>
        )}
      </div>
    </div>
  );
}

// ── TimeFilterBar ─────────────────────────────────────────────────────────────

function TimeFilterBar({ period, setPeriod, customRange, setCustomRange }) {
  const inputStyle = {
    padding: '4px 8px', borderRadius: 6, fontSize: 12,
    border: '1px solid var(--border)', background: 'var(--bg4)',
    color: 'var(--text)', fontFamily: 'var(--font-body)', colorScheme: 'dark',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
      {TIME_FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => setPeriod(f)}
          style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: period === f ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: period === f ? 'rgba(91,110,245,0.12)' : 'transparent',
            color: period === f ? 'var(--accent2)' : 'var(--text2)',
            fontFamily: 'var(--font-body)', fontWeight: period === f ? 500 : 400,
            transition: 'all 0.13s',
          }}
        >
          {f}
        </button>
      ))}
      {period === 'Personalizado' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
          <input type="date" value={customRange.start}
            onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))}
            style={inputStyle} />
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>até</span>
          <input type="date" value={customRange.end}
            onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
            style={inputStyle} />
        </div>
      )}
    </div>
  );
}

// ── MetricInfoModal ───────────────────────────────────────────────────────────

function MetricInfoModal({ metric, onClose }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const exampleText = metric.example ?? (metric.value != null
    ? `Valor atual: ${metric.value}${metric.change != null ? ` (${fmtChange(metric.change)} vs período anterior)` : ''}.`
    : 'Ainda não há dados suficientes para calcular este indicador.');

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 28, width: 420, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{metric.label}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Definição</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>{metric.def}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Fórmula de Cálculo</p>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
              <code style={{ fontSize: 12, color: 'var(--accent2)', fontFamily: 'monospace' }}>{metric.formula}</code>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Exemplo Prático</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>{exampleText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── WidgetLibraryModal ────────────────────────────────────────────────────────

const COL_LABEL = { 1: '¼', 2: '½', 3: '¾', 4: 'full' };

function WidgetLibraryModal({ layout, onAdd, onClose }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 28, width: 600, maxWidth: '92vw',
        maxHeight: '82vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Adicionar widget</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {LIBRARY_CATEGORIES.map((cat) => {
            const items = Object.entries(WIDGET_META)
              .filter(([, w]) => w.category === cat.id)
              .map(([id, w]) => ({ id, ...w }));
            if (!items.length) return null;
            return (
              <div key={cat.id} style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  {cat.label}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
                  {items.map((w) => {
                    const active = layout.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        onClick={() => !active && onAdd(w.id)}
                        disabled={active}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '10px 12px', borderRadius: 10, fontSize: 12,
                          border: `1px solid ${active ? 'var(--border)' : 'var(--border2)'}`,
                          background: active ? 'transparent' : 'var(--bg3)',
                          color: active ? 'var(--text3)' : 'var(--text2)',
                          cursor: active ? 'default' : 'pointer',
                          fontFamily: 'var(--font-body)',
                          opacity: active ? 0.5 : 1,
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ flex: 1 }}>{w.label}</div>
                        <span style={{
                          fontSize: 10, color: 'var(--text3)',
                          background: 'var(--bg4)', padding: '1px 5px', borderRadius: 4,
                          flexShrink: 0,
                        }}>
                          {COL_LABEL[w.cols] ?? w.cols}
                        </span>
                        {active && <Check size={11} style={{ color: 'var(--green)', flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Widget components ─────────────────────────────────────────────────────────

function AlertasWidget({ openAI, editMode }) {
  const { all } = useNotifications();
  const items = all.slice(0, 6);

  return (
    <Card
      title="Alertas e Follow-ups"
      onAskAI={!editMode && items.length > 0 ? () => openAI(`Alertas atuais: ${items.map((a) => `${a.title} — ${a.message}`).join('; ')}. O que priorizar?`) : undefined}
    >
      {items.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>
          Nenhum alerta no momento — tudo em dia.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((alerta) => {
            const cfg = ALERT_CONFIG[alerta.type] ?? ALERT_CONFIG.info;
            return (
              <div key={alerta.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}`,
              }}>
                <cfg.Icon size={14} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.45 }}>
                  <strong style={{ color: cfg.color }}>{alerta.title}:</strong> {alerta.message}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function AtividadesWidget({ editMode }) {
  const { leads, clientes, toggleTarefaLead, toggleTarefaCliente } = useCRM();
  const { user } = useAuth();
  const hoje = new Date().toISOString().split('T')[0];

  const tasks = [
    ...leads.filter((l) => l.responsavelId === user?.id)
      .flatMap((l) => (l.tarefas ?? []).map((t) => ({ ...t, _parentId: l.id, _parentType: 'lead', _parentLabel: l.company }))),
    ...clientes.filter((c) => c.responsavelId === user?.id)
      .flatMap((c) => (c.tarefas ?? []).map((t) => ({ ...t, _parentId: c.id, _parentType: 'cliente', _parentLabel: c.empresaNome }))),
  ]
    .filter((t) => t.status !== 'concluida' && (!t.prazo || t.prazo <= hoje))
    .sort((a, b) => (a.prazo || '9999-12-31').localeCompare(b.prazo || '9999-12-31'))
    .slice(0, 8);

  function handleToggle(task) {
    if (editMode) return;
    if (task._parentType === 'lead') toggleTarefaLead(task._parentId, task.id);
    else toggleTarefaCliente(task._parentId, task.id);
  }

  return (
    <Card title="Atividades do Dia">
      {tasks.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>
          Nenhuma tarefa pendente para hoje.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map((task) => {
            const overdue = task.prazo && task.prazo < hoje;
            return (
              <div
                key={`${task._parentType}-${task._parentId}-${task.id}`}
                onClick={() => handleToggle(task)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: editMode ? 'default' : 'pointer', userSelect: 'none' }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: '1.5px solid var(--border2)',
                }} />
                <span style={{ flex: 1, fontSize: 12, lineHeight: 1.3, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.titulo} <span style={{ color: 'var(--text3)' }}>· {task._parentLabel}</span>
                </span>
                <span style={{ fontSize: 11, color: overdue ? 'var(--red)' : 'var(--text3)', flexShrink: 0 }}>
                  {task.prazo ? task.prazo.split('-').reverse().join('/') : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function GraficoLeadsWidget({ editMode, theme, openAI, leads }) {
  const axisColor = theme === 'light' ? '#8b90a8' : '#5c6080';
  const gridColor = theme === 'light' ? '#e2e4ec' : '#2e3040';
  const data = buildLeadsPorMes(leads);
  const hasData = data.some((m) => m.leads > 0);

  return (
    <Card
      title="Leads por Mês"
      onAskAI={!editMode && hasData ? () => openAI(`Leads por mês: ${data.map((m) => `${m.mes} ${m.leads}`).join(', ')}. Tendência e como acelerar?`) : undefined}
    >
      {!hasData ? (
        <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '40px 0' }}>
          Nenhum lead cadastrado nos últimos 6 meses.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={168}>
          <BarChart data={data} barSize={22} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
            <ReTooltip content={<RTooltip />} cursor={{ fill: 'rgba(91,110,245,0.07)' }} />
            <Bar dataKey="leads" fill="#5b6ef5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function TopClientesWidget({ editMode, openAI, clientes }) {
  const top = [...clientes]
    .filter((c) => c.valorTotalGasto > 0)
    .sort((a, b) => b.valorTotalGasto - a.valorTotalGasto)
    .slice(0, 5);

  return (
    <Card
      title="Top Clientes por Valor"
      onAskAI={!editMode && top.length > 0 ? () => openAI(`Top clientes: ${top.map((c) => `${c.empresaNome} ${fmtBRL(c.valorTotalGasto)}`).join(', ')}. Como aumentar o valor desses clientes?`) : undefined}
    >
      {top.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>
          Nenhum cliente com valor registrado ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {top.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', width: 16, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.empresaNome}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {fmtBRL(c.valorTotalGasto)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PipelineMiniWidget({ editMode, openAI, leads, funis }) {
  const funil = funis[0];
  const cols = (funil?.etapas ?? []).filter((e) => e.id !== 'ganho');

  if (!funil || cols.length === 0) {
    return (
      <Card title="Pipeline Resumido">
        <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
          Nenhum funil configurado ainda.
        </p>
      </Card>
    );
  }

  const leadsByCol = cols.map((col) => ({
    ...col,
    leads: leads.filter((l) => l.funilId === funil.id && l.col === col.id && !l.convertido),
  }));
  const totalLeads = leadsByCol.reduce((s, c) => s + c.leads.length, 0);
  const totalValor = leadsByCol.reduce((s, c) => s + c.leads.reduce((s2, l) => s2 + (l.value || 0), 0), 0);

  return (
    <Card
      title="Pipeline Resumido"
      onAskAI={!editMode && totalLeads > 0 ? () => openAI(`${totalLeads} oportunidades no pipeline, ${fmtBRL(totalValor)}. O que priorizar?`) : undefined}
    >
      {totalLeads === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
          Nenhuma oportunidade em aberto no pipeline.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: 12 }}>
          {leadsByCol.map((col) => {
            const total = col.leads.reduce((s, l) => s + (l.value || 0), 0);
            return (
              <div key={col.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: col.cor, textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {col.nome}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 6px', borderRadius: 20, flexShrink: 0 }}>
                    {col.leads.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {col.leads.slice(0, 4).map((lead) => (
                    <div key={lead.id} style={{
                      background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderLeft: `3px solid ${col.cor}`,
                      borderRadius: 8, padding: '8px 10px',
                    }}>
                      <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, lineHeight: 1.3, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lead.company}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>{fmtBRL(lead.value)}</span>
                        <span style={{ fontSize: 10, color: lead.daysSinceContact > 7 ? 'var(--amber)' : 'var(--text3)' }}>{lead.daysSinceContact}d</span>
                      </div>
                    </div>
                  ))}
                  {col.leads.length > 4 && (
                    <p style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center' }}>+{col.leads.length - 4} mais</p>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, textAlign: 'right', fontWeight: 500 }}>
                  {fmtBRL(total)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function OKRsWidget() {
  const { empresaId } = useAuth();
  const [okrs, setOkrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('okrs').select('*').eq('empresa_id', empresaId).order('criado_em', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setOkrs((data ?? []).map((r) => ({ id: r.id, titulo: r.titulo, krs: r.krs ?? [] })));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  if (loading) return <Card title="OKRs em Andamento"><SkeletonLoader rows={2} /></Card>;

  if (okrs.length === 0) {
    return (
      <Card title="OKRs em Andamento">
        <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
          Nenhum OKR cadastrado ainda. Configure em Metas e Indicadores.
        </p>
      </Card>
    );
  }

  return (
    <Card title="OKRs em Andamento">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {okrs.map((okr) => (
          <div key={okr.id} style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 12, lineHeight: 1.4 }}>
              {okr.titulo}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {okr.krs.map((kr) => {
                const pct = krProgress(kr);
                const barColor = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--accent)';
                return (
                  <div key={kr.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text2)' }}>{kr.descricao}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: barColor }}>{pct}%</span>
                    </div>
                    <ProgressBar value={pct} color={barColor} height={4} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Widget renderer ───────────────────────────────────────────────────────────

function WidgetRenderer({ id, editMode, openAI, periodLabel, theme, onSaibaMais, metricsData, leads, clientes, funis }) {
  const meta = getWidgetMeta(id);

  if (isMetricWidget(meta)) {
    const computed = metricsData[id] ?? { value: null, change: null };
    const metric = { ...meta, ...computed };
    return (
      <MetricCardDash
        metric={metric}
        periodLabel={periodLabel}
        onAskAI={() => openAI(`Métrica ${meta.label}: ${computed.value ?? 'sem dado ainda'}${computed.change != null ? ` (${fmtChange(computed.change)} vs ${periodLabel})` : ''}. Como melhorar?`)}
        onSaibaMais={onSaibaMais}
        editMode={editMode}
      />
    );
  }

  switch (id) {
    case 'alertas':       return <AlertasWidget openAI={openAI} editMode={editMode} />;
    case 'atividades':    return <AtividadesWidget editMode={editMode} />;
    case 'grafico_leads': return <GraficoLeadsWidget openAI={openAI} editMode={editMode} theme={theme} leads={leads} />;
    case 'top_clientes':  return <TopClientesWidget openAI={openAI} editMode={editMode} clientes={clientes} />;
    case 'pipeline_mini': return <PipelineMiniWidget openAI={openAI} editMode={editMode} leads={leads} funis={funis} />;
    case 'okrs':          return <OKRsWidget />;
    default:
      return (
        <Card title={id}>
          <p style={{ color: 'var(--text3)', fontSize: 12 }}>Widget não encontrado.</p>
        </Card>
      );
  }
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { openAI } = useUI();
  const { theme }  = useTheme();
  const { leads, clientes, funis, loadingLeads, loadingClientes, loadingFunis } = useCRM();

  const [layout, setLayout] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dash_layout')) || DEFAULT_LAYOUT; }
    catch { return DEFAULT_LAYOUT; }
  });
  const [period, setPeriodRaw] = useState(() => localStorage.getItem('dash_period') || 'Mês');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const [editMode, setEditMode]       = useState(false);
  const [editLayout, setEditLayout]   = useState([]);
  const [draggingCols, setDraggingCols] = useState(null);

  const [showLibrary, setShowLibrary] = useState(false);
  const [helpMetric, setHelpMetric]   = useState(null);
  const [toast, setToast]             = useState(null);

  function setPeriod(p) {
    setPeriodRaw(p);
    localStorage.setItem('dash_period', p);
  }

  function enterEdit() {
    setEditLayout([...layout]);
    setEditMode(true);
  }

  function saveLayout() {
    setLayout(editLayout);
    localStorage.setItem('dash_layout', JSON.stringify(editLayout));
    setEditMode(false);
    setToast('Layout salvo com sucesso!');
  }

  function cancelEdit() {
    setEditMode(false);
    setEditLayout([]);
    setDraggingCols(null);
  }

  function onDragStart(start) {
    const meta = getWidgetMeta(start.draggableId);
    setDraggingCols(meta.cols);
  }

  function onDragEnd(result) {
    setDraggingCols(null);
    if (!result.destination) return;
    const items = [...editLayout];
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setEditLayout(items);
  }

  const periodLabel = PERIOD_VS[period] ?? 'período anterior';

  const metricsData = useMemo(
    () => computeMetrics({ leads, clientes, period, customRange }),
    [leads, clientes, period, customRange],
  );

  const btnBase = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, fontSize: 12,
    cursor: 'pointer', fontFamily: 'var(--font-body)',
  };

  if (loadingLeads || loadingClientes || loadingFunis) {
    return <SkeletonLoader rows={6} />;
  }

  const widgetProps = { openAI, periodLabel, theme, onSaibaMais: setHelpMetric, metricsData, leads, clientes, funis };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <EditModeStyles draggingCols={draggingCols} />

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <TimeFilterBar
          period={period} setPeriod={setPeriod}
          customRange={customRange} setCustomRange={setCustomRange}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Edit mode badge */}
          {editMode && (
            <span style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 11,
              background: 'rgba(240,168,50,0.12)', border: '1px solid rgba(240,168,50,0.4)',
              color: 'var(--amber)', fontWeight: 500,
              animation: 'badgePulse 2s ease-in-out infinite',
            }}>
              Modo de edição
            </span>
          )}

          {editMode ? (
            <>
              <button
                onClick={saveLayout}
                style={{ ...btnBase, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 500 }}
              >
                <Save size={14} /> Salvar
              </button>
              <button
                onClick={cancelEdit}
                style={{ ...btnBase, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)' }}
              >
                <X size={14} /> Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={enterEdit}
              style={{ ...btnBase, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)' }}
            >
              <Settings2 size={14} /> Personalizar
            </button>
          )}
        </div>
      </div>

      {/* ── Widget grid ───────────────────────────────────────────────────── */}
      {editMode ? (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <Droppable
            droppableId="dash-grid"
            renderClone={(provided, _snap, rubric) => {
              const meta = getWidgetMeta(rubric.draggableId);
              return (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', borderRadius: 10,
                    background: 'var(--bg2)',
                    border: '2px dashed var(--accent)',
                    boxShadow: '0 10px 36px rgba(0,0,0,0.55)',
                    width: 240, cursor: 'grabbing',
                    ...provided.draggableProps.style,
                  }}
                >
                  <GripVertical size={14} style={{ color: 'var(--accent2)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{meta.label}</span>
                </div>
              );
            }}
          >
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
              >
                {editLayout.map((id, index) => {
                  const meta = getWidgetMeta(id);
                  return (
                    <Draggable key={id} draggableId={id} index={index}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          style={{
                            gridColumn: `span ${meta.cols}`,
                            visibility: snap.isDragging ? 'hidden' : 'visible',
                            ...prov.draggableProps.style,
                          }}
                        >
                          <EditOverlay
                            onRemove={() => setEditLayout((prev) => prev.filter((w) => w !== id))}
                            dragHandleProps={prov.dragHandleProps}
                          >
                            <WidgetRenderer id={id} editMode={true} {...widgetProps} />
                          </EditOverlay>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {layout.map((id) => {
            const meta = getWidgetMeta(id);
            return (
              <div key={id} style={{ gridColumn: `span ${meta.cols}` }}>
                <WidgetRenderer id={id} editMode={false} {...widgetProps} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── FAB: add widget (fixed, only in edit mode) ───────────────────── */}
      {editMode && (
        <button
          onClick={() => setShowLibrary(true)}
          title="Adicionar widget"
          style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 200,
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--accent)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(91,110,245,0.5)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 6px 28px rgba(91,110,245,0.65)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(91,110,245,0.5)';
          }}
        >
          <Plus size={22} color="#fff" />
        </button>
      )}

      {/* ── Modals + Toast ────────────────────────────────────────────────── */}
      {helpMetric && (
        <MetricInfoModal metric={helpMetric} onClose={() => setHelpMetric(null)} />
      )}
      {showLibrary && (
        <WidgetLibraryModal
          layout={editMode ? editLayout : layout}
          onAdd={(id) => { setEditLayout((prev) => [...prev, id]); setShowLibrary(false); }}
          onClose={() => setShowLibrary(false)}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
