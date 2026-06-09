import { createElement, createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase.js';
import { useAuth }   from './auth.js';

/* ─── Funis / campos — still in localStorage (migrar depois) ─────────────────── */
export const FUNIS_SEED = [
  {
    id: 'f1', nome: 'Vendas', cor: '#5b6ef5',
    etapas: [
      { id: 'prospeccao',   nome: 'Prospecção',   cor: '#7c8ff7', camposObrigatorios: [],               metaTempoDias: 7   },
      { id: 'qualificacao', nome: 'Qualificação', cor: '#38c9e0', camposObrigatorios: ['email'],        metaTempoDias: 14  },
      { id: 'proposta',     nome: 'Proposta',     cor: '#f0a832', camposObrigatorios: ['email','phone'], metaTempoDias: 21 },
      { id: 'fechamento',   nome: 'Fechamento',   cor: '#b06ef5', camposObrigatorios: [],               metaTempoDias: 7   },
      { id: 'ganho',        nome: 'Ganho',        cor: '#2dd4a0', camposObrigatorios: [],               metaTempoDias: null },
    ],
  },
];

export const CAMPO_STD_LABEL = {
  company: 'Empresa', contact: 'Contato', email: 'E-mail',
  phone: 'Telefone', value: 'Valor (R$)', sector: 'Setor', notes: 'Notas',
};

const CAMPOS_SEED = {
  f1: [
    { id: 'cp1', nome: 'Potencial de Upsell', tipo: 'moeda',    obrigatorio: false, visibilidade: 'lead',  opcoes: [] },
    { id: 'cp2', nome: 'Canal de Origem',     tipo: 'select',   obrigatorio: false, visibilidade: 'ambos', opcoes: ['Indicação','LinkedIn','Google','Instagram','Prospecção Ativa'] },
    { id: 'cp3', nome: 'Tem CNPJ Ativo?',     tipo: 'checkbox', obrigatorio: false, visibilidade: 'lead',  opcoes: [] },
  ],
};

const LS_FUNIS  = 'crm_funis';
const LS_CAMPOS = 'crm_campos';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ─── Row mappers (DB snake_case ↔ app camelCase) ────────────────────────────── */
//
// Real leads columns:
//   id, empresa_id, responsavel_id, funil_id, col, company, contact, email,
//   phone, sector, value, tags, notes, convertido, follow_up_date,
//   campos_personalizados, atividades, tarefas, documentos, criado_em, atualizado_em
//
// Real clientes columns:
//   id, empresa_id, responsavel_id, company, contact, email, phone, sector,
//   value, tags, notes, nps_historico, tarefas, criado_em, atualizado_em

function daysSince(isoDateStr) {
  if (!isoDateStr) return 0;
  return Math.floor((Date.now() - new Date(isoDateStr).getTime()) / 86_400_000);
}

function dateOrNull(v) {
  // Reject empty strings so Postgres date columns never receive ''.
  return (v === '' || v == null) ? null : v;
}

function leadFromRow(r) {
  return {
    id:                   r.id,
    funilId:              r.funil_id,
    col:                  r.col,
    company:              r.company               ?? '',
    contact:              r.contact               ?? '',
    email:                r.email                 ?? '',
    phone:                r.phone                 ?? '',
    sector:               r.sector                ?? '',
    tags:                 r.tags                  ?? [],
    value:                r.value                 ?? 0,
    // daysSinceContact is derived — no DB column.
    daysSinceContact:     daysSince(r.criado_em),
    followUpDate:         r.follow_up_date        ?? null,
    notes:                r.notes                 ?? '',
    convertido:           r.convertido            ?? false,
    // 'responsavel' (display name string) has no DB column; default to ''.
    responsavel:          '',
    responsavelId:        r.responsavel_id        ?? null,
    camposPersonalizados: r.campos_personalizados ?? {},
    atividades:           r.atividades            ?? [],
    tarefas:              r.tarefas               ?? [],
    documentos:           r.documentos            ?? [],
  };
}

// Allowlist: only these DB columns are writable (empresa_id/responsavel_id
// excluded here — callers strip them before INSERT; responsavel_id allowed
// in UPDATE for reassignment via the caller's explicit inclusion).
function leadToRow(l) {
  const r = {};
  if ('funilId'              in l) r.funil_id              = l.funilId;
  if ('col'                  in l) r.col                   = l.col;
  if ('company'              in l) r.company               = l.company;
  if ('contact'              in l) r.contact               = l.contact;
  if ('email'                in l) r.email                 = l.email;
  if ('phone'                in l) r.phone                 = l.phone;
  if ('sector'               in l) r.sector                = l.sector;
  if ('tags'                 in l) r.tags                  = l.tags;
  if ('value'                in l) r.value                 = l.value;
  // daysSinceContact is never sent — it's derived client-side.
  if ('followUpDate'         in l) r.follow_up_date        = dateOrNull(l.followUpDate);
  if ('notes'                in l) r.notes                 = l.notes;
  if ('convertido'           in l) r.convertido            = l.convertido;
  // 'responsavel' (string name) has no DB column — never send.
  if ('responsavelId'        in l) r.responsavel_id        = l.responsavelId;
  if ('camposPersonalizados' in l) r.campos_personalizados = l.camposPersonalizados;
  if ('atividades'           in l) r.atividades            = l.atividades;
  if ('tarefas'              in l) r.tarefas               = l.tarefas;
  if ('documentos'           in l) r.documentos            = l.documentos;
  return r;
}

function clienteFromRow(r) {
  return {
    id:              r.id,
    // DB uses generic 'company'/'contact'/'phone'/'sector'; app calls them differently.
    empresaNome:     r.company          ?? '',
    contato:         r.contact          ?? '',
    email:           r.email            ?? '',
    telefone:        r.phone            ?? '',
    segmento:        r.sector           ?? '',
    value:           r.value            ?? 0,
    tags:            r.tags             ?? [],
    notes:           r.notes            ?? '',
    tarefas:         r.tarefas          ?? [],
    npsHistorico:    r.nps_historico    ?? [],
    createdAt:       r.criado_em        ?? null,
    responsavelId:   r.responsavel_id   ?? null,
    // Fields not yet in the DB — kept in memory with safe defaults.
    cnpj:            '',
    porte:           'Pequena',
    status:          'ativo',
    origem:          '',
    leadId:          null,
    prioridade:      'B',
    pedidos:         [],
    historico:       [],
    ultimoContato:   null,
    proximoContato:  null,
    valorTotalGasto: r.value            ?? 0,
    npsLembreteDias: 90,
  };
}

function clienteToRow(c) {
  const r = {};
  // Map app field names → real DB columns (empresa_id/responsavel_id excluded
  // from INSERT; responsavelId included here for UPDATE reassignment).
  if ('empresaNome'   in c) r.company        = c.empresaNome;
  if ('company'       in c) r.company        = c.company;     // direct key also accepted
  if ('contato'       in c) r.contact        = c.contato;
  if ('contact'       in c) r.contact        = c.contact;
  if ('email'         in c) r.email          = c.email;
  if ('telefone'      in c) r.phone          = c.telefone;
  if ('phone'         in c) r.phone          = c.phone;
  if ('segmento'      in c) r.sector         = c.segmento;
  if ('sector'        in c) r.sector         = c.sector;
  if ('value'         in c) r.value          = c.value;
  if ('valorTotalGasto' in c) r.value        = c.valorTotalGasto; // fallback mapping
  if ('tags'          in c) r.tags           = c.tags;
  if ('notes'         in c) r.notes          = c.notes;
  if ('npsHistorico'  in c) r.nps_historico  = c.npsHistorico;
  if ('tarefas'       in c) r.tarefas        = c.tarefas;
  if ('responsavelId' in c) r.responsavel_id = c.responsavelId;
  // All other app fields (cnpj, porte, status, origem, leadId, pedidos,
  // historico, ultimoContato, proximoContato, prioridade, npsLembreteDias)
  // have no DB column yet — intentionally not included.
  return r;
}

/* ─── Context ─────────────────────────────────────────────────────────────────── */
const CRMContext = createContext(null);

export function CRMProvider({ children }) {
  const { user, empresaId, loading: authLoading } = useAuth();

  const [leads,           setLeads]          = useState([]);
  const [clientes,        setClientes]       = useState([]);
  const [funis,           setFunis]          = useState(() => load(LS_FUNIS,  FUNIS_SEED));
  const [campos,          setCampos]         = useState(() => load(LS_CAMPOS, CAMPOS_SEED));
  const [loadingLeads,    setLoadingLeads]   = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [crmError,        setCrmError]       = useState(null);
  const [filtroLeads,     setFiltroLeads]    = useState('meus');

  // Refs keep async callbacks reading fresh state without needing them as deps.
  const leadsRef    = useRef([]);
  const clientesRef = useRef([]);
  useEffect(() => { leadsRef.current    = leads;    }, [leads]);
  useEffect(() => { clientesRef.current = clientes; }, [clientes]);

  // Funis/campos still persist to localStorage.
  useEffect(() => { save(LS_FUNIS,  funis);  }, [funis]);
  useEffect(() => { save(LS_CAMPOS, campos); }, [campos]);

  const ids = useRef({ campo: 4 });

  /* ── Fetch leads + clientes when session is ready ───────────────────────────── */
  useEffect(() => {
    if (authLoading) return;

    if (!empresaId) {
      // Logged out or no profile — clear data.
      setLeads([]);
      setClientes([]);
      setLoadingLeads(false);
      setLoadingClientes(false);
      return;
    }

    let cancelled = false;

    setLoadingLeads(true);
    setLoadingClientes(true);
    setCrmError(null);

    supabase.from('leads').select('*').then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setCrmError(error.message); setLoadingLeads(false); return; }
      setLeads((data ?? []).map(leadFromRow));
      setLoadingLeads(false);
    });

    supabase.from('clientes').select('*').then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setCrmError(error.message); setLoadingClientes(false); return; }
      setClientes((data ?? []).map(clienteFromRow));
      setLoadingClientes(false);
    });

    return () => { cancelled = true; };
  }, [empresaId, authLoading]);

  /* ── Lead actions ─────────────────────────────────────────────────────────── */

  async function addLead(form) {
    const row = leadToRow({
      ...form,
      daysSinceContact: 0, convertido: false,
      atividades: [], tarefas: [], documentos: [], camposPersonalizados: {},
    });
    // empresa_id and responsavel_id are set by the DB (via defaults/triggers).
    delete row.empresa_id;
    delete row.responsavel_id;

    const { data, error } = await supabase.from('leads').insert(row).select().single();
    if (error) { setCrmError(error.message); return; }
    setLeads((prev) => [...prev, leadFromRow(data)]);
  }

  async function updateLead(form) {
    const row = leadToRow(form);
    // empresa_id is never updated; responsavelId IS included (reassignment allowed).
    delete row.empresa_id;

    const { error } = await supabase.from('leads').update(row).eq('id', form.id);
    if (error) { setCrmError(error.message); return; }
    setLeads((prev) => prev.map((l) => l.id === form.id ? { ...l, ...form } : l));
  }

  async function deleteLead(id) {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) { setCrmError(error.message); return; }
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  async function addAtividade(leadId, atividade) {
    const lead = leadsRef.current.find((l) => l.id === leadId);
    if (!lead) return;
    const newAtividades = [...(lead.atividades ?? []), { ...atividade, id: `av${Date.now()}` }];
    const { error } = await supabase.from('leads').update({ atividades: newAtividades }).eq('id', leadId);
    if (error) { setCrmError(error.message); return; }
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, atividades: newAtividades } : l));
  }

  async function addTarefaLead(leadId, tarefa) {
    const lead = leadsRef.current.find((l) => l.id === leadId);
    if (!lead) return;
    const newTarefas = [...(lead.tarefas ?? []), { ...tarefa, id: `t${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }];
    const { error } = await supabase.from('leads').update({ tarefas: newTarefas }).eq('id', leadId);
    if (error) { setCrmError(error.message); return; }
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, tarefas: newTarefas } : l));
  }

  async function toggleTarefaLead(leadId, tarefaId) {
    const lead = leadsRef.current.find((l) => l.id === leadId);
    if (!lead) return;
    const newTarefas = (lead.tarefas ?? []).map((t) =>
      t.id === tarefaId ? { ...t, status: t.status === 'pendente' ? 'concluida' : 'pendente' } : t,
    );
    const { error } = await supabase.from('leads').update({ tarefas: newTarefas }).eq('id', leadId);
    if (error) { setCrmError(error.message); return; }
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, tarefas: newTarefas } : l));
  }

  /* ── Cliente actions ──────────────────────────────────────────────────────── */

  async function addCliente(clienteData) {
    const row = clienteToRow({
      ...clienteData,
      pedidos: [], historico: [], valorTotalGasto: 0,
      tarefas: [], npsHistorico: [], npsLembreteDias: 90,
      createdAt: new Date().toISOString().split('T')[0],
    });
    delete row.empresa_id;
    delete row.responsavel_id;

    const { data, error } = await supabase.from('clientes').insert(row).select().single();
    if (error) { setCrmError(error.message); return null; }
    const novo = clienteFromRow(data);
    setClientes((prev) => [...prev, novo]);
    return novo;
  }

  async function updateCliente(cliente) {
    const row = clienteToRow(cliente);
    delete row.empresa_id;

    const { error } = await supabase.from('clientes').update(row).eq('id', cliente.id);
    if (error) { setCrmError(error.message); return; }
    setClientes((prev) => prev.map((c) => c.id === cliente.id ? cliente : c));
  }

  async function addTarefaCliente(clienteId, tarefa) {
    const cliente = clientesRef.current.find((c) => c.id === clienteId);
    if (!cliente) return;
    const newTarefas = [...(cliente.tarefas ?? []), { ...tarefa, id: `t${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }];
    const { error } = await supabase.from('clientes').update({ tarefas: newTarefas }).eq('id', clienteId);
    if (error) { setCrmError(error.message); return; }
    setClientes((prev) => prev.map((c) => c.id === clienteId ? { ...c, tarefas: newTarefas } : c));
  }

  async function toggleTarefaCliente(clienteId, tarefaId) {
    const cliente = clientesRef.current.find((c) => c.id === clienteId);
    if (!cliente) return;
    const newTarefas = (cliente.tarefas ?? []).map((t) =>
      t.id === tarefaId ? { ...t, status: t.status === 'pendente' ? 'concluida' : 'pendente' } : t,
    );
    const { error } = await supabase.from('clientes').update({ tarefas: newTarefas }).eq('id', clienteId);
    if (error) { setCrmError(error.message); return; }
    setClientes((prev) => prev.map((c) => c.id === clienteId ? { ...c, tarefas: newTarefas } : c));
  }

  async function addNPS(clienteId, nps) {
    const cliente = clientesRef.current.find((c) => c.id === clienteId);
    if (!cliente) return;
    const newNps = [...(cliente.npsHistorico ?? []), { ...nps, id: `nps${Date.now()}` }];
    const { error } = await supabase.from('clientes').update({ nps_historico: newNps }).eq('id', clienteId);
    if (error) { setCrmError(error.message); return; }
    setClientes((prev) => prev.map((c) => c.id === clienteId ? { ...c, npsHistorico: newNps } : c));
  }

  /* ── Converter lead em cliente ────────────────────────────────────────────── */

  async function converterLeadEmCliente(leadId) {
    const lead = leadsRef.current.find((l) => l.id === leadId);
    if (!lead || lead.convertido) return null;

    const today = new Date().toISOString().split('T')[0];
    const kickoff = {
      id: `t${Date.now()}`, titulo: 'Fazer reunião de kickoff',
      responsavel: user?.name || 'Admin',
      prazo: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      prioridade: 'Alta', status: 'pendente', automatica: true, createdAt: today,
    };

    const clienteData = {
      empresaNome: lead.company, cnpj: '', contato: lead.contact,
      email: lead.email, telefone: lead.phone, segmento: lead.sector,
      porte: 'Pequena', status: 'ativo', origem: 'convertido_do_pipeline',
      leadId: lead.id, tags: [...(lead.tags ?? [])], prioridade: 'B',
      pedidos: [],
      historico: [{ id:`h${Date.now()}`, data: today, tipo:'anotacao', descricao:`Convertido do pipeline. Valor estimado: R$ ${lead.value?.toLocaleString('pt-BR')}/mês.`, usuario:'Sistema' }],
      ultimoContato: today, proximoContato: null,
      valorTotalGasto: 0, createdAt: today,
      tarefas: [kickoff], npsHistorico: [], npsLembreteDias: 90,
    };

    const clienteRow = clienteToRow(clienteData);
    delete clienteRow.empresa_id;
    delete clienteRow.responsavel_id;

    const { data: cData, error: cErr } = await supabase.from('clientes').insert(clienteRow).select().single();
    if (cErr) { setCrmError(cErr.message); return null; }

    const { error: lErr } = await supabase.from('leads').update({ convertido: true }).eq('id', leadId);
    if (lErr) { setCrmError(lErr.message); }

    const novoCliente = clienteFromRow(cData);
    setClientes((prev) => [...prev, novoCliente]);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, convertido: true } : l));
    return novoCliente;
  }

  /* ── Funil actions (localStorage, unchanged) ──────────────────────────────── */

  function addFunil(funil) {
    if (funis.length >= 10) return;
    setFunis((prev) => [...prev, funil]);
  }
  function updateFunil(funil)      { setFunis((prev) => prev.map((f) => f.id === funil.id ? funil : f)); }
  function deleteFunil(funilId)    { setFunis((prev) => prev.filter((f) => f.id !== funilId)); }
  function reorderFunis(newOrder)  { setFunis(newOrder); }

  /* ── Campo actions (localStorage, unchanged) ──────────────────────────────── */

  function addCampo(funilId, campo) {
    setCampos((prev) => ({
      ...prev,
      [funilId]: [...(prev[funilId] ?? []), { ...campo, id: `cp${ids.current.campo++}` }],
    }));
  }
  function updateCampo(funilId, campo) {
    setCampos((prev) => ({ ...prev, [funilId]: (prev[funilId] ?? []).map((c) => c.id === campo.id ? campo : c) }));
  }
  function deleteCampo(funilId, campoId) {
    setCampos((prev) => ({ ...prev, [funilId]: (prev[funilId] ?? []).filter((c) => c.id !== campoId) }));
  }

  /* ── Derived: filtered leads list ────────────────────────────────────────── */
  const leadsFiltered = filtroLeads === 'meus'
    ? leads.filter((l) => l.responsavelId === user?.id)
    : leads;

  return createElement(CRMContext.Provider, {
    value: {
      // Data
      leads, setLeads, leadsFiltered,
      clientes, setClientes,
      funis, campos,
      // Loading / error
      loadingLeads, loadingClientes, crmError, setCrmError,
      // Filter
      filtroLeads, setFiltroLeads,
      // Lead actions
      addLead, updateLead, deleteLead,
      addAtividade, addTarefaLead, toggleTarefaLead,
      // Cliente actions
      addCliente, updateCliente,
      addTarefaCliente, toggleTarefaCliente, addNPS,
      // Conversion
      converterLeadEmCliente,
      // Funil actions
      addFunil, updateFunil, deleteFunil, reorderFunis,
      // Campo actions
      addCampo, updateCampo, deleteCampo,
    },
  }, children);
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used inside CRMProvider');
  return ctx;
}
