import { createElement, createContext, useContext, useEffect, useRef, useState } from 'react';
import { CLIENTES_MOCK } from '../data/clientes-mock.js';

/* ─── Default funis ──────────────────────────────────────────────────────────── */
export const FUNIS_SEED = [
  {
    id: 'f1', nome: 'Vendas', cor: '#5b6ef5',
    etapas: [
      { id: 'prospeccao',   nome: 'Prospecção',   cor: '#7c8ff7', camposObrigatorios: [],              metaTempoDias: 7   },
      { id: 'qualificacao', nome: 'Qualificação', cor: '#38c9e0', camposObrigatorios: ['email'],       metaTempoDias: 14  },
      { id: 'proposta',     nome: 'Proposta',     cor: '#f0a832', camposObrigatorios: ['email','phone'], metaTempoDias: 21 },
      { id: 'fechamento',   nome: 'Fechamento',   cor: '#b06ef5', camposObrigatorios: [],              metaTempoDias: 7   },
      { id: 'ganho',        nome: 'Ganho',        cor: '#2dd4a0', camposObrigatorios: [],              metaTempoDias: null },
    ],
  },
];

/* Standard field labels used in required-fields validation messages */
export const CAMPO_STD_LABEL = {
  company: 'Empresa', contact: 'Contato', email: 'E-mail',
  phone: 'Telefone', value: 'Valor (R$)', sector: 'Setor', notes: 'Notas',
};

/* ─── Default campos personalizados ─────────────────────────────────────────── */
const CAMPOS_SEED = {
  f1: [
    { id: 'cp1', nome: 'Potencial de Upsell', tipo: 'moeda',    obrigatorio: false, visibilidade: 'lead',  opcoes: [] },
    { id: 'cp2', nome: 'Canal de Origem',     tipo: 'select',   obrigatorio: false, visibilidade: 'ambos', opcoes: ['Indicação','LinkedIn','Google','Instagram','Prospecção Ativa'] },
    { id: 'cp3', nome: 'Tem CNPJ Ativo?',     tipo: 'checkbox', obrigatorio: false, visibilidade: 'lead',  opcoes: [] },
  ],
};

/* ─── Leads seed ─────────────────────────────────────────────────────────────── */
const LEADS_SEED = [
  { id:'l1',  funilId:'f1', col:'prospeccao',   company:'Tech Solutions Ltda',  contact:'Rafael Mendes',  email:'rafael@techsolutions.com',  phone:'(11) 98765-4321', sector:'Software',   tags:['SaaS','B2B'],           value:3800,  daysSinceContact:9,  followUpDate:'2026-05-24', notes:'Interessado em automatizar processo de vendas.',      convertido:false, responsavel:'Admin',         camposPersonalizados:{}, atividades:[{id:'av1',tipo:'ligacao',   descricao:'Ligação de prospecção — demonstrou interesse inicial',      data:'2026-05-14',usuario:'Admin'}],         tarefas:[],         documentos:[] },
  { id:'l2',  funilId:'f1', col:'prospeccao',   company:'Nexus Digital',         contact:'Camila Rocha',   email:'camila@nexusdigital.com',    phone:'(21) 91234-5678', sector:'Marketing',  tags:['Agência','PME'],        value:2200,  daysSinceContact:3,  followUpDate:'2026-05-27', notes:'Precisa de CRM para equipe de 5 pessoas.',            convertido:false, responsavel:'João Vendedor', camposPersonalizados:{}, atividades:[],                                                                                                                                               tarefas:[],         documentos:[] },
  { id:'l3',  funilId:'f1', col:'qualificacao', company:'Inova Saúde',           contact:'Dr. Paulo Lima', email:'paulo@inovasaude.com',       phone:'(31) 97890-1234', sector:'Saúde',      tags:['Clínica','B2C'],        value:5500,  daysSinceContact:1,  followUpDate:'2026-05-29', notes:'Clínica com 3 unidades, quer integrar agenda e CRM.', convertido:false, responsavel:'João Vendedor', camposPersonalizados:{}, atividades:[{id:'av2',tipo:'reuniao',   descricao:'Reunião de qualificação — budget confirmado R$ 5.500/mês', data:'2026-05-22',usuario:'João Vendedor'}], tarefas:[{id:'tl3_1',titulo:'Enviar proposta técnica detalhada',responsavel:'João Vendedor',prazo:'2026-05-28',prioridade:'Alta',  status:'pendente',automatica:false,createdAt:'2026-05-22'}], documentos:[] },
  { id:'l4',  funilId:'f1', col:'qualificacao', company:'Grupo Construfast',     contact:'Fábio Assis',    email:'fabio@construfast.com',      phone:'(41) 99999-0000', sector:'Construção', tags:['Enterprise','B2B'],     value:12000, daysSinceContact:5,  followUpDate:'2026-05-26', notes:'Processo decisório longo, precisa de aprovação do board.',    convertido:false, responsavel:'Admin',         camposPersonalizados:{}, atividades:[],                                                                                                                                               tarefas:[],         documentos:[] },
  { id:'l5',  funilId:'f1', col:'proposta',     company:'Varejo Smart',          contact:'Juliana Costa',  email:'ju@varejosmart.com',         phone:'(11) 95555-3333', sector:'Varejo',     tags:['E-commerce','B2C'],     value:4100,  daysSinceContact:2,  followUpDate:'2026-05-23', notes:'Proposta enviada. Aguardando retorno do financeiro.',  convertido:false, responsavel:'João Vendedor', camposPersonalizados:{}, atividades:[{id:'av3',tipo:'email',     descricao:'Proposta comercial enviada — 3 opções de plano',           data:'2026-05-21',usuario:'João Vendedor'}], tarefas:[],         documentos:[] },
  { id:'l6',  funilId:'f1', col:'proposta',     company:'LogiMais',              contact:'André Souza',    email:'andre@logimais.com.br',      phone:'(19) 98888-7777', sector:'Logística',  tags:['Transporte','B2B'],     value:7300,  daysSinceContact:8,  followUpDate:'2026-05-22', notes:'Follow-up urgente — prazo vencido.',                  convertido:false, responsavel:'Admin',         camposPersonalizados:{}, atividades:[],                                                                                                                                               tarefas:[{id:'tl6_1',titulo:'Ligar urgente — proposta vencendo',   responsavel:'Admin',        prazo:'2026-05-22',prioridade:'Alta',  status:'pendente',automatica:false,createdAt:'2026-05-21'}], documentos:[] },
  { id:'l7',  funilId:'f1', col:'fechamento',   company:'Estudio Criativo Co.',  contact:'Larissa Nunes',  email:'larissa@estudiocriativo.com',phone:'(81) 94444-2222', sector:'Design',     tags:['Agência','PME'],        value:1900,  daysSinceContact:0,  followUpDate:'2026-05-23', notes:'Reunião de fechamento amanhã às 15h.',                convertido:false, responsavel:'João Vendedor', camposPersonalizados:{}, atividades:[],                                                                                                                                               tarefas:[],         documentos:[] },
  { id:'l8',  funilId:'f1', col:'fechamento',   company:'FinanceFlow',           contact:'Bruno Cardoso',  email:'bruno@financeflow.io',       phone:'(11) 93333-1111', sector:'Fintech',    tags:['SaaS','B2B','Startup'], value:9800,  daysSinceContact:4,  followUpDate:'2026-05-25', notes:'Contrato em revisão jurídica.',                       convertido:false, responsavel:'Admin',         camposPersonalizados:{}, atividades:[],                                                                                                                                               tarefas:[],         documentos:[] },
  { id:'l9',  funilId:'f1', col:'ganho',        company:'Escola Aprender+',      contact:'Marcia Alves',   email:'marcia@aprenderplus.com',    phone:'(62) 92222-0000', sector:'Educação',   tags:['EdTech','B2C'],         value:3200,  daysSinceContact:15, followUpDate:null,          notes:'Cliente ativo desde jan/26.',                         convertido:true,  responsavel:'João Vendedor', camposPersonalizados:{}, atividades:[],                                                                                                                                               tarefas:[],         documentos:[] },
  { id:'l10', funilId:'f1', col:'ganho',        company:'Agro Digital',          contact:'Sandro Ramos',   email:'sandro@agrodigital.com.br', phone:'(67) 91111-9999', sector:'Agro',       tags:['Agronegócio','B2B'],    value:6600,  daysSinceContact:20, followUpDate:null,          notes:'Renovação em out/26.',                                convertido:true,  responsavel:'Admin',         camposPersonalizados:{}, atividades:[],                                                                                                                                               tarefas:[],         documentos:[] },
];

/* ─── Clientes seed (extends mock with NPS + tarefas) ───────────────────────── */
const CLIENTES_SEED = CLIENTES_MOCK.map((c) => ({
  ...c,
  tarefas: c.id === 'cl1'
    ? [{ id:'tc1_1', titulo:'Agendar check-in trimestral', responsavel:'João Vendedor', prazo:'2026-06-15', prioridade:'Média', status:'pendente', automatica:false, createdAt:'2026-05-01' }]
    : [],
  npsHistorico: c.id === 'cl1' ? [
    { id:'nps1', pontuacao:8, data:'2026-01-15', comentario:'Produto muito bom, suporte ótimo!'   },
    { id:'nps2', pontuacao:9, data:'2026-03-15', comentario:'Evoluiu muito, muito satisfeita'    },
    { id:'nps3', pontuacao:9, data:'2026-05-15', comentario:'Continua excelente, recomendo!'     },
  ] : c.id === 'cl2' ? [
    { id:'nps4', pontuacao:7, data:'2026-02-01', comentario:'Bom, mas falta API nativa'          },
    { id:'nps5', pontuacao:8, data:'2026-04-20', comentario:'Melhorou após o módulo de KPIs'     },
  ] : c.id === 'cl3' ? [
    { id:'nps6', pontuacao:8, data:'2026-03-20', comentario:'Onboarding muito bem feito'         },
  ] : [],
  npsLembreteDias: 90,
}));

/* ─── localStorage helpers ───────────────────────────────────────────────────── */
const LS_LEADS    = 'crm_leads';
const LS_CLIENTES = 'crm_clientes';
const LS_FUNIS    = 'crm_funis';
const LS_CAMPOS   = 'crm_campos';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ─── Context ─────────────────────────────────────────────────────────────────── */
const CRMContext = createContext(null);

export function CRMProvider({ children }) {
  const [leads,    setLeads]    = useState(() => load(LS_LEADS,    LEADS_SEED));
  const [clientes, setClientes] = useState(() => load(LS_CLIENTES, CLIENTES_SEED));
  const [funis,    setFunis]    = useState(() => load(LS_FUNIS,    FUNIS_SEED));
  const [campos,   setCampos]   = useState(() => load(LS_CAMPOS,   CAMPOS_SEED));
  const ids = useRef({ lead: 11, cliente: CLIENTES_MOCK.length + 1, campo: 4 });

  useEffect(() => { save(LS_LEADS,    leads);    }, [leads]);
  useEffect(() => { save(LS_CLIENTES, clientes); }, [clientes]);
  useEffect(() => { save(LS_FUNIS,    funis);    }, [funis]);
  useEffect(() => { save(LS_CAMPOS,   campos);   }, [campos]);

  /* ── Lead actions ─────────────────────────────────────────────────────────── */

  function addLead(form) {
    setLeads((prev) => [...prev, {
      ...form, id: `l${ids.current.lead++}`,
      daysSinceContact: 0, convertido: false,
      atividades: [], tarefas: [], documentos: [], camposPersonalizados: {},
    }]);
  }

  function updateLead(form) {
    setLeads((prev) => prev.map((l) => l.id === form.id ? { ...l, ...form } : l));
  }

  function deleteLead(id) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  function addAtividade(leadId, atividade) {
    setLeads((prev) => prev.map((l) => l.id === leadId
      ? { ...l, atividades: [...(l.atividades ?? []), { ...atividade, id: `av${Date.now()}` }] }
      : l));
  }

  function addTarefaLead(leadId, tarefa) {
    setLeads((prev) => prev.map((l) => l.id === leadId
      ? { ...l, tarefas: [...(l.tarefas ?? []), { ...tarefa, id: `t${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }] }
      : l));
  }

  function toggleTarefaLead(leadId, tarefaId) {
    setLeads((prev) => prev.map((l) => l.id === leadId
      ? { ...l, tarefas: (l.tarefas ?? []).map((t) => t.id === tarefaId ? { ...t, status: t.status === 'pendente' ? 'concluida' : 'pendente' } : t) }
      : l));
  }

  /* ── Cliente actions ──────────────────────────────────────────────────────── */

  function addCliente(cliente) {
    const novo = {
      ...cliente,
      id: `cl${ids.current.cliente++}`,
      createdAt: new Date().toISOString().split('T')[0],
      pedidos: [], historico: [], valorTotalGasto: 0,
      tarefas: [], npsHistorico: [], npsLembreteDias: 90,
    };
    setClientes((prev) => [...prev, novo]);
    return novo;
  }

  function updateCliente(cliente) {
    setClientes((prev) => prev.map((c) => c.id === cliente.id ? cliente : c));
  }

  function addTarefaCliente(clienteId, tarefa) {
    setClientes((prev) => prev.map((c) => c.id === clienteId
      ? { ...c, tarefas: [...(c.tarefas ?? []), { ...tarefa, id: `t${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }] }
      : c));
  }

  function toggleTarefaCliente(clienteId, tarefaId) {
    setClientes((prev) => prev.map((c) => c.id === clienteId
      ? { ...c, tarefas: (c.tarefas ?? []).map((t) => t.id === tarefaId ? { ...t, status: t.status === 'pendente' ? 'concluida' : 'pendente' } : t) }
      : c));
  }

  function addNPS(clienteId, nps) {
    setClientes((prev) => prev.map((c) => c.id === clienteId
      ? { ...c, npsHistorico: [...(c.npsHistorico ?? []), { ...nps, id: `nps${Date.now()}` }] }
      : c));
  }

  /* ── Converter lead em cliente ────────────────────────────────────────────── */

  function converterLeadEmCliente(leadId) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.convertido) return null;

    const kickoff = {
      id:         `t${Date.now()}`,
      titulo:     'Fazer reunião de kickoff',
      responsavel: lead.responsavel || 'Admin',
      prazo:      new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      prioridade: 'Alta',
      status:     'pendente',
      automatica: true,
      createdAt:  new Date().toISOString().split('T')[0],
    };

    const novoCliente = {
      id:              `cl${ids.current.cliente++}`,
      empresaNome:     lead.company,
      cnpj:            '',
      contato:         lead.contact,
      email:           lead.email,
      telefone:        lead.phone,
      segmento:        lead.sector,
      porte:           'Pequena',
      status:          'ativo',
      origem:          'convertido_do_pipeline',
      leadId:          lead.id,
      tags:            [...(lead.tags ?? [])],
      prioridade:      'B',
      pedidos:         [],
      historico:       [{ id:`h${Date.now()}`, data: new Date().toISOString().split('T')[0], tipo:'anotacao', descricao:`Convertido do pipeline. Valor estimado: R$ ${lead.value.toLocaleString('pt-BR')}/mês.`, usuario:'Sistema' }],
      ultimoContato:   new Date().toISOString().split('T')[0],
      proximoContato:  null,
      valorTotalGasto: 0,
      createdAt:       new Date().toISOString().split('T')[0],
      tarefas:         [kickoff],
      npsHistorico:    [],
      npsLembreteDias: 90,
    };

    setClientes((prev) => [...prev, novoCliente]);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, convertido: true } : l));
    return novoCliente;
  }

  /* ── Funil actions ────────────────────────────────────────────────────────── */

  function addFunil(funil) {
    if (funis.length >= 10) return;
    setFunis((prev) => [...prev, funil]);
  }

  function updateFunil(funil) {
    setFunis((prev) => prev.map((f) => f.id === funil.id ? funil : f));
  }

  function deleteFunil(funilId) {
    setFunis((prev) => prev.filter((f) => f.id !== funilId));
  }

  function reorderFunis(newOrder) {
    setFunis(newOrder);
  }

  /* ── Campo actions ────────────────────────────────────────────────────────── */

  function addCampo(funilId, campo) {
    setCampos((prev) => ({
      ...prev,
      [funilId]: [...(prev[funilId] ?? []), { ...campo, id: `cp${ids.current.campo++}` }],
    }));
  }

  function updateCampo(funilId, campo) {
    setCampos((prev) => ({
      ...prev,
      [funilId]: (prev[funilId] ?? []).map((c) => c.id === campo.id ? campo : c),
    }));
  }

  function deleteCampo(funilId, campoId) {
    setCampos((prev) => ({
      ...prev,
      [funilId]: (prev[funilId] ?? []).filter((c) => c.id !== campoId),
    }));
  }

  return createElement(CRMContext.Provider, {
    value: {
      leads, setLeads, clientes, setClientes, funis, campos,
      addLead, updateLead, deleteLead,
      addAtividade, addTarefaLead, toggleTarefaLead,
      addCliente, updateCliente,
      addTarefaCliente, toggleTarefaCliente, addNPS,
      converterLeadEmCliente,
      addFunil, updateFunil, deleteFunil, reorderFunis,
      addCampo, updateCampo, deleteCampo,
    },
  }, children);
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used inside CRMProvider');
  return ctx;
}
