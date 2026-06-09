import { useState, useEffect } from 'react';
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
import Card from '../components/UI/Card.jsx';
import ProgressBar from '../components/UI/ProgressBar.jsx';
import {
  pipelineCols, pipelineCards, atividadesHoje,
  leadsHistorico, alertasDash,
  allWidgets, topClientes, okrsData,
} from '../data/dashboard.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const TIME_FILTERS = ['Hoje', 'Semana', 'Mês', 'Trimestre', 'Semestre', 'Ano', 'Total', 'Personalizado'];

const DEFAULT_LAYOUT = [
  'metric_leads', 'metric_conversao', 'metric_cac', 'metric_pipeline',
  'alertas', 'atividades',
  'grafico_leads', 'top_clientes',
];

const ALERT_CONFIG = {
  warning: { Icon: AlertCircle, color: 'var(--amber)',   bg: 'rgba(240,168,50,0.08)',  border: 'rgba(240,168,50,0.2)'  },
  success: { Icon: CheckCircle, color: 'var(--green)',   bg: 'rgba(45,212,160,0.08)',  border: 'rgba(45,212,160,0.2)'  },
  accent:  { Icon: Calendar,    color: 'var(--accent2)', bg: 'rgba(91,110,245,0.06)',  border: 'rgba(91,110,245,0.2)'  },
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (n) => `R$ ${Number(n).toLocaleString('pt-BR')}`;

function getWidgetMeta(id) {
  return allWidgets.find((w) => w.id === id) ?? { id, label: id, cols: 2, category: 'widgets' };
}

function isMetricWidget(meta) {
  return meta.category !== 'widgets';
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
  const Arrow = metric.positive ? TrendingUp : TrendingDown;
  const changeColor = metric.positive ? 'var(--green)' : 'var(--red)';

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
        {metric.value}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Arrow size={13} style={{ color: changeColor }} />
          <span style={{ fontSize: 12, color: changeColor, fontWeight: 500 }}>{metric.change}</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>vs {periodLabel}</span>
        </div>
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
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>
              {metric.example ?? `Valor atual: ${metric.value} (${metric.change} vs período anterior).`}
            </p>
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
            const items = allWidgets.filter((w) => w.category === cat.id);
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
  return (
    <Card
      title="Alertas e Follow-ups"
      onAskAI={!editMode ? () => openAI('Alertas: follow-up vencido Tech Solutions (7 dias), conversão acima da meta, reunião amanhã. O que priorizar?') : undefined}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alertasDash.map((alerta) => {
          const { Icon, color, bg, border } = ALERT_CONFIG[alerta.type];
          return (
            <div key={alerta.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 8, background: bg, border: `1px solid ${border}`,
            }}>
              <Icon size={14} style={{ color, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.45 }}>{alerta.msg}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AtividadesWidget({ tasks, setTasks, editMode }) {
  return (
    <Card title="Atividades do Dia">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => !editMode && setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, done: !t.done } : t))}
            style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: editMode ? 'default' : 'pointer', userSelect: 'none' }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: task.done ? 'none' : '1.5px solid var(--border2)',
              background: task.done ? 'var(--green)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}>
              {task.done && <Check size={10} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{
              flex: 1, fontSize: 12, lineHeight: 1.3,
              color: task.done ? 'var(--text3)' : 'var(--text2)',
              textDecoration: task.done ? 'line-through' : 'none',
            }}>
              {task.text}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{task.time}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function GraficoLeadsWidget({ openAI, editMode, theme }) {
  const axisColor = theme === 'light' ? '#8b90a8' : '#5c6080';
  const gridColor = theme === 'light' ? '#e2e4ec' : '#2e3040';
  return (
    <Card
      title="Leads por Canal"
      onAskAI={!editMode ? () => openAI('Leads: Jan 28, Fev 35, Mar 31, Abr 42, Mai 38, Jun 47. Tendência e como acelerar?') : undefined}
    >
      <ResponsiveContainer width="100%" height={168}>
        <BarChart data={leadsHistorico} barSize={22} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={32} />
          <ReTooltip content={<RTooltip />} cursor={{ fill: 'rgba(91,110,245,0.07)' }} />
          <Bar dataKey="leads" fill="#5b6ef5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function TopClientesWidget({ openAI, editMode }) {
  return (
    <Card
      title="Top Clientes por Valor"
      onAskAI={!editMode ? () => openAI('Top clientes: Alpha R$85k, Omega R$72k, DataPrime R$55k. Como aumentar LTV?') : undefined}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {topClientes.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', width: 16, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
            <span style={{
              fontSize: 10, color: c.prioridade === 'A' ? 'var(--accent2)' : 'var(--text3)',
              padding: '2px 6px', borderRadius: 4, flexShrink: 0, fontWeight: 500,
              background: c.prioridade === 'A' ? 'rgba(91,110,245,0.1)' : 'var(--bg4)',
            }}>
              {c.prioridade}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{c.nome}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              {fmtBRL(c.valor)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PipelineMiniWidget({ openAI, editMode }) {
  return (
    <Card
      title="Pipeline Resumido"
      onAskAI={!editMode ? () => openAI('9 oportunidades no pipeline, R$84.500. O que priorizar?') : undefined}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {pipelineCols.map((col) => {
          const cards = pipelineCards.filter((c) => c.col === col.id);
          const total = cards.reduce((s, c) => s + c.value, 0);
          return (
            <div key={col.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: `var(${col.colorVar})`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {col.label}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 6px', borderRadius: 20 }}>
                  {cards.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cards.map((card) => (
                  <div key={card.id} style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderLeft: `3px solid var(${col.colorVar})`,
                    borderRadius: 8, padding: '8px 10px',
                  }}>
                    <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, lineHeight: 1.3, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card.name}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>{fmtBRL(card.value)}</span>
                      <span style={{ fontSize: 10, color: card.days > 7 ? 'var(--amber)' : 'var(--text3)' }}>{card.days}d</span>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, textAlign: 'right', fontWeight: 500 }}>
                {fmtBRL(total)}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function OKRsWidget() {
  return (
    <Card title="OKRs em Andamento">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {okrsData.map((okr) => (
          <div key={okr.id} style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 12, lineHeight: 1.4 }}>
              {okr.objetivo}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {okr.krs.map((kr) => {
                const pct = Math.min(100, Math.round((kr.atual / kr.meta) * 100));
                const barColor = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--accent)';
                return (
                  <div key={kr.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text2)' }}>{kr.desc}</span>
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

function WidgetRenderer({ id, editMode, openAI, tasks, setTasks, periodLabel, theme, onSaibaMais }) {
  const meta = getWidgetMeta(id);

  if (isMetricWidget(meta)) {
    return (
      <MetricCardDash
        metric={meta}
        periodLabel={periodLabel}
        onAskAI={() => openAI(`Métrica ${meta.label}: ${meta.value} (${meta.change} vs ${periodLabel}). Como melhorar?`)}
        onSaibaMais={onSaibaMais}
        editMode={editMode}
      />
    );
  }

  const props = { openAI, editMode, tasks, setTasks, theme };
  switch (id) {
    case 'alertas':       return <AlertasWidget {...props} />;
    case 'atividades':    return <AtividadesWidget {...props} />;
    case 'grafico_leads': return <GraficoLeadsWidget {...props} />;
    case 'top_clientes':  return <TopClientesWidget {...props} />;
    case 'pipeline_mini': return <PipelineMiniWidget {...props} />;
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
  const [tasks, setTasks]             = useState(atividadesHoje);

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

  const periodLabel  = PERIOD_VS[period] ?? 'período anterior';

  const btnBase = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, fontSize: 12,
    cursor: 'pointer', fontFamily: 'var(--font-body)',
  };

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
                            <WidgetRenderer
                              id={id} editMode={true}
                              openAI={openAI} tasks={tasks} setTasks={setTasks}
                              periodLabel={periodLabel} theme={theme}
                              onSaibaMais={setHelpMetric}
                            />
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
                <WidgetRenderer
                  id={id} editMode={false}
                  openAI={openAI} tasks={tasks} setTasks={setTasks}
                  periodLabel={periodLabel} theme={theme}
                  onSaibaMais={setHelpMetric}
                />
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
