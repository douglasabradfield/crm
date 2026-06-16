import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus, Search, X, Bot, Clock, Calendar, ChevronDown,
  Users, DollarSign, TrendingUp, ArrowRight, CheckCircle2,
  Building2, Phone, Settings, AlertCircle,
} from 'lucide-react';
import { useUI }         from '../store/index.js';
import { useCRM }        from '../store/crm.js';
import LeadModal         from '../components/CRM/LeadModal.jsx';
import FunisModal        from '../components/CRM/FunisModal.jsx';
import ClienteModal      from '../components/CRM/ClienteModal.jsx';
import PermissionGate    from '../components/Auth/PermissionGate.jsx';
import Termo             from '../components/UI/Termo.jsx';

const fmtBRL   = (n) => `R$ ${Number(n).toLocaleString('pt-BR')}`;
const fmtDate  = (d) => d ? d.split('-').reverse().join('/') : '—';
const today    = () => new Date().toISOString().split('T')[0];

const CAMPO_STD_LABEL = {
  company: 'Empresa', contact: 'Contato', email: 'E-mail',
  phone: 'Telefone', value: 'Valor (R$)', sector: 'Setor',
};

const STATUS_CLIENTE = {
  ativo:       { label: 'Ativo',      bg: 'rgba(45,212,160,0.15)',  color: 'var(--green)' },
  inativo:     { label: 'Inativo',    bg: 'rgba(240,168,50,0.15)',  color: 'var(--amber)' },
  'ex-cliente':{ label: 'Ex-cliente', bg: 'rgba(240,92,92,0.15)',   color: 'var(--red)'   },
};

const PRIO_CFG = {
  A: { bg: 'rgba(91,110,245,0.15)',  color: 'var(--accent2)' },
  B: { bg: 'rgba(56,201,224,0.15)',  color: 'var(--teal)'    },
  C: { bg: 'rgba(148,152,176,0.12)', color: 'var(--text3)'   },
};

/* ─── Blocked move modal ─────────────────────────────────────────────────────── */
function BlockedMoveModal({ pending, etapa, onFillNow, onCancel }) {
  const missing = (etapa?.camposObrigatorios ?? []).filter((f) => {
    const v = pending?.lead?.[f];
    return !v || String(v).trim() === '';
  });

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380, background: 'var(--bg2)', borderRadius: 14, border: '1px solid var(--border)', padding: 24, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(240,168,50,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={18} style={{ color: 'var(--amber)' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Campos obrigatórios</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Para avançar para "{etapa?.nome}"</div>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5 }}>
            Preencha os campos abaixo antes de mover <strong style={{ color: 'var(--text)' }}>{pending?.lead?.company}</strong>:
          </p>
          {missing.map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, background: 'rgba(240,168,50,0.08)', border: '1px solid rgba(240,168,50,0.2)', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--amber)' }}>· {CAMPO_STD_LABEL[f] ?? f}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onFillNow}
            style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Preencher agora
          </button>
          <button onClick={onCancel}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Lead card ──────────────────────────────────────────────────────────────── */
function LeadCard({ lead, etapa, index, onEdit, onAI, onConvert, isLast }) {
  const overdue = lead.daysSinceContact >= 7;
  const cor     = etapa?.cor ?? '#5b6ef5';

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit(lead)}
          style={{
            background: snapshot.isDragging ? 'var(--bg4)' : 'var(--bg2)',
            border: `1px solid ${overdue ? 'var(--amber)' : 'var(--border)'}`,
            borderLeft: `3px solid ${cor}`,
            borderRadius: 10, padding: '10px 12px',
            cursor: 'grab', userSelect: 'none',
            boxShadow: snapshot.isDragging ? '0 8px 24px rgba(0,0,0,0.4)' : overdue ? '0 0 0 1px var(--amber)' : 'none',
            transition: 'box-shadow .15s, border-color .15s',
            ...provided.draggableProps.style,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lead.company}
            </p>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {overdue && <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--amber)', background: 'rgba(240,168,50,0.12)', border: '1px solid rgba(240,168,50,0.25)', borderRadius: 20, padding: '1px 6px' }}>URGENTE</span>}
              {lead.convertido && <span style={{ fontSize: 9, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 2 }}><CheckCircle2 size={10} />cliente</span>}
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 7 }}>{lead.contact}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>
              {fmtBRL(lead.value)}<span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>/mês</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={10} style={{ color: overdue ? 'var(--amber)' : 'var(--text3)' }} />
              <span style={{ fontSize: 10, color: overdue ? 'var(--amber)' : 'var(--text3)' }}>{lead.daysSinceContact}d</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button onClick={(e) => { e.stopPropagation(); onAI(lead); }}
              style={{ flex: 1, background: 'rgba(91,110,245,0.08)', border: '1px solid rgba(91,110,245,0.2)', borderRadius: 6, padding: '5px 8px', color: 'var(--accent2)', fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'var(--font-body)' }}>
              <Bot size={11} /> Script IA
            </button>
            {isLast && !lead.convertido && (
              <PermissionGate module="crm" action="edit">
                <button onClick={(e) => { e.stopPropagation(); onConvert(lead.id); }}
                  style={{ flex: 1, background: 'rgba(45,212,160,0.1)', border: '1px solid rgba(45,212,160,0.25)', borderRadius: 6, padding: '5px 8px', color: 'var(--green)', fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'var(--font-body)' }}>
                  <ArrowRight size={11} /> Converter
                </button>
              </PermissionGate>
            )}
            {lead.followUpDate && !isLast && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <Calendar size={10} style={{ color: 'var(--text3)' }} />
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{lead.followUpDate.slice(5).replace('-', '/')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

/* ─── Kanban column ──────────────────────────────────────────────────────────── */
function KanbanColumn({ etapa, leads, onEdit, onAI, onConvert, isLast }) {
  const total = leads.reduce((s, l) => s + l.value, 0);
  const cor   = etapa.cor ?? '#5b6ef5';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 240, maxWidth: 280, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{etapa.nome}</span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 20 }}>{leads.length}</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, paddingLeft: 2 }}>{fmtBRL(total)}</p>

      <Droppable droppableId={etapa.id}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps}
            style={{ flex: 1, minHeight: 120, display: 'flex', flexDirection: 'column', gap: 8, padding: 6, borderRadius: 10, background: snapshot.isDraggingOver ? `${cor}0f` : 'var(--bg3)', border: `1px solid ${snapshot.isDraggingOver ? cor : 'var(--border)'}`, transition: 'background .15s, border-color .15s' }}>
            {leads.map((lead, i) => (
              <LeadCard key={lead.id} lead={lead} etapa={etapa} index={i}
                onEdit={onEdit} onAI={onAI} onConvert={onConvert} isLast={isLast} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

/* ─── Simple new lead form (inline modal) ────────────────────────────────────── */
const EMPTY_LEAD_FORM = { company: '', contact: '', email: '', phone: '', sector: '', tags: '', value: '', col: '', followUpDate: '', notes: '' };

function NewLeadModal({ funilId, defaultCol, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_LEAD_FORM, col: defaultCol, funilId });
  const iS = { width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' };
  const lS = { fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 };
  const fo = (e) => { e.target.style.borderColor = 'var(--accent)'; };
  const bl = (e) => { e.target.style.borderColor = 'var(--border)'; };

  function handleSave() {
    if (!form.company.trim()) return;
    onSave({ ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean), value: parseInt(form.value, 10) || 0 });
  }
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 26, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Novo lead</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={15} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1/-1' }}><label style={lS}>Empresa *</label><input style={iS} value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} placeholder="Nome da empresa" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>Contato</label><input style={iS} value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} placeholder="Nome do contato" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>Setor</label><input style={iS} value={form.sector} onChange={(e) => setForm((p) => ({ ...p, sector: e.target.value }))} placeholder="Ex: Software" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>E-mail</label><input style={iS} type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="contato@empresa.com" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>Telefone</label><input style={iS} value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(11) 9 0000-0000" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>Valor (R$)/mês</label><input style={iS} type="number" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} placeholder="0" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>Follow-up</label><input style={iS} type="date" value={form.followUpDate} onChange={(e) => setForm((p) => ({ ...p, followUpDate: e.target.value }))} onFocus={fo} onBlur={bl} /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={lS}>Notas</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...iS, resize: 'vertical', lineHeight: 1.5 }} onFocus={fo} onBlur={bl} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={handleSave} style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Adicionar lead</button>
          <button onClick={onClose} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ═══════════════════════════════════════════════════════════════
   CLIENTES TAB (unchanged structure, kept compact)
═══════════════════════════════════════════════════════════════ */
function ClienteCard({ cliente, onOpen }) {
  const st = STATUS_CLIENTE[cliente.status] ?? STATUS_CLIENTE.ativo;
  const pr = PRIO_CFG[cliente.prioridade]   ?? PRIO_CFG.B;
  const initials = cliente.empresaNome.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div onClick={() => onOpen(cliente)}
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color .15s' }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{cliente.empresaNome}</span>
          <span style={{ padding: '1px 8px', borderRadius: 20, fontSize: 11, ...st }}>{st.label}</span>
          <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 10, ...pr }}>P{cliente.prioridade}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><Building2 size={10} />{cliente.segmento}</span>
          <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={10} />{cliente.contato}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, flexShrink: 0, alignItems: 'center' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{fmtBRL(cliente.valorTotalGasto)}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>total gasto</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(cliente.ultimoContato)}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>último contato</div>
        </div>
        <div style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 500 }}>Ver detalhes</div>
      </div>
    </div>
  );
}

function NovoClienteModal({ onSave, onClose }) {
  const [form, setForm] = useState({ empresaNome: '', cnpj: '', contato: '', email: '', telefone: '', segmento: '', porte: 'Pequena', status: 'ativo', prioridade: 'B', tags: '' });
  const iS = { width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' };
  const lS = { fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 };
  const fo = (e) => { e.target.style.borderColor = 'var(--accent)'; };
  const bl = (e) => { e.target.style.borderColor = 'var(--border)'; };
  function handleSave() {
    if (!form.empresaNome.trim()) return;
    onSave({ ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean), origem: 'manual', leadId: null, pedidos: [], historico: [], ultimoContato: null, proximoContato: null, valorTotalGasto: 0 });
  }
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 26, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Novo cliente</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={15} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1/-1' }}><label style={lS}>Empresa *</label><input style={iS} value={form.empresaNome} onChange={(e) => setForm((p) => ({ ...p, empresaNome: e.target.value }))} placeholder="Nome da empresa" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>CNPJ</label><input style={iS} value={form.cnpj} onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>Segmento</label><input style={iS} value={form.segmento} onChange={(e) => setForm((p) => ({ ...p, segmento: e.target.value }))} placeholder="Ex: Saúde" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>Contato</label><input style={iS} value={form.contato} onChange={(e) => setForm((p) => ({ ...p, contato: e.target.value }))} placeholder="Nome do contato" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>Telefone</label><input style={iS} value={form.telefone} onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))} placeholder="(11) 9 0000-0000" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>E-mail</label><input style={iS} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} type="email" placeholder="contato@empresa.com" onFocus={fo} onBlur={bl} /></div>
          <div><label style={lS}>Status</label>
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} style={{ ...iS, cursor: 'pointer' }}>
              <option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="ex-cliente">Ex-cliente</option>
            </select>
          </div>
          <div><label style={lS}>Prioridade</label>
            <select value={form.prioridade} onChange={(e) => setForm((p) => ({ ...p, prioridade: e.target.value }))} style={{ ...iS, cursor: 'pointer' }}>
              <option value="A">A — Alta</option><option value="B">B — Média</option><option value="C">C — Baixa</option>
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}><label style={lS}>Tags (vírgula)</label><input style={iS} value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="SaaS, B2B" onFocus={fo} onBlur={bl} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={handleSave} style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Adicionar cliente</button>
          <button onClick={onClose} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ClientesTab({ clientes, onOpenCliente, onAddCliente }) {
  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState('todos');
  const [prioF,    setPrioF]    = useState('todas');
  const [sortBy,   setSortBy]   = useState('valor');
  const [showNovo, setShowNovo] = useState(false);

  const ativos            = clientes.filter((c) => c.status === 'ativo').length;
  const inativos          = clientes.filter((c) => c.status === 'inativo').length;
  const receitaRecorrente = clientes.filter((c) => c.status === 'ativo').reduce((s, c) => s + (c.pedidos ?? []).filter((p) => p.recorrente && p.status === 'pago').reduce((ps, p) => ps + p.valor, 0), 0);
  const ticketMedio       = ativos > 0 ? Math.round(receitaRecorrente / ativos) : 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clientes.filter((c) => {
      if (statusF !== 'todos' && c.status     !== statusF) return false;
      if (prioF  !== 'todas' && c.prioridade  !== prioF)  return false;
      if (q && !c.empresaNome.toLowerCase().includes(q) && !(c.contato ?? '').toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'valor')   return b.valorTotalGasto - a.valorTotalGasto;
      if (sortBy === 'nome')    return a.empresaNome.localeCompare(b.empresaNome);
      if (sortBy === 'contato') return (b.ultimoContato ?? '').localeCompare(a.ultimoContato ?? '');
      return 0;
    });
  }, [clientes, search, statusF, prioF, sortBy]);

  return (
    <div>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Clientes ativos',    value: ativos,                    color: '--green'  },
          { label: 'Inativos',           value: inativos,                  color: '--amber'  },
          { label: 'Receita recorrente', value: fmtBRL(receitaRecorrente), color: '--accent' },
          { label: 'Ticket médio',       value: fmtBRL(ticketMedio),       color: '--teal'   },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: `var(${color})`, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa ou contato…"
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 30px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        {[
          { value: statusF, onChange: setStatusF, options: [['todos','Todos status'],['ativo','Ativo'],['inativo','Inativo'],['ex-cliente','Ex-cliente']] },
          { value: prioF,   onChange: setPrioF,   options: [['todas','Todas prioridades'],['A','Prioridade A'],['B','Prioridade B'],['C','Prioridade C']] },
          { value: sortBy,  onChange: setSortBy,  options: [['valor','Ordenar: Valor'],['nome','Ordenar: Nome'],['contato','Ordenar: Último contato']] },
        ].map(({ value, onChange, options }, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <select value={value} onChange={(e) => onChange(e.target.value)}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 28px 8px 12px', color: 'var(--text2)', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer', appearance: 'none' }}>
              {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <ChevronDown size={11} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          </div>
        ))}
        <PermissionGate module="crm" action="edit">
          <button onClick={() => setShowNovo(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0 }}>
            <Plus size={13} /> Novo cliente
          </button>
        </PermissionGate>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Nenhum cliente encontrado</div>}
        {filtered.map((c) => <ClienteCard key={c.id} cliente={c} onOpen={onOpenCliente} />)}
      </div>

      {showNovo && (
        <PermissionGate module="crm" action="edit">
          <NovoClienteModal onSave={(data) => { onAddCliente(data); setShowNovo(false); }} onClose={() => setShowNovo(false)} />
        </PermissionGate>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function CRM() {
  const { openAI }  = useUI();
  const { leads, setLeads, clientes, funis, addLead, updateLead, addCliente, converterLeadEmCliente } = useCRM();

  const [activeTab,      setActiveTab]      = useState('pipeline');
  const [activeFunilId,  setActiveFunilId]  = useState(() => funis[0]?.id ?? 'f1');
  const [search,         setSearch]         = useState('');
  const [modal,          setModal]          = useState(null);  // null | 'new' | lead obj
  const [clienteModal,   setClienteModal]   = useState(null);
  const [showFunisModal, setShowFunisModal] = useState(false);
  const [pendingMove,    setPendingMove]    = useState(null);  // { lead, destEtapaId, source, destination }
  const [blockedModal,   setBlockedModal]   = useState(false);

  const activeFunil = funis.find((f) => f.id === activeFunilId) ?? funis[0];
  const etapas      = activeFunil?.etapas ?? [];
  const lastEtapaId = etapas[etapas.length - 1]?.id;

  /* Filter leads to active funil */
  const funilLeads = leads.filter((l) => l.funilId === activeFunil?.id);

  function doMove(source, destination, draggableId) {
    setLeads((prev) => {
      const moving    = prev.find((l) => l.id === draggableId);
      const without   = prev.filter((l) => l.id !== draggableId);
      const updated   = { ...moving, col: destination.droppableId };
      const destLeads = without.filter((l) => l.col === destination.droppableId && l.funilId === activeFunilId);
      destLeads.splice(destination.index, 0, updated);
      return [...without.filter((l) => !(l.funilId === activeFunilId && l.col === destination.droppableId)), ...destLeads];
    });
    // Persist the column change to the DB (optimistic update above, DB sync here).
    updateLead({ id: draggableId, col: destination.droppableId });
  }

  function onDragEnd({ source, destination, draggableId }) {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const destEtapa = etapas.find((e) => e.id === destination.droppableId);
    const lead      = leads.find((l) => l.id === draggableId);

    /* Check required fields */
    const missing = (destEtapa?.camposObrigatorios ?? []).filter((f) => {
      const v = lead?.[f];
      return !v || String(v).trim() === '';
    });

    if (missing.length > 0) {
      setPendingMove({ lead, destEtapaId: destination.droppableId, source, destination, draggableId });
      setBlockedModal(true);
      return;
    }

    doMove(source, destination, draggableId);
  }

  function handleConverter(leadId) {
    const novoCliente = converterLeadEmCliente(leadId);
    if (novoCliente) {
      setActiveTab('clientes');
      setClienteModal(novoCliente);
    }
  }

  function handleFillNow() {
    setBlockedModal(false);
    setModal(pendingMove.lead);
  }

  function handleCancelBlock() {
    setBlockedModal(false);
    setPendingMove(null);
  }

  const leadsPerEtapa = useMemo(() => {
    const q = search.toLowerCase();
    return etapas.reduce((acc, etapa) => {
      acc[etapa.id] = funilLeads.filter((l) => {
        if (l.col !== etapa.id) return false;
        if (q && !l.company.toLowerCase().includes(q) && !(l.contact ?? '').toLowerCase().includes(q)) return false;
        return true;
      });
      return acc;
    }, {});
  }, [leads, activeFunilId, search, etapas]);

  const totalValue   = funilLeads.filter((l) => l.col !== lastEtapaId).reduce((s, l) => s + l.value, 0);
  const overdueCount = funilLeads.filter((l) => l.daysSinceContact >= 7 && l.col !== lastEtapaId).length;

  const TABS = [
    { id: 'pipeline', label: 'Pipeline',  count: funilLeads.length },
    { id: 'clientes', label: 'Clientes',  count: clientes.length   },
  ];

  /* After saving lead from blocked modal, retry the pending move */
  function saveLead(form) {
    const isNew = !form.id;
    if (isNew) {
      addLead({ ...form, funilId: activeFunilId });
    } else {
      // updateLead is called inside LeadModal directly via useCRM
    }
    setModal(null);

    if (!isNew && pendingMove) {
      const updatedLead = { ...form };
      const missing = (etapas.find((e) => e.id === pendingMove.destEtapaId)?.camposObrigatorios ?? []).filter((f) => {
        const v = updatedLead[f];
        return !v || String(v).trim() === '';
      });
      if (missing.length === 0) {
        doMove(pendingMove.source, pendingMove.destination, pendingMove.draggableId);
      }
      setPendingMove(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', background: 'transparent', color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, transition: 'color .15s' }}>
            {tab.label}
            <span style={{ padding: '1px 6px', borderRadius: 20, fontSize: 10, background: activeTab === tab.id ? 'var(--accent)' : 'var(--bg3)', color: activeTab === tab.id ? '#fff' : 'var(--text3)' }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── Pipeline Tab ── */}
      {activeTab === 'pipeline' && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            {/* Funil selector */}
            <div style={{ position: 'relative' }}>
              <select value={activeFunilId} onChange={(e) => setActiveFunilId(e.target.value)}
                style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 28px 8px 12px', color: 'var(--accent2)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer', appearance: 'none', fontWeight: 500 }}>
                {funis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent2)', pointerEvents: 'none' }} />
            </div>

            <button onClick={() => setShowFunisModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Settings size={12} /> Gerenciar funis
            </button>

            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…"
                style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 30px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
              />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={11} /></button>}
            </div>

            {overdueCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 20, background: 'rgba(240,168,50,0.1)', border: '1px solid rgba(240,168,50,0.25)', fontSize: 12, color: 'var(--amber)' }}>
                <Clock size={12} />{overdueCount} urgente{overdueCount > 1 ? 's' : ''}
              </div>
            )}
            <div style={{ padding: '6px 11px', borderRadius: 20, background: 'var(--bg3)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>
              Pipeline: <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{fmtBRL(totalValue)}</span>
            </div>
            <PermissionGate module="crm" action="edit">
              <button onClick={() => setModal('new')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0 }}>
                <Plus size={14} /> Adicionar <Termo>lead</Termo>
              </button>
            </PermissionGate>
          </div>

          {/* Kanban */}
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <DragDropContext onDragEnd={onDragEnd}>
              <div style={{ display: 'flex', gap: 14, minWidth: 'max-content', alignItems: 'flex-start', paddingBottom: 16 }}>
                {etapas.map((etapa, i) => (
                  <KanbanColumn
                    key={etapa.id}
                    etapa={etapa}
                    leads={leadsPerEtapa[etapa.id] ?? []}
                    onEdit={(lead) => setModal(lead)}
                    onAI={(lead) => openAI(`Script para ${lead.company} (${lead.sector}). Contato: ${lead.contact}. Etapa: ${etapa.nome}. Valor: ${fmtBRL(lead.value)}/mês. ${lead.daysSinceContact}d sem contato.`)}
                    onConvert={handleConverter}
                    isLast={i === etapas.length - 1}
                  />
                ))}
              </div>
            </DragDropContext>
          </div>
        </>
      )}

      {/* ── Clientes Tab ── */}
      {activeTab === 'clientes' && (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <ClientesTab clientes={clientes} onOpenCliente={setClienteModal} onAddCliente={addCliente} />
        </div>
      )}

      {/* ── Modals ── */}
      {modal === 'new' && (
        <NewLeadModal
          funilId={activeFunilId}
          defaultCol={etapas[0]?.id ?? 'prospeccao'}
          onSave={(form) => { addLead({ ...form, funilId: activeFunilId }); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal && modal !== 'new' && (
        <LeadModal
          lead={modal}
          funil={activeFunil}
          onClose={() => {
            if (pendingMove) {
              const updatedLead = leads.find((l) => l.id === pendingMove.draggableId);
              if (updatedLead) {
                const missing = (etapas.find((e) => e.id === pendingMove.destEtapaId)?.camposObrigatorios ?? [])
                  .filter((f) => { const v = updatedLead[f]; return !v || String(v).trim() === ''; });
                if (missing.length === 0) doMove(pendingMove.source, pendingMove.destination, pendingMove.draggableId);
              }
              setPendingMove(null);
            }
            setModal(null);
          }}
        />
      )}
      {clienteModal && (
        <ClienteModal cliente={clienteModal} onClose={() => setClienteModal(null)} />
      )}
      {showFunisModal && (
        <FunisModal onClose={() => setShowFunisModal(false)} />
      )}
      {blockedModal && pendingMove && (
        <BlockedMoveModal
          pending={pendingMove}
          etapa={etapas.find((e) => e.id === pendingMove.destEtapaId)}
          onFillNow={handleFillNow}
          onCancel={handleCancelBlock}
        />
      )}
    </div>
  );
}
