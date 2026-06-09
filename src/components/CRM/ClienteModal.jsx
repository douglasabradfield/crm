import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  X, Bot, Send, Pencil, Check, Plus, Phone, Mail,
  Building2, Tag, Clock, Calendar, DollarSign,
  MessageSquare, ShoppingBag, FileText, AlertCircle,
  User, Hash, Star, Bell,
} from 'lucide-react';
import { useAI }          from '../../hooks/useAI.js';
import { useCRM }         from '../../store/crm.js';
import PermissionGate     from '../Auth/PermissionGate.jsx';

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const fmtBRL   = (n) => `R$ ${Number(n).toLocaleString('pt-BR')}`;
const fmtDate  = (d) => d ? d.split('-').reverse().join('/') : '—';

const STATUS_CFG = {
  ativo:       { label: 'Ativo',       bg: 'rgba(45,212,160,0.15)',  color: 'var(--green)' },
  inativo:     { label: 'Inativo',     bg: 'rgba(240,168,50,0.15)',  color: 'var(--amber)' },
  'ex-cliente':{ label: 'Ex-cliente',  bg: 'rgba(240,92,92,0.15)',   color: 'var(--red)'   },
};

const PRIORIDADE_CFG = {
  A: { bg: 'rgba(91,110,245,0.15)',  color: 'var(--accent2)' },
  B: { bg: 'rgba(56,201,224,0.15)',  color: 'var(--teal)'    },
  C: { bg: 'rgba(148,152,176,0.12)', color: 'var(--text3)'   },
};

const TIPO_CFG = {
  contato:   { Icon: Phone,         color: '--accent2', label: 'Contato'   },
  pedido:    { Icon: ShoppingBag,   color: '--green',   label: 'Pedido'    },
  ticket:    { Icon: AlertCircle,   color: '--amber',   label: 'Suporte'   },
  anotacao:  { Icon: FileText,      color: '--text2',   label: 'Anotação'  },
};

const PEDIDO_STATUS_CFG = {
  pago:      { label: 'Pago',      bg: 'rgba(45,212,160,0.15)',  color: 'var(--green)' },
  pendente:  { label: 'Pendente',  bg: 'rgba(240,168,50,0.15)',  color: 'var(--amber)' },
  cancelado: { label: 'Cancelado', bg: 'rgba(240,92,92,0.15)',   color: 'var(--red)'   },
};

const AI_CHIPS = [
  'Resumir histórico deste cliente',
  'Sugerir próxima oferta',
  'Criar mensagem de reativação',
  'Analisar risco de churn',
];

/* ─── Input style ────────────────────────────────────────────────────────────── */
const inputStyle = {
  width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 12,
  fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
};

/* ─── Visão Geral tab ────────────────────────────────────────────────────────── */
function VisaoGeralTab({ cliente, editando, form, set }) {
  const fields = [
    { label: 'CNPJ',        key: 'cnpj',        type: 'text',   icon: Hash        },
    { label: 'Contato',     key: 'contato',     type: 'text',   icon: User        },
    { label: 'E-mail',      key: 'email',       type: 'email',  icon: Mail        },
    { label: 'Telefone',    key: 'telefone',    type: 'tel',    icon: Phone       },
    { label: 'Segmento',    key: 'segmento',    type: 'text',   icon: Building2   },
    { label: 'Porte',       key: 'porte',       type: 'text',   icon: Building2   },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status + Prioridade + Origem */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {editando ? (
          <>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}
              style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={form.prioridade} onChange={(e) => set('prioridade', e.target.value)}
              style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
              {['A','B','C'].map((p) => <option key={p} value={p}>Prioridade {p}</option>)}
            </select>
          </>
        ) : (
          <>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, ...STATUS_CFG[cliente.status] }}>{STATUS_CFG[cliente.status]?.label}</span>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, ...PRIORIDADE_CFG[cliente.prioridade] }}>Prioridade {cliente.prioridade}</span>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, background: 'var(--bg4)', color: 'var(--text3)' }}>
              {cliente.origem === 'convertido_do_pipeline' ? 'Convertido do pipeline' : 'Cadastro manual'}
            </span>
          </>
        )}
      </div>

      {/* Fields grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {fields.map(({ label, key, type, icon: Icon }) => (
          <div key={key}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon size={10} />{label}
            </div>
            {editando ? (
              <input type={type} value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
              />
            ) : (
              <div style={{ fontSize: 13, color: form[key] ? 'var(--text)' : 'var(--text3)', lineHeight: 1.4 }}>
                {key === 'email'    ? <a href={`mailto:${form[key]}`} style={{ color: 'var(--accent2)', textDecoration: 'none' }}>{form[key] || '—'}</a>
               : key === 'telefone' ? <a href={`tel:${form[key]}`}   style={{ color: 'var(--accent2)', textDecoration: 'none' }}>{form[key] || '—'}</a>
               : form[key] || '—'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tags */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={10} />Tags</div>
        {editando ? (
          <input value={(form.tags ?? []).join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
            placeholder="SaaS, B2B, Recorrente"
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
          />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {(cliente.tags ?? []).length > 0
              ? cliente.tags.map((t) => <span key={t} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)' }}>{t}</span>)
              : <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span>
            }
          </div>
        )}
      </div>

      {/* Datas de contato */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Último contato',  key: 'ultimoContato',  icon: Clock    },
          { label: 'Próximo contato', key: 'proximoContato', icon: Calendar },
        ].map(({ label, key, icon: Icon }) => (
          <div key={key}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Icon size={10} />{label}</div>
            {editando ? (
              <input type="date" value={form[key] ?? ''} onChange={(e) => set(key, e.target.value || null)}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
              />
            ) : (
              <div style={{ fontSize: 13, color: form[key] ? 'var(--text)' : 'var(--text3)' }}>{fmtDate(form[key])}</div>
            )}
          </div>
        ))}
      </div>

      {/* Valor total */}
      <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <DollarSign size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Valor total gasto</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--green)', fontFamily: 'var(--font-display)' }}>{fmtBRL(cliente.valorTotalGasto)}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Pedidos tab ────────────────────────────────────────────────────────────── */
function PedidosTab({ cliente, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [novoPedido, setNovoPedido] = useState({ descricao: '', valor: '', status: 'pendente', formaPagamento: '', recorrente: false });

  const totalPago      = cliente.pedidos.filter((p) => p.status === 'pago').reduce((s, p) => s + p.valor, 0);
  const totalPendente  = cliente.pedidos.filter((p) => p.status === 'pendente').reduce((s, p) => s + p.valor, 0);
  const totalCancelado = cliente.pedidos.filter((p) => p.status === 'cancelado').reduce((s, p) => s + p.valor, 0);

  function salvarPedido() {
    if (!novoPedido.descricao.trim() || !novoPedido.valor) return;
    const pedido = {
      id:             `pd${Date.now()}`,
      data:           new Date().toISOString().split('T')[0],
      descricao:      novoPedido.descricao,
      valor:          parseFloat(novoPedido.valor) || 0,
      status:         novoPedido.status,
      formaPagamento: novoPedido.formaPagamento,
      recorrente:     novoPedido.recorrente,
    };
    const updatedPedidos  = [...cliente.pedidos, pedido];
    const valorTotalGasto = updatedPedidos.filter((p) => p.status === 'pago').reduce((s, p) => s + p.valor, 0);
    const novaEntrada     = { id: `h${Date.now()}`, data: pedido.data, tipo: 'pedido', descricao: `Novo pedido: ${pedido.descricao} — ${fmtBRL(pedido.valor)}`, usuario: 'Sistema' };
    onUpdate({ ...cliente, pedidos: updatedPedidos, valorTotalGasto, historico: [...cliente.historico, novaEntrada] });
    setNovoPedido({ descricao: '', valor: '', status: 'pendente', formaPagamento: '', recorrente: false });
    setShowForm(false);
  }

  return (
    <div>
      {/* Table */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px 90px 80px 60px', gap: 8, padding: '6px 8px', fontSize: 10, color: 'var(--text3)', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
          <span>Data</span><span>Descrição</span><span>Valor</span><span>Status</span><span>Pagamento</span><span>Recor.</span>
        </div>
        {cliente.pedidos.length === 0 && (
          <div style={{ padding: '20px 8px', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>Nenhum pedido cadastrado</div>
        )}
        {cliente.pedidos.map((p) => {
          const st = PEDIDO_STATUS_CFG[p.status];
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px 90px 80px 60px', gap: 8, padding: '9px 8px', borderRadius: 8, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(p.data)}</span>
              <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.3 }}>{p.descricao}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{fmtBRL(p.valor)}</span>
              <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, background: st.bg, color: st.color, width: 'fit-content' }}>{st.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{p.formaPagamento || '—'}</span>
              <span style={{ fontSize: 10, color: p.recorrente ? 'var(--accent2)' : 'var(--text3)' }}>{p.recorrente ? '✓ Sim' : 'Não'}</span>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Total pago',      value: totalPago,      color: '--green' },
          { label: 'A receber',       value: totalPendente,  color: '--amber' },
          { label: 'Cancelado',       value: totalCancelado, color: '--red'   },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: `var(${color})`, fontFamily: 'var(--font-display)' }}>{fmtBRL(value)}</div>
          </div>
        ))}
      </div>

      {/* Add pedido */}
      <PermissionGate module="crm" action="edit">
        {showForm ? (
          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Descrição *</label>
                <input value={novoPedido.descricao} onChange={(e) => setNovoPedido((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Ex: Plano Anual 2026" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Valor (R$) *</label>
                <input type="number" value={novoPedido.valor} onChange={(e) => setNovoPedido((p) => ({ ...p, valor: e.target.value }))}
                  placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Status</label>
                <select value={novoPedido.status} onChange={(e) => setNovoPedido((p) => ({ ...p, status: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Forma de pagamento</label>
                <input value={novoPedido.formaPagamento} onChange={(e) => setNovoPedido((p) => ({ ...p, formaPagamento: e.target.value }))}
                  placeholder="PIX, Boleto, Cartão…" style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="recorrente" checked={novoPedido.recorrente} onChange={(e) => setNovoPedido((p) => ({ ...p, recorrente: e.target.checked }))} />
                <label htmlFor="recorrente" style={{ fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>Cobrança recorrente</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={salvarPedido}
                style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Salvar pedido
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%', justifyContent: 'center' }}>
            <Plus size={13} /> Novo pedido
          </button>
        )}
      </PermissionGate>
    </div>
  );
}

/* ─── Tarefas tab ────────────────────────────────────────────────────────────── */
const PRIO_CFG2 = {
  Alta:  { bg: 'rgba(240,92,92,0.12)',  color: 'var(--red)'   },
  Média: { bg: 'rgba(240,168,50,0.12)', color: 'var(--amber)' },
  Baixa: { bg: 'rgba(45,212,160,0.12)', color: 'var(--green)' },
};
const RESPONSAVEIS = ['Admin', 'João Vendedor', 'Maria Gerente'];
const todayStr = () => new Date().toISOString().split('T')[0];
const isOverdue = (prazo) => prazo && prazo < todayStr();

function TarefasClienteTab({ cliente, onUpdate }) {
  const { addTarefaCliente, toggleTarefaCliente } = useCRM();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: '', responsavel: 'Admin', prazo: '', prioridade: 'Média' });

  function salvar() {
    if (!form.titulo.trim()) return;
    addTarefaCliente(cliente.id, { ...form, status: 'pendente', automatica: false });
    setForm({ titulo: '', responsavel: 'Admin', prazo: '', prioridade: 'Média' });
    setShowForm(false);
  }

  const tarefas = cliente.tarefas ?? [];

  return (
    <div>
      {tarefas.length === 0 && !showForm && (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Nenhuma tarefa vinculada</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {tarefas.map((t) => {
          const vencida   = t.status === 'pendente' && isOverdue(t.prazo);
          const concluida = t.status === 'concluida';
          const prio      = PRIO_CFG2[t.prioridade] ?? PRIO_CFG2.Média;
          return (
            <div key={t.id}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: vencida ? 'rgba(240,92,92,0.06)' : 'var(--bg3)', border: `1px solid ${vencida ? 'rgba(240,92,92,0.25)' : 'var(--border)'}` }}>
              <button onClick={() => toggleTarefaCliente(cliente.id, t.id)}
                style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${concluida ? 'var(--green)' : 'var(--border2)'}`, background: concluida ? 'var(--green)' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {concluida && <Check size={10} style={{ color: '#fff' }} />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: concluida ? 'var(--text3)' : vencida ? 'var(--red)' : 'var(--text)', textDecoration: concluida ? 'line-through' : 'none' }}>
                    {t.titulo}
                  </span>
                  {t.automatica && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: 'rgba(91,110,245,0.15)', color: 'var(--accent2)', border: '1px solid rgba(91,110,245,0.25)' }}>auto</span>}
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: prio.bg, color: prio.color }}>{t.prioridade}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><User size={9} />{t.responsavel}</span>
                  {t.prazo && <span style={{ fontSize: 10, color: vencida ? 'var(--red)' : 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} />{fmtDate(t.prazo)}{vencida ? ' · vencida' : ''}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PermissionGate module="crm" action="edit">
        {showForm ? (
          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Título *</label>
                <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Descreva a tarefa..." style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Responsável</label>
                <select value={form.responsavel} onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  {RESPONSAVEIS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Prazo</label>
                <input type="date" value={form.prazo} onChange={(e) => setForm((p) => ({ ...p, prazo: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Prioridade</label>
                <select value={form.prioridade} onChange={(e) => setForm((p) => ({ ...p, prioridade: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option>Alta</option><option>Média</option><option>Baixa</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={salvar}
                style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Criar tarefa
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%', justifyContent: 'center' }}>
            <Plus size={13} /> Nova tarefa
          </button>
        )}
      </PermissionGate>
    </div>
  );
}

/* ─── NPS tab ────────────────────────────────────────────────────────────────── */
function NPSTab({ cliente }) {
  const { addNPS, updateCliente } = useCRM();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ pontuacao: 8, comentario: '' });
  const [lembrete, setLembrete] = useState(cliente.npsLembreteDias ?? 90);

  const historico = cliente.npsHistorico ?? [];
  const lastNPS   = historico.length > 0 ? historico[historico.length - 1] : null;
  const daysSinceNPS = lastNPS
    ? Math.floor((Date.now() - new Date(lastNPS.data).getTime()) / 86400000)
    : null;
  const npsOverdue = daysSinceNPS !== null && daysSinceNPS >= lembrete;

  const npsColor = (n) => n >= 9 ? 'var(--green)' : n >= 7 ? 'var(--amber)' : 'var(--red)';
  const npsLabel = (n) => n >= 9 ? 'Promotor' : n >= 7 ? 'Neutro' : 'Detrator';

  function salvarNPS() {
    if (!form.pontuacao) return;
    addNPS(cliente.id, { ...form, data: new Date().toISOString().split('T')[0] });
    setForm({ pontuacao: 8, comentario: '' });
    setShowForm(false);
  }

  function salvarLembrete() {
    updateCliente({ ...cliente, npsLembreteDias: lembrete });
  }

  const chartData = historico.map((n) => ({ data: fmtDate(n.data), nps: n.pontuacao }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Overdue alert */}
      {npsOverdue && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(240,168,50,0.08)', border: '1px solid rgba(240,168,50,0.25)' }}>
          <Bell size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'var(--amber)', lineHeight: 1.4 }}>
            NPS não registrado há {daysSinceNPS} dias — meta: a cada {lembrete} dias
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 && (
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, fontWeight: 500 }}>Evolução do NPS</div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis dataKey="data" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: 'var(--text2)' }}
                itemStyle={{ color: 'var(--green)' }}
              />
              <Line type="monotone" dataKey="nps" stroke="var(--green)" strokeWidth={2} dot={{ fill: 'var(--green)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History table */}
      {historico.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8, fontWeight: 500 }}>Histórico</div>
          {[...historico].reverse().map((n) => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb, ${npsColor(n.pontuacao)} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: npsColor(n.pontuacao), fontFamily: 'var(--font-display)' }}>{n.pontuacao}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 1 }}>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: `color-mix(in srgb, ${npsColor(n.pontuacao)} 12%, transparent)`, color: npsColor(n.pontuacao) }}>{npsLabel(n.pontuacao)}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{fmtDate(n.data)}</span>
                </div>
                {n.comentario && <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0, lineHeight: 1.4 }}>{n.comentario}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {historico.length === 0 && !showForm && (
        <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Nenhum NPS registrado ainda</div>
      )}

      {/* Register form */}
      <PermissionGate module="crm" action="edit">
        {showForm ? (
          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Pontuação (0-10)</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {[...Array(11)].map((_, n) => (
                  <button key={n} onClick={() => setForm((p) => ({ ...p, pontuacao: n }))}
                    style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${form.pontuacao === n ? npsColor(n) : 'var(--border)'}`, background: form.pontuacao === n ? `color-mix(in srgb, ${npsColor(n)} 15%, transparent)` : 'var(--bg4)', color: form.pontuacao === n ? npsColor(n) : 'var(--text3)', fontSize: 12, fontWeight: form.pontuacao === n ? 700 : 400, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Comentário</label>
              <textarea value={form.comentario} onChange={(e) => setForm((p) => ({ ...p, comentario: e.target.value }))}
                rows={2} placeholder="Feedback do cliente..."
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={salvarNPS}
                style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Registrar NPS
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%', justifyContent: 'center' }}>
            <Star size={13} /> Registrar NPS
          </button>
        )}
      </PermissionGate>

      {/* Lembrete config */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Bell size={12} style={{ color: 'var(--text3)', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Lembrar a cada</span>
        <input type="number" value={lembrete} min={7} max={365}
          onChange={(e) => setLembrete(parseInt(e.target.value, 10) || 90)}
          style={{ ...inputStyle, width: 64, padding: '4px 8px', textAlign: 'center' }}
        />
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>dias</span>
        <button onClick={salvarLembrete}
          style={{ padding: '4px 10px', borderRadius: 7, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          Salvar
        </button>
      </div>
    </div>
  );
}

/* ─── Histórico tab ──────────────────────────────────────────────────────────── */
function HistoricoTab({ cliente, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [anotacao, setAnotacao] = useState('');
  const { user } = { user: { name: 'Usuário' } }; // simplified

  function salvarAnotacao() {
    if (!anotacao.trim()) return;
    const entrada = { id: `h${Date.now()}`, data: new Date().toISOString().split('T')[0], tipo: 'anotacao', descricao: anotacao, usuario: 'Você' };
    onUpdate({ ...cliente, historico: [...cliente.historico, entrada], ultimoContato: entrada.data });
    setAnotacao('');
    setShowForm(false);
  }

  const sorted = [...cliente.historico].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div>
      {sorted.map((entry, i) => {
        const cfg = TIPO_CFG[entry.tipo] ?? TIPO_CFG.anotacao;
        return (
          <div key={entry.id} style={{ display: 'flex', gap: 12, marginBottom: i < sorted.length - 1 ? 4 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `color-mix(in srgb, var(${cfg.color}) 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid color-mix(in srgb, var(${cfg.color}) 30%, transparent)` }}>
                <cfg.Icon size={12} style={{ color: `var(${cfg.color})` }} />
              </div>
              {i < sorted.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 16, margin: '3px 0' }} />}
            </div>
            <div style={{ paddingBottom: i < sorted.length - 1 ? 12 : 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: `color-mix(in srgb, var(${cfg.color}) 12%, transparent)`, color: `var(${cfg.color})` }}>{cfg.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{fmtDate(entry.data)}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>· {entry.usuario}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>{entry.descricao}</p>
            </div>
          </div>
        );
      })}

      {/* Add annotation */}
      <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {showForm ? (
          <div>
            <textarea value={anotacao} onChange={(e) => setAnotacao(e.target.value)}
              placeholder="Escreva sua anotação..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={salvarAnotacao}
                style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Salvar anotação
              </button>
              <button onClick={() => { setShowForm(false); setAnotacao(''); }}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%', justifyContent: 'center' }}>
            <Plus size={13} /> Adicionar anotação
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Inline AI Panel ────────────────────────────────────────────────────────── */
function InlineAI({ cliente }) {
  const { send, loading, error } = useAI();
  const [messages, setMessages]  = useState([]);
  const [input, setInput]        = useState('');
  const endRef = useRef(null);

  const aiContext =
    `Cliente: ${cliente.empresaNome}. Status: ${cliente.status}. Prioridade: ${cliente.prioridade}. ` +
    `Segmento: ${cliente.segmento}. Valor total gasto: ${fmtBRL(cliente.valorTotalGasto)}. ` +
    `Último contato: ${fmtDate(cliente.ultimoContato)}. ` +
    `Pedidos: ${cliente.pedidos.length} (${cliente.pedidos.filter((p) => p.status === 'pago').length} pagos, ` +
    `${cliente.pedidos.filter((p) => p.status === 'pendente').length} pendentes). ` +
    `Tags: ${(cliente.tags ?? []).join(', ')}.`;

  async function handleSend(msg) {
    const text = (msg ?? input).trim();
    if (!text) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    const reply = await send(text, aiContext, [...messages, userMsg]);
    if (reply) setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div style={{ flex: 7, display: 'flex', flexDirection: 'column', minWidth: 0, borderLeft: '1px solid var(--border)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Bot size={14} style={{ color: 'var(--accent2)' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Assistente IA</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(45,212,160,0.12)', color: 'var(--green)' }}>contexto carregado</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ padding: 12, background: 'var(--bg3)', borderRadius: 10, fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, border: '1px solid var(--border)' }}>
            Posso analisar este cliente, sugerir ofertas, criar mensagens ou avaliar risco de churn.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '88%', padding: '8px 12px', borderRadius: 10, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              background: m.role === 'user' ? 'var(--accent)' : 'var(--bg2)',
              color:      m.role === 'user' ? '#fff'          : 'var(--text2)',
              border:     m.role === 'user' ? 'none'          : '1px solid var(--border)',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 10, width: 'fit-content', border: '1px solid var(--border)' }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <span key={i} className="bounce-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text3)', display: 'block', animationDelay: `${d}s` }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length === 0 && (
        <div style={{ padding: '0 14px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {AI_CHIPS.map((chip) => (
            <button key={chip} onClick={() => handleSend(chip)}
              style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' }}>
              {chip}
            </button>
          ))}
        </div>
      )}

      {error && <div style={{ padding: '4px 14px', fontSize: 11, color: 'var(--red)' }}>{error}</div>}

      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Pergunte sobre este cliente..."
          style={{ flex: 1, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}
        />
        <button onClick={() => handleSend()} disabled={!input.trim() || loading}
          style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!input.trim() || loading) ? 0.5 : 1, flexShrink: 0 }}>
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────────── */
export default function ClienteModal({ cliente: initialCliente, onClose }) {
  const { updateCliente } = useCRM();
  const [cliente,   setCliente]   = useState(initialCliente);
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [editando,  setEditando]  = useState(false);
  const [form,      setForm]      = useState({ ...initialCliente });

  function set(key, val) { setForm((p) => ({ ...p, [key]: val })); }

  function salvarEdicao() {
    const updated = { ...form };
    setCliente(updated);
    updateCliente(updated);
    setEditando(false);
  }

  function handleUpdate(updated) {
    setCliente(updated);
    updateCliente(updated);
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const TABS = [
    { id: 'visao-geral', label: 'Visão Geral'  },
    { id: 'pedidos',     label: 'Pedidos'       },
    { id: 'historico',   label: 'Histórico'     },
    { id: 'tarefas',     label: 'Tarefas'       },
    { id: 'nps',         label: 'NPS'           },
  ];

  const initials = cliente.empresaNome.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const st       = STATUS_CFG[cliente.status] ?? STATUS_CFG.ativo;
  const pr       = PRIORIDADE_CFG[cliente.prioridade] ?? PRIORIDADE_CFG.B;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '85vw', height: '85vh', background: 'var(--bg)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>{cliente.empresaNome}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
              <span style={{ padding: '1px 8px', borderRadius: 20, fontSize: 11, ...st }}>{st.label}</span>
              <span style={{ padding: '1px 8px', borderRadius: 20, fontSize: 11, ...pr }}>Prioridade {cliente.prioridade}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>· {cliente.segmento}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PermissionGate module="crm" action="edit">
              {editando ? (
                <button onClick={salvarEdicao}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--green)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <Check size={12} /> Salvar
                </button>
              ) : (
                <button onClick={() => { setForm({ ...cliente }); setEditando(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <Pencil size={12} /> Editar
                </button>
              )}
            </PermissionGate>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Content (65%) */}
          <div style={{ flex: 13, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 22px', flexShrink: 0 }}>
              {TABS.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, transition: 'color .15s' }}>
                  {tab.label}
                  {tab.id === 'pedidos'   && <span style={{ marginLeft: 5, fontSize: 10, padding: '1px 5px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--text3)' }}>{cliente.pedidos.length}</span>}
                  {tab.id === 'historico' && <span style={{ marginLeft: 5, fontSize: 10, padding: '1px 5px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--text3)' }}>{cliente.historico.length}</span>}
                  {tab.id === 'tarefas'   && <span style={{ marginLeft: 5, fontSize: 10, padding: '1px 5px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--text3)' }}>{(cliente.tarefas ?? []).length}</span>}
                  {tab.id === 'nps'       && <span style={{ marginLeft: 5, fontSize: 10, padding: '1px 5px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--text3)' }}>{(cliente.npsHistorico ?? []).length}</span>}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
              {activeTab === 'visao-geral' && <VisaoGeralTab      cliente={cliente} editando={editando} form={form} set={set} />}
              {activeTab === 'pedidos'     && <PedidosTab         cliente={cliente} onUpdate={handleUpdate} />}
              {activeTab === 'historico'   && <HistoricoTab       cliente={cliente} onUpdate={handleUpdate} />}
              {activeTab === 'tarefas'     && <TarefasClienteTab  cliente={cliente} onUpdate={handleUpdate} />}
              {activeTab === 'nps'         && <NPSTab             cliente={cliente} />}
            </div>
          </div>

          {/* AI Panel (35%) */}
          <InlineAI cliente={cliente} />
        </div>
      </div>
    </div>
  );
}
