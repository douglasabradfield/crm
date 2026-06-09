import { useState } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { X, Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { useCRM } from '../../store/crm.js';
import PermissionGate from '../Auth/PermissionGate.jsx';

const inputStyle = {
  background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '7px 10px', color: 'var(--text)', fontSize: 12,
  fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
};

const TIPO_CAMPO = ['texto', 'número', 'moeda', 'data', 'checkbox', 'select', 'multi-select', 'URL'];

const COLORS = ['#5b6ef5','#38c9e0','#f0a832','#2dd4a0','#f05c5c','#b06ef5','#7c8ff7','#ff8c42'];

const EMPTY_ETAPA = { nome: '', cor: '#38c9e0', camposObrigatorios: [], metaTempoDias: 7 };
const EMPTY_CAMPO = { nome: '', tipo: 'texto', obrigatorio: false, visibilidade: 'lead', opcoes: [] };

/* ─── Etapa row ──────────────────────────────────────────────────────────────── */
function EtapaRow({ etapa, index, funilId, onUpdate, onDelete, stdFields }) {
  const [open, setOpen] = useState(false);

  function toggleReq(fieldId) {
    const cur = etapa.camposObrigatorios ?? [];
    onUpdate({ ...etapa, camposObrigatorios: cur.includes(fieldId) ? cur.filter((x) => x !== fieldId) : [...cur, fieldId] });
  }

  return (
    <Draggable draggableId={`etapa-${etapa.id}`} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps}
          style={{ marginBottom: 4, borderRadius: 8, border: `1px solid ${snapshot.isDragging ? 'var(--border2)' : 'var(--border)'}`, background: snapshot.isDragging ? 'var(--bg4)' : 'var(--bg3)', ...provided.draggableProps.style }}>

          {/* Row header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
            <div {...provided.dragHandleProps} style={{ cursor: 'grab', color: 'var(--text3)', display: 'flex' }}>
              <GripVertical size={14} />
            </div>
            <input type="color" value={etapa.cor} onChange={(e) => onUpdate({ ...etapa, cor: e.target.value })}
              style={{ width: 20, height: 20, border: 'none', background: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
            <input value={etapa.nome} onChange={(e) => onUpdate({ ...etapa, nome: e.target.value })}
              placeholder="Nome da etapa"
              style={{ ...inputStyle, flex: 1, padding: '5px 8px' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>Meta:</span>
              <input type="number" value={etapa.metaTempoDias ?? ''} min={1} max={365}
                onChange={(e) => onUpdate({ ...etapa, metaTempoDias: parseInt(e.target.value, 10) || null })}
                placeholder="dias"
                style={{ ...inputStyle, width: 52, padding: '5px 6px', textAlign: 'center' }}
              />
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>d</span>
            </div>
            <button onClick={() => setOpen((p) => !p)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', padding: 2 }}>
              {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            <button onClick={() => onDelete(etapa.id)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', padding: 2 }}
              title="Remover etapa">
              <Trash2 size={13} />
            </button>
          </div>

          {/* Expanded: campos obrigatórios */}
          {open && (
            <div style={{ padding: '0 12px 10px 44px' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>
                Campos obrigatórios para entrar nesta etapa:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {stdFields.map((f) => {
                  const checked = (etapa.camposObrigatorios ?? []).includes(f.id);
                  return (
                    <button key={f.id} onClick={() => toggleReq(f.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)', background: checked ? 'rgba(91,110,245,0.15)' : 'var(--bg4)', border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`, color: checked ? 'var(--accent2)' : 'var(--text3)' }}>
                      {checked && <Check size={9} />}{f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

/* ─── Funil row ──────────────────────────────────────────────────────────────── */
function FunilRow({ funil, index, isOnly, onUpdate, onDelete, campos }) {
  const [open, setOpen] = useState(false);
  const [showCampoForm, setShowCampoForm] = useState(false);
  const [campoForm, setCampoForm]         = useState({ ...EMPTY_CAMPO });
  const [opcoesRaw, setOpcoesRaw]         = useState('');

  const STD_FIELDS = [
    { id: 'email', label: 'E-mail' }, { id: 'phone', label: 'Telefone' },
    { id: 'company', label: 'Empresa' }, { id: 'value', label: 'Valor' },
  ];

  function addEtapa() {
    if ((funil.etapas ?? []).length >= 10) return;
    const newId = `e_${Date.now()}`;
    onUpdate({ ...funil, etapas: [...(funil.etapas ?? []), { ...EMPTY_ETAPA, id: newId, nome: `Etapa ${(funil.etapas ?? []).length + 1}` }] });
  }

  function updateEtapa(etapa) {
    onUpdate({ ...funil, etapas: funil.etapas.map((e) => e.id === etapa.id ? etapa : e) });
  }

  function deleteEtapa(etapaId) {
    onUpdate({ ...funil, etapas: funil.etapas.filter((e) => e.id !== etapaId) });
  }

  function reorderEtapas({ source, destination }) {
    if (!destination) return;
    const arr = [...funil.etapas];
    const [moved] = arr.splice(source.index, 1);
    arr.splice(destination.index, 0, moved);
    onUpdate({ ...funil, etapas: arr });
  }

  function salvarCampo() {
    if (!campoForm.nome.trim()) return;
    const opcoes = (campoForm.tipo === 'select' || campoForm.tipo === 'multi-select')
      ? opcoesRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const newCampo = { ...campoForm, opcoes, id: `cp_${Date.now()}` };
    onUpdate({ ...funil, camposPersonalizados: [...(funil.camposPersonalizados ?? []), newCampo] });
    setCampoForm({ ...EMPTY_CAMPO });
    setOpcoesRaw('');
    setShowCampoForm(false);
  }

  function deleteCampo(campoId) {
    onUpdate({ ...funil, camposPersonalizados: (funil.camposPersonalizados ?? []).filter((c) => c.id !== campoId) });
  }

  const camposPersonalizados = funil.camposPersonalizados ?? [];

  return (
    <Draggable draggableId={funil.id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps}
          style={{ marginBottom: 8, borderRadius: 10, border: `1px solid ${snapshot.isDragging ? 'var(--border2)' : 'var(--border)'}`, background: snapshot.isDragging ? 'var(--bg4)' : 'var(--bg2)', ...provided.draggableProps.style }}>

          {/* Funil header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
            <div {...provided.dragHandleProps} style={{ cursor: 'grab', color: 'var(--text3)', display: 'flex' }}>
              <GripVertical size={15} />
            </div>
            <input type="color" value={funil.cor ?? '#5b6ef5'} onChange={(e) => onUpdate({ ...funil, cor: e.target.value })}
              style={{ width: 22, height: 22, border: 'none', background: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
            <input value={funil.nome} onChange={(e) => onUpdate({ ...funil, nome: e.target.value })}
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
            />
            <span style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{funil.etapas?.length ?? 0} etapas</span>
            <button onClick={() => setOpen((p) => !p)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', padding: 2 }}>
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {!isOnly && (
              <button onClick={() => onDelete(funil.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', padding: 2 }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Expanded */}
          {open && (
            <div style={{ padding: '0 14px 14px' }}>
              {/* Etapas */}
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)', marginBottom: 6 }}>Etapas</div>
              <DragDropContext onDragEnd={reorderEtapas}>
                <Droppable droppableId={`etapas-${funil.id}`}>
                  {(prov) => (
                    <div ref={prov.innerRef} {...prov.droppableProps}>
                      {(funil.etapas ?? []).map((etapa, i) => (
                        <EtapaRow key={etapa.id} etapa={etapa} index={i} funilId={funil.id}
                          onUpdate={updateEtapa} onDelete={deleteEtapa} stdFields={STD_FIELDS} />
                      ))}
                      {prov.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              {(funil.etapas ?? []).length < 10 && (
                <button onClick={addEtapa}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: 14 }}>
                  <Plus size={11} /> Nova etapa
                </button>
              )}

              {/* Campos personalizados */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)', marginBottom: 6 }}>Campos personalizados</div>
                {camposPersonalizados.map((campo) => (
                  <div key={campo.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, padding: '6px 10px', borderRadius: 7, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{campo.nome}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--text3)' }}>{campo.tipo}</span>
                    {campo.obrigatorio && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: 'rgba(240,92,92,0.12)', color: 'var(--red)' }}>obrig.</span>}
                    <button onClick={() => deleteCampo(campo.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', padding: 2 }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}

                {showCampoForm ? (
                  <div style={{ background: 'var(--bg3)', borderRadius: 9, padding: 10, border: '1px solid var(--border)', marginTop: 4 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Nome do campo *</label>
                        <input value={campoForm.nome} onChange={(e) => setCampoForm((p) => ({ ...p, nome: e.target.value }))}
                          placeholder="Ex: Potencial de Upsell" style={{ ...inputStyle, width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Tipo</label>
                        <select value={campoForm.tipo} onChange={(e) => setCampoForm((p) => ({ ...p, tipo: e.target.value }))}
                          style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                          {TIPO_CAMPO.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Visibilidade</label>
                        <select value={campoForm.visibilidade} onChange={(e) => setCampoForm((p) => ({ ...p, visibilidade: e.target.value }))}
                          style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                          <option value="lead">Apenas leads</option>
                          <option value="ambos">Leads e clientes</option>
                        </select>
                      </div>
                      {(campoForm.tipo === 'select' || campoForm.tipo === 'multi-select') && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3 }}>Opções (vírgula)</label>
                          <input value={opcoesRaw} onChange={(e) => setOpcoesRaw(e.target.value)}
                            placeholder="Opção 1, Opção 2..." style={{ ...inputStyle, width: '100%' }} />
                        </div>
                      )}
                      <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" id="obrig" checked={campoForm.obrigatorio} onChange={(e) => setCampoForm((p) => ({ ...p, obrigatorio: e.target.checked }))} />
                        <label htmlFor="obrig" style={{ fontSize: 11, color: 'var(--text2)', cursor: 'pointer' }}>Campo obrigatório</label>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={salvarCampo}
                        style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        Adicionar campo
                      </button>
                      <button onClick={() => setShowCampoForm(false)}
                        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 11, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowCampoForm(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', marginTop: 4 }}>
                    <Plus size={11} /> Novo campo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

/* ─── Modal principal ────────────────────────────────────────────────────────── */
export default function FunisModal({ onClose }) {
  const { funis, addFunil, updateFunil, deleteFunil, reorderFunis } = useCRM();

  function onDragEnd({ source, destination, draggableId }) {
    if (!destination || source.index === destination.index) return;
    const arr = [...funis];
    const [moved] = arr.splice(source.index, 1);
    arr.splice(destination.index, 0, moved);
    reorderFunis(arr);
  }

  function novoFunil() {
    if (funis.length >= 10) return;
    addFunil({
      id:    `f${Date.now()}`,
      nome:  `Funil ${funis.length + 1}`,
      cor:   COLORS[funis.length % COLORS.length],
      etapas: [
        { id: `e_${Date.now()}_1`, nome: 'Prospecção',  cor: '#7c8ff7', camposObrigatorios: [], metaTempoDias: 7  },
        { id: `e_${Date.now()}_2`, nome: 'Qualificação', cor: '#38c9e0', camposObrigatorios: [], metaTempoDias: 14 },
        { id: `e_${Date.now()}_3`, nome: 'Proposta',    cor: '#f0a832', camposObrigatorios: [], metaTempoDias: 21 },
        { id: `e_${Date.now()}_4`, nome: 'Fechamento',  cor: '#b06ef5', camposObrigatorios: [], metaTempoDias: 7  },
        { id: `e_${Date.now()}_5`, nome: 'Ganho',       cor: '#2dd4a0', camposObrigatorios: [], metaTempoDias: null },
      ],
      camposPersonalizados: [],
    });
  }

  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', background: 'var(--bg)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Gerenciar funis</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Reordene, renomeie e configure etapas e campos</div>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="funis-list">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {funis.map((funil, i) => (
                    <FunilRow key={funil.id} funil={funil} index={i} isOnly={funis.length === 1}
                      onUpdate={updateFunil}
                      onDelete={deleteFunil}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <PermissionGate module="crm" action="edit">
            {funis.length < 10 && (
              <button onClick={novoFunil}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 10, padding: '10px 16px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%', justifyContent: 'center', marginTop: 4 }}>
                <Plus size={13} /> Novo funil
              </button>
            )}
          </PermissionGate>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Concluído
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
