import { useState } from 'react';
import {
  X, Phone, Mail, Building2, Tag, DollarSign, Calendar, FileText,
  Clock, User, Plus, Check, Trash2, AlertCircle, Upload,
  MessageSquare, PhoneCall, Video, Edit3,
} from 'lucide-react';
import { useCRM } from '../../store/crm.js';
import PermissionGate from '../Auth/PermissionGate.jsx';

const fmtDate = (d) => d ? d.split('-').reverse().join('/') : '—';
const today   = () => new Date().toISOString().split('T')[0];
const isOverdue = (prazo) => prazo && prazo < today();

const inputStyle = {
  width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 12,
  fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 4 };

const ATIVIDADE_TIPOS = [
  { id: 'ligacao',       label: 'Ligação',       Icon: PhoneCall,    color: '--accent2' },
  { id: 'email',         label: 'E-mail',        Icon: Mail,         color: '--teal'    },
  { id: 'reuniao',       label: 'Reunião',       Icon: Video,        color: '--purple'  },
  { id: 'anotacao',      label: 'Anotação',      Icon: Edit3,        color: '--text2'   },
  { id: 'mudancaEtapa',  label: 'Mudança etapa', Icon: AlertCircle,  color: '--amber'   },
];

const PRIO_CFG = {
  Alta:  { bg: 'rgba(240,92,92,0.12)',  color: 'var(--red)'     },
  Média: { bg: 'rgba(240,168,50,0.12)', color: 'var(--amber)'   },
  Baixa: { bg: 'rgba(45,212,160,0.12)', color: 'var(--green)'   },
};

const STD_FIELDS = [
  { key: 'company',      label: 'Empresa',     type: 'text',   icon: Building2  },
  { key: 'contact',      label: 'Contato',     type: 'text',   icon: User       },
  { key: 'email',        label: 'E-mail',      type: 'email',  icon: Mail       },
  { key: 'phone',        label: 'Telefone',    type: 'tel',    icon: Phone      },
  { key: 'sector',       label: 'Setor',       type: 'text',   icon: Building2  },
  { key: 'value',        label: 'Valor (R$)',  type: 'number', icon: DollarSign },
  { key: 'followUpDate', label: 'Follow-up',   type: 'date',   icon: Calendar   },
  { key: 'notes',        label: 'Notas',       type: 'textarea',icon: FileText  },
];

const RESPONSAVEIS = ['Admin', 'João Vendedor', 'Maria Gerente'];

/* ─── Visão Geral ────────────────────────────────────────────────────────────── */
function VisaoGeralTab({ lead, campos }) {
  const { updateLead } = useCRM();
  const [editing, setEditing] = useState(null);
  const [val,     setVal]     = useState('');

  function startEdit(key, current) {
    setEditing(key);
    setVal(String(current ?? ''));
  }
  function confirm(key) {
    const updated = { ...lead, [key]: key === 'value' ? parseInt(val, 10) || 0 : val };
    updateLead(updated);
    setEditing(null);
  }
  function confirmCustom(campoId) {
    updateLead({ ...lead, camposPersonalizados: { ...lead.camposPersonalizados, [campoId]: val } });
    setEditing(null);
  }

  const fieldVal = (key) => {
    if (key === 'value') return lead[key] ? `R$ ${Number(lead[key]).toLocaleString('pt-BR')}` : '—';
    if (key === 'followUpDate') return fmtDate(lead[key]);
    return lead[key] || '—';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Responsável */}
      <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
          {(lead.responsavel ?? 'A')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Responsável</div>
          {editing === '__resp__' ? (
            <select value={val} onChange={(e) => setVal(e.target.value)}
              onBlur={() => { updateLead({ ...lead, responsavel: val }); setEditing(null); }}
              autoFocus
              style={{ ...inputStyle, padding: '3px 6px', fontSize: 12, width: 'auto' }}>
              {RESPONSAVEIS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          ) : (
            <div onClick={() => startEdit('__resp__', lead.responsavel)}
              style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer', fontWeight: 500 }}>
              {lead.responsavel || 'Não atribuído'}
            </div>
          )}
        </div>
      </div>

      {/* Standard fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {STD_FIELDS.filter((f) => f.type !== 'textarea').map(({ key, label, type, icon: Icon }) => (
          <div key={key}>
            <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 3 }}><Icon size={9} />{label}</div>
            {editing === key ? (
              <input type={type} value={val} autoFocus
                onChange={(e) => setVal(e.target.value)}
                onBlur={() => confirm(key)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirm(key); if (e.key === 'Escape') setEditing(null); }}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              />
            ) : (
              <div onClick={() => startEdit(key, lead[key])}
                style={{ fontSize: 12, color: lead[key] ? 'var(--text)' : 'var(--text3)', padding: '6px 8px', borderRadius: 6, background: 'var(--bg3)', cursor: 'text', minHeight: 30, display: 'flex', alignItems: 'center' }}>
                {fieldVal(key)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      {(() => {
        const key = 'notes';
        return (
          <div>
            <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}><FileText size={9} />Notas</div>
            {editing === key ? (
              <textarea value={val} autoFocus rows={3}
                onChange={(e) => setVal(e.target.value)}
                onBlur={() => confirm(key)}
                onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              />
            ) : (
              <div onClick={() => startEdit(key, lead[key])}
                style={{ fontSize: 12, color: lead[key] ? 'var(--text)' : 'var(--text3)', padding: '8px 10px', borderRadius: 6, background: 'var(--bg3)', cursor: 'text', minHeight: 60, lineHeight: 1.5 }}>
                {lead[key] || 'Clique para adicionar notas…'}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tags */}
      <div>
        <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}><Tag size={9} />Tags</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(lead.tags ?? []).map((t) => (
            <span key={t} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)' }}>{t}</span>
          ))}
          {(lead.tags ?? []).length === 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>}
        </div>
      </div>

      {/* Custom campos */}
      {campos.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 500 }}>Campos personalizados</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {campos.map((campo) => {
              const val_cp = lead.camposPersonalizados?.[campo.id];
              const edKey  = `cp_${campo.id}`;
              return (
                <div key={campo.id}>
                  <label style={labelStyle}>{campo.nome}{campo.obrigatorio && <span style={{ color: 'var(--red)' }}>*</span>}</label>
                  {editing === edKey ? (
                    campo.tipo === 'select' || campo.tipo === 'multi-select' ? (
                      <select value={val} autoFocus
                        onChange={(e) => setVal(e.target.value)}
                        onBlur={() => confirmCustom(campo.id)}
                        style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">—</option>
                        {(campo.opcoes ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : campo.tipo === 'checkbox' ? (
                      <input type="checkbox" checked={val === 'true'} autoFocus
                        onChange={(e) => setVal(String(e.target.checked))}
                        onBlur={() => confirmCustom(campo.id)}
                      />
                    ) : (
                      <input
                        type={campo.tipo === 'numero' || campo.tipo === 'moeda' ? 'number' : campo.tipo === 'data' ? 'date' : campo.tipo === 'url' ? 'url' : 'text'}
                        value={val} autoFocus
                        onChange={(e) => setVal(e.target.value)}
                        onBlur={() => confirmCustom(campo.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') confirmCustom(campo.id); if (e.key === 'Escape') setEditing(null); }}
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                      />
                    )
                  ) : (
                    <div onClick={() => { setEditing(edKey); setVal(String(val_cp ?? '')); }}
                      style={{ fontSize: 12, color: val_cp ? 'var(--text)' : 'var(--text3)', padding: '6px 8px', borderRadius: 6, background: 'var(--bg3)', cursor: 'text', minHeight: 30, display: 'flex', alignItems: 'center' }}>
                      {campo.tipo === 'checkbox'
                        ? (val_cp === 'true' ? '✓ Sim' : 'Não')
                        : campo.tipo === 'moeda' && val_cp ? `R$ ${Number(val_cp).toLocaleString('pt-BR')}`
                        : campo.tipo === 'data' && val_cp ? fmtDate(val_cp)
                        : val_cp || '—'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Atividades ─────────────────────────────────────────────────────────────── */
function AtividadesTab({ lead }) {
  const { addAtividade } = useCRM();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: 'ligacao', descricao: '', data: today() });

  function salvar() {
    if (!form.descricao.trim()) return;
    addAtividade(lead.id, { ...form, usuario: 'Admin' });
    setForm({ tipo: 'ligacao', descricao: '', data: today() });
    setShowForm(false);
  }

  const sorted = [...(lead.atividades ?? [])].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div>
      {sorted.length === 0 && !showForm && (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Nenhuma atividade registrada</div>
      )}

      {sorted.map((av, i) => {
        const tipo = ATIVIDADE_TIPOS.find((t) => t.id === av.tipo) ?? ATIVIDADE_TIPOS[3];
        return (
          <div key={av.id} style={{ display: 'flex', gap: 10, marginBottom: 2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `color-mix(in srgb, var(${tipo.color}) 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid color-mix(in srgb, var(${tipo.color}) 30%, transparent)` }}>
                <tipo.Icon size={11} style={{ color: `var(${tipo.color})` }} />
              </div>
              {i < sorted.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 14, margin: '2px 0' }} />}
            </div>
            <div style={{ paddingBottom: i < sorted.length - 1 ? 10 : 0, flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: `color-mix(in srgb, var(${tipo.color}) 12%, transparent)`, color: `var(${tipo.color})` }}>{tipo.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{fmtDate(av.data)}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>· {av.usuario}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>{av.descricao}</p>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {showForm ? (
          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  {ATIVIDADE_TIPOS.filter((t) => t.id !== 'mudancaEtapa').map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Data</label>
                <input type="date" value={form.data} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Descrição *</label>
                <textarea value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                  rows={2} placeholder="Descreva a atividade..."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={salvar}
                style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Registrar
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
            <Plus size={13} /> Registrar atividade
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Tarefas ────────────────────────────────────────────────────────────────── */
function TarefasTab({ lead }) {
  const { addTarefaLead, toggleTarefaLead } = useCRM();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: '', responsavel: 'Admin', prazo: '', prioridade: 'Média' });

  function salvar() {
    if (!form.titulo.trim()) return;
    addTarefaLead(lead.id, { ...form, status: 'pendente', automatica: false });
    setForm({ titulo: '', responsavel: 'Admin', prazo: '', prioridade: 'Média' });
    setShowForm(false);
  }

  const tarefas = lead.tarefas ?? [];

  return (
    <div>
      {tarefas.length === 0 && !showForm && (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Nenhuma tarefa vinculada</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {tarefas.map((t) => {
          const vencida   = t.status === 'pendente' && isOverdue(t.prazo);
          const concluida = t.status === 'concluida';
          const prio      = PRIO_CFG[t.prioridade] ?? PRIO_CFG.Média;
          return (
            <div key={t.id}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: vencida ? 'rgba(240,92,92,0.06)' : 'var(--bg3)', border: `1px solid ${vencida ? 'rgba(240,92,92,0.25)' : 'var(--border)'}` }}>
              <button onClick={() => toggleTarefaLead(lead.id, t.id)}
                style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${concluida ? 'var(--green)' : 'var(--border2)'}`, background: concluida ? 'var(--green)' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {concluida && <Check size={10} style={{ color: '#fff' }} />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: concluida ? 'var(--text3)' : vencida ? 'var(--red)' : 'var(--text)', textDecoration: concluida ? 'line-through' : 'none', lineHeight: 1.4 }}>
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
                <label style={labelStyle}>Título *</label>
                <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Descreva a tarefa..." style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
                />
              </div>
              <div>
                <label style={labelStyle}>Responsável</label>
                <select value={form.responsavel} onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  {RESPONSAVEIS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Prazo</label>
                <input type="date" value={form.prazo} onChange={(e) => setForm((p) => ({ ...p, prazo: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Prioridade</label>
                <select value={form.prioridade} onChange={(e) => setForm((p) => ({ ...p, prioridade: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
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

/* ─── Documentos ─────────────────────────────────────────────────────────────── */
const DOCS_MOCK = [
  { id: 'd1', nome: 'Proposta_Comercial_v2.pdf',  tipo: 'PDF',  tamanho: '248 KB', data: '2026-05-21' },
  { id: 'd2', nome: 'NDA_Assinado.pdf',            tipo: 'PDF',  tamanho: '120 KB', data: '2026-05-14' },
  { id: 'd3', nome: 'Planilha_Necessidades.xlsx',  tipo: 'XLSX', tamanho: '85 KB',  data: '2026-05-10' },
];

function DocumentosTab({ lead }) {
  const docs = lead.documentos?.length > 0 ? lead.documentos : DOCS_MOCK;
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {docs.map((doc) => (
          <div key={doc.id}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: doc.tipo === 'PDF' ? 'rgba(240,92,92,0.12)' : 'rgba(45,212,160,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={16} style={{ color: doc.tipo === 'PDF' ? 'var(--red)' : 'var(--green)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{doc.nome}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{doc.tipo} · {doc.tamanho} · {fmtDate(doc.data)}</div>
            </div>
            <button style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', fontSize: 11, cursor: 'not-allowed', opacity: 0.5, fontFamily: 'var(--font-body)' }}>
              Baixar
            </button>
          </div>
        ))}
      </div>
      <button disabled
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--text3)', cursor: 'not-allowed', fontFamily: 'var(--font-body)', width: '100%', justifyContent: 'center', opacity: 0.6 }}>
        <Upload size={13} /> Upload de arquivo (em breve)
      </button>
    </div>
  );
}

/* ─── Modal principal ────────────────────────────────────────────────────────── */
export default function LeadModal({ lead: initialLead, onClose, funil }) {
  const { leads, deleteLead } = useCRM();
  const lead = leads.find((l) => l.id === initialLead.id) ?? initialLead;

  const [activeTab, setActiveTab] = useState('visao-geral');
  const campos = funil
    ? (funil.camposPersonalizados ?? [])
    : [];

  const etapaAtual = funil?.etapas?.find((e) => e.id === lead.col);
  const cor = etapaAtual?.cor ?? '#5b6ef5';

  const TABS = [
    { id: 'visao-geral',  label: 'Visão Geral'  },
    { id: 'atividades',   label: 'Atividades',  count: (lead.atividades ?? []).length },
    { id: 'tarefas',      label: 'Tarefas',     count: (lead.tarefas ?? []).length    },
    { id: 'documentos',   label: 'Documentos'   },
  ];

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 620, maxHeight: '90vh', background: 'var(--bg)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
            {lead.company?.[0]?.toUpperCase() ?? 'L'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{lead.company}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
              <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: `${cor}22`, color: cor, border: `1px solid ${cor}44` }}>
                {etapaAtual?.nome ?? lead.col}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{lead.contact}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>
                R$ {Number(lead.value).toLocaleString('pt-BR')}/mês
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <PermissionGate module="crm" action="delete">
              <button onClick={() => { deleteLead(lead.id); onClose(); }}
                style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid rgba(240,92,92,0.3)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={13} />
              </button>
            </PermissionGate>
            <button onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', flexShrink: 0, background: 'var(--bg2)' }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)', color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, transition: 'color .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
              {tab.label}
              {tab.count != null && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--text3)' }}>{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {activeTab === 'visao-geral' && <VisaoGeralTab lead={lead} campos={campos} />}
          {activeTab === 'atividades'  && <AtividadesTab lead={lead} />}
          {activeTab === 'tarefas'     && <TarefasTab    lead={lead} />}
          {activeTab === 'documentos'  && <DocumentosTab lead={lead} />}
        </div>
      </div>
    </div>
  );
}
