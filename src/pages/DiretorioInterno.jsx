import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FolderOpen, Folder, Search, Plus, Shield, Eye, EyeOff,
  FileText, Lock, LayoutTemplate, GitBranch, FileSignature,
  CheckCircle2, AlertCircle, Clock, Bot, Copy, ExternalLink,
  ChevronRight, ChevronDown, GripVertical, User, Hash, Zap, X, Sparkles, Send,
  Pencil, Check, Download, History, Tag, Upload,
} from 'lucide-react';
import { useAuth }       from '../store/auth.js';
import { useUI }         from '../store/index.js';
import { useAI }         from '../hooks/useAI.js';
import PermissionGate    from '../components/Auth/PermissionGate.jsx';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';

/* ─── Folder definitions ─────────────────────────────────────────────────────── */
const FOLDERS = [
  { id: 'processos',   label: 'Processos',        Icon: FileText,       color: '--accent2' },
  { id: 'senhas',      label: 'Senhas & Acessos',  Icon: Lock,           color: '--amber'   },
  { id: 'templates',   label: 'Templates',         Icon: LayoutTemplate, color: '--purple'  },
  { id: 'fluxogramas', label: 'Fluxogramas',       Icon: GitBranch,      color: '--teal'    },
  { id: 'contratos',   label: 'Contratos',         Icon: FileSignature,  color: '--green'   },
];

/* ─── SOPs ───────────────────────────────────────────────────────────────────── */
const SOPS = [
  { id: 's1', color: '--accent2', nome: 'Processo de Qualificação de Leads (BANT)',     responsavel: 'Gestor Comercial',  passos: 7,  status: 'ativo',   updatedAt: '15/05/2026', descricao: 'Define os critérios de Budget, Authority, Need e Timeline para qualificar ou descartar leads no pipeline.',            tags: ['Comercial', 'Qualificação'] },
  { id: 's2', color: '--teal',    nome: 'Onboarding de Novos Clientes',                 responsavel: 'Customer Success',  passos: 12, status: 'ativo',   updatedAt: '02/05/2026', descricao: 'Fluxo completo de boas-vindas, configuração da conta e primeira reunião de alinhamento com o novo cliente.',          tags: ['CS', 'Onboarding'] },
  { id: 's3', color: '--amber',   nome: 'Follow-up Pós-Reunião de Demo',                responsavel: 'João Vendedor',     passos: 5,  status: 'revisar', updatedAt: '20/04/2026', descricao: 'Sequência de contatos após demonstração do produto — e-mail, WhatsApp e ligação em 24h, 72h e 7 dias.',              tags: ['Comercial', 'Follow-up'] },
  { id: 's4', color: '--green',   nome: 'Renovação e Upsell Anual',                     responsavel: 'Gestor Comercial',  passos: 8,  status: 'ativo',   updatedAt: '10/05/2026', descricao: 'Processo de renovação 90 dias antes do vencimento com análise de NPS e oportunidades de expansão.',                  tags: ['CS', 'Renovação'] },
  { id: 's5', color: '--red',     nome: 'Gestão de Churn e Cancelamentos',              responsavel: 'Customer Success',  passos: 6,  status: 'revisar', updatedAt: '08/04/2026', descricao: 'Protocolo de ação ao receber sinal de churn: identificação, salvar, NPS e offboarding.',                              tags: ['CS', 'Churn'] },
  { id: 's6', color: '--purple',  nome: 'Prospecção Outbound Semanal',                  responsavel: 'João Vendedor',     passos: 9,  status: 'ativo',   updatedAt: '18/05/2026', descricao: 'Rotina semanal de prospecção: pesquisa de ICP, listas por CNAE, cadência de contatos e registro no CRM.',              tags: ['Comercial', 'Prospecção'] },
];

/* ─── Templates ──────────────────────────────────────────────────────────────── */
const TEMPLATES = [
  { id: 't1', color: '--accent2', nome: 'Proposta Comercial Padrão',           versao: 'v3.2', updatedAt: '12/05/2026', status: 'atual',   formato: 'Google Docs',      uso: 47,  descricao: 'Template de proposta com precificação, escopo, prazo e cases de sucesso.', tags: ['Proposta', 'Comercial'] },
  { id: 't2', color: '--purple',  nome: 'E-mail de Prospecção Fria',           versao: 'v2.1', updatedAt: '08/05/2026', status: 'atual',   formato: 'Gmail Template',   uso: 134, descricao: 'Sequência de 3 e-mails para primeiro contato outbound — curto, direto e com CTA claro.', tags: ['E-mail', 'Outbound'] },
  { id: 't3', color: '--teal',    nome: 'Follow-up Pós Demo',                  versao: 'v1.8', updatedAt: '22/04/2026', status: 'revisar', formato: 'WhatsApp + E-mail', uso: 89,  descricao: 'Mensagens de follow-up em 24h, 72h e 7 dias após demonstração do produto.', tags: ['Follow-up', 'Demo'] },
  { id: 't4', color: '--green',   nome: 'Apresentação Institucional',          versao: 'v4.0', updatedAt: '01/05/2026', status: 'atual',   formato: 'Google Slides',    uso: 23,  descricao: 'Deck de 15 slides com pitch, diferenciais, cases e próximos passos.', tags: ['Apresentação', 'Pitch'] },
  { id: 't5', color: '--amber',   nome: 'Contrato de Prestação de Serviços',  versao: 'v2.0', updatedAt: '15/03/2026', status: 'revisar', formato: 'Google Docs',      uso: 31,  descricao: 'Minuta jurídica padrão com cláusulas de SLA, confidencialidade e rescisão.', tags: ['Jurídico', 'Contrato'] },
  { id: 't6', color: '--red',     nome: 'NPS & Pesquisa de Satisfação',       versao: 'v1.3', updatedAt: '10/04/2026', status: 'atual',   formato: 'Google Forms',     uso: 56,  descricao: 'Formulário de NPS trimestral com perguntas abertas e escala 0–10.', tags: ['CS', 'Pesquisa'] },
];

const SENHAS = [
  { id: 'pw1', plataforma: 'HubSpot CRM',    icone: '🟠', usuario: 'admin@empresa.com',    senha: 'Hs!k9#mPqR', categoria: 'CRM'          },
  { id: 'pw2', plataforma: 'Hunter.io',       icone: '🔵', usuario: 'comercial@empresa.com', senha: 'Hn$42xVbWz', categoria: 'Prospecção'   },
  { id: 'pw3', plataforma: 'Google Analytics',icone: '🟡', usuario: 'mkt@empresa.com',       senha: 'Ga&78nLpKs', categoria: 'Marketing'    },
  { id: 'pw4', plataforma: 'Notion',          icone: '⚫', usuario: 'equipe@empresa.com',    senha: 'Nt!33rFgMn', categoria: 'Produtividade' },
  { id: 'pw5', plataforma: 'Apollo.io',       icone: '🔵', usuario: 'leads@empresa.com',     senha: 'Ap#91wQhTj', categoria: 'Prospecção'   },
  { id: 'pw6', plataforma: 'RD Station',      icone: '🟢', usuario: 'mkt@empresa.com',       senha: 'Rd@56uYcBe', categoria: 'Marketing'    },
];

const FLUXOGRAMAS = [
  { id: 'fl1', nome: 'Funil de Vendas Completo', color: '--teal', updatedAt: '14/05/2026', status: 'ativo',   descricao: 'Funil do lead ao cliente com pontos de decisão e SLAs por etapa.' },
  { id: 'fl2', nome: 'Processo de Onboarding',   color: '--teal', updatedAt: '03/05/2026', status: 'ativo',   descricao: 'Jornada do novo cliente da assinatura ao go-live.' },
  { id: 'fl3', nome: 'Fluxo de Churn Recovery',  color: '--teal', updatedAt: '20/04/2026', status: 'revisar', descricao: 'Árvore de decisão para acionamento em caso de sinal de churn.' },
];

const CONTRATOS = [
  { id: 'c1', nome: 'Contrato Padrão B2B',              color: '--green', versao: 'v2.1', updatedAt: '10/05/2026', status: 'ativo',   partes: 'Empresa ↔ Clientes PJ',   descricao: 'Contrato padrão para prestação de serviços a pessoas jurídicas com cláusulas de SLA e confidencialidade.' },
  { id: 'c2', nome: 'NDA — Acordo de Confidencialidade', color: '--green', versao: 'v1.0', updatedAt: '01/03/2026', status: 'ativo',   partes: 'Empresa ↔ Parceiros',     descricao: 'Acordo de não divulgação para parceiros comerciais e fornecedores estratégicos.' },
  { id: 'c3', nome: 'Contrato de Parceria Comercial',   color: '--green', versao: 'v1.2', updatedAt: '18/04/2026', status: 'revisar', partes: 'Empresa ↔ Revendedores',  descricao: 'Contrato de parceria para revendedores com comissionamento, metas e exclusividades.' },
];

const COUNTS = { processos: SOPS.length, senhas: SENHAS.length, templates: TEMPLATES.length, fluxogramas: FLUXOGRAMAS.length, contratos: CONTRATOS.length };
const MASKED = '••••••••';

/* ─── Custom folder constants ────────────────────────────────────────────── */
const EMOJI_OPTIONS = [
  '📁','📂','📄','📝','🗂','📑','📋','🗃','📊','📈',
  '💡','🔑','🔒','🎯','⭐','🚀','💼','🏆','📌','🔖',
  '💰','🤝','📞','✉️','🔔','⚙️','🛠','📡','🌐','🎨',
  '📚','💎','🌟','🔧','🎓',
];

let _cfId = 1000;
function newCfId() { return `cf${_cfId++}`; }

const INITIAL_CUSTOM_FOLDERS = [
  {
    id: 'cf_recursos_guia',
    emoji: '📚',
    nome: 'Recursos do Guia',
    children: [],
    shortcuts: [
      { id: 'sh1', label: 'SWOT',         route: '/diagnostico', emoji: '📊' },
      { id: 'sh2', label: 'Personas',     route: '/diagnostico', emoji: '👤' },
      { id: 'sh3', label: 'Funil',        route: '/crm',         emoji: '📈' },
      { id: 'sh4', label: 'Metas',        route: '/kpis',        emoji: '🎯' },
      { id: 'sh5', label: 'Concorrentes', route: '/diagnostico', emoji: '⚔️' },
    ],
  },
];

/* ─── Custom folder tree helpers ─────────────────────────────────────────── */
function findInTree(folders, id) {
  for (const f of folders) {
    if (f.id === id) return f;
    const found = findInTree(f.children || [], id);
    if (found) return found;
  }
  return null;
}

function updateInTree(folders, id, updater) {
  return folders.map(f => {
    if (f.id === id) return updater(f);
    if (f.children?.length) return { ...f, children: updateInTree(f.children, id, updater) };
    return f;
  });
}

function deleteFromTree(folders, id) {
  return folders
    .filter(f => f.id !== id)
    .map(f => ({ ...f, children: deleteFromTree(f.children || [], id) }));
}

function addChildToTree(folders, parentId, child) {
  return folders.map(f => {
    if (f.id === parentId) return { ...f, children: [...(f.children || []), child] };
    if (f.children?.length) return { ...f, children: addChildToTree(f.children, parentId, child) };
    return f;
  });
}

/* ─── File upload constants & helpers ──────────────────────────────────── */
const ACCEPTED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const FILE_TYPE_CFG = {
  'image/jpeg':  { label: 'JPG',  color: 'var(--green)', isImage: true  },
  'image/png':   { label: 'PNG',  color: 'var(--green)', isImage: true  },
  'image/gif':   { label: 'GIF',  color: 'var(--green)', isImage: true  },
  'image/svg+xml':{ label: 'SVG', color: 'var(--green)', isImage: true  },
  'image/webp':  { label: 'WEBP', color: 'var(--green)', isImage: true  },
  'application/pdf': { label: 'PDF',  color: 'var(--red)',    isImage: false },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', color: 'var(--accent)', isImage: false },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':       { label: 'XLSX', color: 'var(--green)',  isImage: false },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':{ label: 'PPTX', color: 'var(--amber)', isImage: false },
};

let _fileId = 2000;
function newFileId() { return `fil${_fileId++}`; }

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtUploadDate(iso) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function useFilesForFolder(folderId) {
  const key = `dir_files_${folderId}`;
  const [files, setFiles] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(files)); } catch {}
  }, [files, key]);

  async function addFiles(fileList) {
    const toAdd = [];
    for (const file of Array.from(fileList)) {
      if (!ACCEPTED_MIME.includes(file.type)) continue;
      try {
        const data = await readFileAsBase64(file);
        toAdd.push({
          id: newFileId(),
          name: file.name,
          mimeType: file.type,
          ext: file.name.split('.').pop().toLowerCase(),
          size: file.size,
          data,
          uploadedAt: new Date().toISOString(),
          tags: [],
        });
      } catch {}
    }
    if (toAdd.length) setFiles(prev => [...prev, ...toAdd]);
  }

  function removeFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  function updateFileTags(id, tags) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, tags } : f));
  }

  return { files, addFiles, removeFile, updateFileTags };
}

/* ─── Permissions & global search ──────────────────────────────────────── */
const ALL_ROLES = [
  { id: 'admin',        label: 'Administrador'    },
  { id: 'gestor',       label: 'Gestor Comercial' },
  { id: 'vendedor',     label: 'Vendedor'         },
  { id: 'marketing',    label: 'Marketing'        },
  { id: 'visualizador', label: 'Visualizador'     },
];

const MOCK_USERS_LIST = [
  { id: 'u1', name: 'Douglas Admin',    role: 'admin'        },
  { id: 'u2', name: 'Gestor Comercial', role: 'gestor'       },
  { id: 'u3', name: 'João Vendedor',    role: 'vendedor'     },
  { id: 'u4', name: 'Maria Marketing',  role: 'marketing'    },
  { id: 'u5', name: 'Carlos Diretor',   role: 'visualizador' },
];

const DIR_PERM_DEFAULTS = {
  senhas: { type: 'roles', roles: ['admin'] },
};

function useFolderPermissions() {
  const [perms, setPerms] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('dir_folder_permissions'));
      return saved ? { ...DIR_PERM_DEFAULTS, ...saved } : { ...DIR_PERM_DEFAULTS };
    } catch { return { ...DIR_PERM_DEFAULTS }; }
  });
  useEffect(() => {
    try { localStorage.setItem('dir_folder_permissions', JSON.stringify(perms)); } catch {}
  }, [perms]);

  function setPermission(folderId, perm) {
    setPerms(prev => ({ ...prev, [folderId]: perm }));
  }

  function canAccess(folderId, user) {
    const perm = perms[folderId];
    if (!perm || perm.type === 'all') return true;
    if (!user) return false;
    if (perm.type === 'roles') return perm.roles.includes(user.role);
    if (perm.type === 'users') return perm.users.includes(user.id);
    return true;
  }

  function isRestricted(folderId) {
    const p = perms[folderId];
    return !!(p && p.type !== 'all');
  }

  return { perms, setPermission, canAccess, isRestricted };
}

function getAllFolderIds(folders) {
  const ids = [];
  for (const f of folders) {
    ids.push(f.id);
    if (f.children?.length) ids.push(...getAllFolderIds(f.children));
  }
  return ids;
}

function readFolderFiles(folderId) {
  try { return JSON.parse(localStorage.getItem(`dir_files_${folderId}`)) || []; } catch { return []; }
}

function highlightText(text, term) {
  if (!term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(91,110,245,0.28)', color: 'var(--accent2)', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}

/* ─── Rich document content ──────────────────────────────────────────────────── */
const DOC_CONTENT = {
  /* SOP: Prospecção Outbound Semanal */
  s6: {
    type: 'sop',
    steps: [
      { n: 1, title: 'Definição do foco da semana', responsavel: 'Gestor Comercial', prazo: 'Segunda — 9h', body: 'Reunião de 15 min com o vendedor para definir o segmento-alvo (CNAE, porte, região). Priorizar segmentos com maior taxa histórica de conversão. Registrar decisão no canal #comercial do Slack.' },
      { n: 2, title: 'Pesquisa de empresas por CNAE', responsavel: 'João Vendedor', prazo: 'Segunda — até 12h', body: 'Acessar o módulo Prospecção Ativa e buscar pelo CNAE definido. Filtrar por UF, porte (ME/EPP prioritários) e capital social mínimo de R$ 100k. Meta: montar lista de 30–50 empresas qualificadas.' },
      { n: 3, title: 'Qualificação inicial da lista', responsavel: 'João Vendedor', prazo: 'Segunda — tarde', body: 'Visitar o site de cada empresa para confirmar: empresa ativa, produto/serviço relevante, aparente capacidade de pagamento. Descartar as que não se encaixam no ICP. Reduzir lista para 15–25 empresas.' },
      { n: 4, title: 'Enriquecimento de dados via Hunter.io', responsavel: 'João Vendedor', prazo: 'Terça — 9h–12h', body: 'Para cada domínio da lista, executar busca no Hunter.io (aba Prospecção Ativa → Enriquecer). Capturar: e-mail do decisor, cargo, score de confiança. Priorizar e-mails com score > 70.' },
      { n: 5, title: 'Verificação de contatos via Apollo.io', responsavel: 'João Vendedor', prazo: 'Terça — tarde', body: 'Complementar com Apollo.io para empresas sem e-mail encontrado no Hunter. Capturar LinkedIn e telefone quando disponível. Registrar contato principal no CRM com tag "outbound-[semana]".' },
      { n: 6, title: 'Personalização das mensagens', responsavel: 'João Vendedor', prazo: 'Quarta — 9h–11h', body: 'Abrir o template "E-mail de Prospecção Fria" e personalizar para cada segmento. Substituir [empresa], [setor], [dor específica]. Criar variações A/B para testar linha de assunto. Nunca usar o template genérico sem personalização.' },
      { n: 7, title: 'Disparo da cadência de e-mails', responsavel: 'João Vendedor', prazo: 'Quarta — 11h–13h', body: 'Enviar e-mail 1 para toda a lista via Gmail. Agendar e-mail 2 (follow-up) para D+3 e e-mail 3 para D+7 na ferramenta de sequências. Registrar data de envio no CRM.' },
      { n: 8, title: 'Outreach via LinkedIn e WhatsApp', responsavel: 'João Vendedor', prazo: 'Quinta', body: 'Para os 10 leads com maior score: enviar conexão + mensagem personalizada no LinkedIn (máx 300 caracteres, sem pitch imediato). Para leads com telefone verificado: WhatsApp com apresentação breve e CTA de 15 min.' },
      { n: 9, title: 'Registro, relatório e handoff', responsavel: 'João Vendedor', prazo: 'Sexta — até 17h', body: 'Atualizar status de todos os leads no CRM (respondeu, agendou, ignorou, descartou). Mover leads com interesse para coluna "Qualificação". Enviar relatório semanal de prospecção no #comercial: empresas contatadas, taxa de resposta, reuniões agendadas.' },
    ],
    rawText: `1. Definição do foco da semana — Segunda 9h\nDefinir segmento-alvo com o gestor.\n\n2. Pesquisa de empresas por CNAE — Segunda até 12h\nBuscar 30-50 empresas no módulo Prospecção Ativa.\n\n3. Qualificação inicial da lista — Segunda tarde\nReduzir para 15-25 empresas alinhadas ao ICP.\n\n4. Enriquecimento via Hunter.io — Terça manhã\nCapturar e-mails com score > 70.\n\n5. Verificação via Apollo.io — Terça tarde\nComplementar com LinkedIn e telefone.\n\n6. Personalização das mensagens — Quarta manhã\nAdaptar template "E-mail de Prospecção Fria".\n\n7. Disparo da cadência — Quarta 11h-13h\nEnviar e agendar sequência completa.\n\n8. Outreach LinkedIn e WhatsApp — Quinta\nAbordar os 10 leads de maior score.\n\n9. Registro e relatório — Sexta até 17h\nAtualizar CRM e enviar relatório semanal.`,
  },

  /* SOP: Onboarding de Novos Clientes */
  s2: {
    type: 'sop',
    steps: [
      { n: 1,  title: 'Confirmação de contrato e boas-vindas',     responsavel: 'CS',            prazo: 'D+0',       body: 'Ao receber cópia assinada do contrato: enviar e-mail de boas-vindas com nome do CS responsável, cronograma do onboarding e próximos passos. Adicionar cliente ao Notion e criar card no CRM na coluna "Onboarding".' },
      { n: 2,  title: 'Envio do questionário de onboarding',        responsavel: 'CS',            prazo: 'D+1',       body: 'Enviar Google Form com perguntas sobre: número de usuários, processos atuais, sistemas integrados, principal dor a resolver. Prazo de resposta: 48h. Follow-up automático em 24h se não respondido.' },
      { n: 3,  title: 'Kickoff call de alinhamento',                responsavel: 'CS + Cliente',  prazo: 'D+3',       body: 'Reunião de 60 min via Google Meet. Agenda: apresentação das equipes, validação dos objetivos, definição de KPIs de sucesso, cronograma detalhado, dúvidas gerais. Gravar e enviar link da gravação em até 2h.' },
      { n: 4,  title: 'Configuração técnica da plataforma',         responsavel: 'CS',            prazo: 'D+4–5',     body: 'Configurar conta do cliente: personalização de domínio, upload de logo, configuração de pipeline conforme processo do cliente, importação de base de leads (se houver). Validar integrações (e-mail, WhatsApp, CRM anterior).' },
      { n: 5,  title: 'Criação de usuários e permissões',           responsavel: 'CS',            prazo: 'D+5',       body: 'Criar login para todos os usuários listados no formulário. Configurar perfis de acesso (Admin, Gestor, Vendedor). Enviar convites por e-mail com senha temporária e link para tutorial de primeiro acesso.' },
      { n: 6,  title: 'Treinamento básico da equipe',               responsavel: 'CS',            prazo: 'D+7',       body: 'Sessão de 90 min: navegação na plataforma, cadastro de leads, uso do pipeline, registro de atividades, geração de relatórios básicos. Compartilhar gravação e material de apoio (PDF + vídeos).' },
      { n: 7,  title: 'Treinamento avançado e customizações',       responsavel: 'CS',            prazo: 'D+10',      body: 'Sessão de 60 min com foco no gestor: automações de fluxo, templates de mensagem, configuração de alertas, dashboards personalizados. Configurar as automações solicitadas durante o kickoff.' },
      { n: 8,  title: 'Check-in de 2 semanas',                      responsavel: 'CS',            prazo: 'D+14',      body: 'Reunião de 30 min: verificar adoção da plataforma (% de usuários ativos, leads cadastrados, atividades registradas). Identificar bloqueios e resolver dúvidas. Registrar NPS informal.' },
      { n: 9,  title: 'Definição de KPIs e metas de sucesso',       responsavel: 'CS + Cliente',  prazo: 'D+14',      body: 'Formalizar junto ao cliente: quais métricas definem sucesso do projeto? (Ex: aumento de X% na taxa de conversão, redução de Y% no CAC). Documentar no Notion e revisar trimestralmente.' },
      { n: 10, title: 'Check-in de 3 semanas',                      responsavel: 'CS',            prazo: 'D+21',      body: 'Verificar evolução dos KPIs. Apresentar primeiros insights do uso. Coletar feedback sobre a ferramenta e suporte. Ajustar configurações se necessário.' },
      { n: 11, title: 'Handoff para suporte regular',               responsavel: 'CS + Suporte',  prazo: 'D+25',      body: 'Briefing interno: repassar histórico do cliente, customizações realizadas, pontos de atenção, nível de satisfação. Apresentar o cliente ao time de suporte por e-mail. CS continua como ponto de escalação.' },
      { n: 12, title: 'Revisão de 30 dias e plano de expansão',    responsavel: 'CS + Gestor',   prazo: 'D+30',      body: 'Reunião de 45 min: apresentar dashboard de resultados do primeiro mês, avaliar atingimento dos KPIs, identificar oportunidades de upsell (mais usuários, módulos adicionais). Encaminhar para renovação/expansão se NPS ≥ 8.' },
    ],
    rawText: `1. Confirmação e boas-vindas (D+0)\n2. Questionário de onboarding (D+1)\n3. Kickoff call 60min (D+3)\n4. Configuração técnica (D+4-5)\n5. Usuários e permissões (D+5)\n6. Treinamento básico 90min (D+7)\n7. Treinamento avançado 60min (D+10)\n8. Check-in 2 semanas (D+14)\n9. Definição de KPIs (D+14)\n10. Check-in 3 semanas (D+21)\n11. Handoff para suporte (D+25)\n12. Revisão 30 dias + expansão (D+30)`,
  },

  /* Template: Proposta Comercial */
  t1: {
    type: 'template',
    sections: [
      { title: '1. Apresentação', body: 'Olá, [nome do contato],\n\nObrigado pela oportunidade de apresentar nossa solução para [empresa do cliente]. Somos a [sua empresa], especialistas em [nicho], e ajudamos empresas como a sua a [principal resultado entregue].\n\nEsta proposta foi elaborada com base na nossa conversa de [data] e reflete as necessidades específicas que você compartilhou.' },
      { title: '2. Diagnóstico da situação atual', body: 'Com base no que discutimos, identificamos os seguintes desafios em [empresa do cliente]:\n\n• [Dor 1 específica do cliente]\n• [Dor 2 — use as palavras exatas que o cliente usou]\n• [Dor 3 — impacto financeiro ou operacional]\n\nEstes pontos impactam diretamente [resultado de negócio afetado].' },
      { title: '3. Nossa solução', body: 'Para resolver estes desafios, propomos a implementação de [nome do produto/serviço], que irá:\n\n✓ [Benefício 1 — conectado à dor 1]\n✓ [Benefício 2 — conectado à dor 2]\n✓ [Benefício 3 — resultado mensurável]\n\nEm [prazo realista], você poderá [resultado esperado concreto, ex: reduzir o CAC em 20% e aumentar a taxa de conversão para 30%].' },
      { title: '4. Escopo e entregáveis', body: 'O que está incluído nesta proposta:\n\n□ Configuração e personalização da plataforma\n□ Importação da base de dados atual\n□ Treinamento da equipe (até [N] usuários)\n□ [N] horas de consultoria de implementação\n□ Suporte prioritário por [período]\n□ Relatórios mensais de performance\n\nO que NÃO está incluído: [listar exclusões para evitar mal-entendidos].' },
      { title: '5. Investimento', body: 'Plano recomendado: [nome do plano]\n\nMensalidade: R$ [valor]/mês\nSetup (único): R$ [valor]\n\nFormas de pagamento:\n• Mensal: R$ [valor]\n• Anual (15% desconto): R$ [valor]/mês — economia de R$ [total]\n\n⚡ Condição especial válida até [data]: [benefício adicional — ex: 2 meses grátis, treinamento gratuito].' },
      { title: '6. Cronograma de implementação', body: 'Semana 1: Kickoff + configuração técnica\nSemana 2: Treinamento da equipe\nSemana 3: Go-live + acompanhamento intensivo\nSemana 4–8: Suporte e ajustes finos\nMês 3: Revisão de resultados e expansão\n\nData prevista de início: [data] — sujeita à confirmação desta proposta até [prazo].' },
      { title: '7. Cases de sucesso', body: 'Empresas similares que já transformaram seus resultados:\n\n📈 [Empresa similar 1]\n"[Depoimento breve e específico]"\nResultado: [métrica concreta, ex: +47% na taxa de conversão em 3 meses]\n\n📈 [Empresa similar 2]\nResultado: [CAC reduziu de R$ X para R$ Y]\n\nVeja mais cases em: [link para página de cases]' },
      { title: '8. Garantias e SLA', body: 'Nossa garantia:\n✓ Uptime de 99,9% (SLA contratual)\n✓ Suporte em até [N]h úteis\n✓ Garantia de satisfação de 30 dias\n✓ Dados exportáveis a qualquer momento\n✓ Sem fidelidade obrigatória (planos mensais)' },
      { title: '9. Próximos passos', body: 'Para dar início à parceria:\n\n1️⃣ Confirme o aceite desta proposta até [data]\n2️⃣ Assine o contrato (enviaremos por DocuSign)\n3️⃣ Realize o pagamento do setup\n4️⃣ Agendamos o kickoff\n\nDúvidas? Me ligue ou escreva:\n📱 [telefone]\n✉️ [email]\n\nFico à disposição para ajustar qualquer ponto desta proposta.' },
    ],
    rawText: `1. Apresentação\n2. Diagnóstico\n3. Nossa solução\n4. Escopo e entregáveis\n5. Investimento\n6. Cronograma\n7. Cases de sucesso\n8. Garantias e SLA\n9. Próximos passos`,
  },
};

const FAKE_VERSIONS = [
  { v: 'v3.2', date: '12/05/2026', author: 'Douglas Admin',     change: 'Adicionada seção de garantias e SLA' },
  { v: 'v3.1', date: '03/05/2026', author: 'Gestor Comercial',  change: 'Atualização dos cases de sucesso' },
  { v: 'v3.0', date: '15/04/2026', author: 'Douglas Admin',     change: 'Reestruturação completa do template' },
  { v: 'v2.5', date: '10/03/2026', author: 'João Vendedor',     change: 'Ajuste na tabela de preços' },
];

const AI_CHIPS = {
  sop:        ['Melhorar este processo', 'Identificar gaps', 'Simplificar os passos', 'Criar checklist'],
  template:   ['Tornar mais persuasivo', 'Revisar tom de voz', 'Adicionar seção', 'Versão mais curta'],
  fluxograma: ['Identificar gargalos',   'Otimizar este fluxo', 'Sugerir melhorias'],
  contrato:   ['Revisar cláusulas',      'Simplificar linguagem', 'Identificar riscos'],
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  ativo:   { color: 'var(--green)',  bg: 'rgba(45,212,160,0.1)',  border: 'rgba(45,212,160,0.25)',  label: 'Ativo'   },
  atual:   { color: 'var(--green)',  bg: 'rgba(45,212,160,0.1)',  border: 'rgba(45,212,160,0.25)',  label: 'Atual'   },
  revisar: { color: 'var(--amber)',  bg: 'rgba(240,168,50,0.1)',  border: 'rgba(240,168,50,0.25)',  label: 'Revisar' },
};

function StatusBadge({ status }) {
  const cfg  = STATUS_CFG[status] ?? STATUS_CFG.ativo;
  const Icon = status === 'revisar' ? AlertCircle : CheckCircle2;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <Icon size={9} />{cfg.label}
    </span>
  );
}

function TagChip({ label }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)' }}>
      {label}
    </span>
  );
}

function MetaItem({ icon: Icon, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Icon size={10} style={{ color: color ? `var(${color})` : 'var(--text3)', flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: color ? `var(${color})` : 'var(--text3)' }}>{label}</span>
    </div>
  );
}

/* ─── Password reveal cell ───────────────────────────────────────────────────── */
function PasswordCell({ senha }) {
  const [revealed, setRevealed] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const timerRef = useRef(null);

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(false), 3000);
  }

  async function copy(e) {
    e.stopPropagation();
    await navigator.clipboard.writeText(senha).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span onClick={reveal} title={revealed ? '' : 'Clique para revelar por 3s'} style={{ fontFamily: revealed ? 'var(--font-body)' : 'monospace', fontSize: 12, color: revealed ? 'var(--text)' : 'var(--text3)', cursor: revealed ? 'default' : 'pointer', letterSpacing: revealed ? 'normal' : '0.1em', userSelect: revealed ? 'text' : 'none', transition: 'color 0.2s' }}>
        {revealed ? senha : MASKED}
      </span>
      <button onClick={reveal} title={revealed ? 'Ocultando em breve…' : 'Revelar'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }}>
        {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      {revealed && (
        <button onClick={copy} title="Copiar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text3)', padding: 2, display: 'flex' }}>
          <Copy size={12} />
        </button>
      )}
    </div>
  );
}

/* ─── Inline AI Chat Panel ───────────────────────────────────────────────────── */
function InlineAIPanel({ doc, docType }) {
  const chips    = AI_CHIPS[docType] ?? AI_CHIPS.sop;
  const context  = `Documento aberto: "${doc.nome}". Descrição: ${doc.descricao}. ${doc.responsavel ? `Responsável: ${doc.responsavel}.` : ''} ${doc.passos ? `${doc.passos} passos.` : ''} ${doc.versao ? `Versão: ${doc.versao}.` : ''} Auxilie com sugestões práticas para melhorar ou usar este documento.`;

  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const { send, loading, error } = useAI();
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function resizeTA(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; }

  const handleSend = useCallback(async (override) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    const history = messages;
    setMessages((p) => [...p, { role: 'user', content: text }]);
    const reply = await send(text, context, history);
    if (reply) setMessages((p) => [...p, { role: 'assistant', content: reply }]);
  }, [input, loading, messages, context, send]);

  const canSend = input.trim().length > 0 && !loading;

  const btnStyle = (active) => ({
    background: active ? 'var(--accent)' : 'var(--bg4)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 6, padding: '5px 10px',
    color: active ? '#fff' : 'var(--text3)',
    fontSize: 11, cursor: active ? 'pointer' : 'default',
    fontFamily: 'var(--font-body)',
    transition: 'background 0.13s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid var(--border)', background: 'var(--bg3)' }}>
      {/* Header */}
      <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
        <Sparkles size={13} style={{ color: 'var(--accent2)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Assistente IA</span>
        <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto', background: 'var(--bg4)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 20 }}>
          contexto carregado
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && !loading && (
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginBottom: 10 }}>
              O assistente conhece o conteúdo deste documento.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {chips.map((chip) => (
                <button key={chip} onClick={() => handleSend(chip)} style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text2)', fontSize: 12, padding: '8px 11px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'background 0.13s, color 0.13s, border-color 0.13s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-bg)'; e.currentTarget.style.color = 'var(--accent2)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '88%', padding: '8px 11px', borderRadius: isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: isUser ? 'var(--accent-bg)' : 'var(--bg2)', color: isUser ? 'var(--accent2)' : 'var(--text)', fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: `1px solid ${isUser ? 'rgba(91,110,245,0.2)' : 'var(--border)'}` }}>
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '9px 12px', borderRadius: '12px 12px 12px 3px', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 0.2, 0.4].map((d) => (
                <span key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text3)', display: 'inline-block', animation: `bounce-dot 1.2s ease-in-out ${d}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '8px 11px', borderRadius: 7, background: 'rgba(240,92,92,0.08)', border: '1px solid rgba(240,92,92,0.2)', color: 'var(--red)', fontSize: 11 }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            placeholder="Pergunte sobre este documento…"
            onChange={(e) => { setInput(e.target.value); resizeTA(e.target); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', resize: 'none', lineHeight: 1.5, maxHeight: 100, overflow: 'auto' }}
          />
          <button onClick={() => handleSend()} disabled={!canSend} style={btnStyle(canSend)}>
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Document body renderers ────────────────────────────────────────────────── */
function StepCard({ step, color }) {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `color-mix(in srgb, var(${color}) 15%, transparent)`, border: `2px solid var(${color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: `var(${color})`, flexShrink: 0 }}>
          {step.n}
        </div>
        <div style={{ flex: 1, width: 1, background: 'var(--border)', margin: '4px 0' }} />
      </div>
      <div style={{ flex: 1, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{step.title}</p>
          {step.prazo && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)', flexShrink: 0 }}>
              {step.prazo}
            </span>
          )}
        </div>
        {step.responsavel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <User size={10} style={{ color: 'var(--text3)' }} />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{step.responsavel}</span>
          </div>
        )}
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{step.body}</p>
      </div>
    </div>
  );
}

function TemplateSectionBlock({ section }) {
  return (
    <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{section.title}</p>
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{section.body}</p>
    </div>
  );
}

function DocBody({ doc, docType }) {
  if (docType === 'guia_doc') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(91,110,245,0.12)', color: 'var(--accent2)', border: '1px solid rgba(91,110,245,0.25)' }}>
            📖 Criado pelo Guia Estratégico
          </span>
          {doc.createdAt && (
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              {(() => { const d = new Date(doc.createdAt); return isNaN(d) ? '' : `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`; })()}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{doc.content}</p>
      </div>
    );
  }

  const content = DOC_CONTENT[doc.id];

  if (!content) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{doc.descricao}</p>
        <div style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
            Conteúdo detalhado não disponível. Use o <strong style={{ color: 'var(--accent2)' }}>Assistente IA</strong> ao lado para gerar ou completar este documento com base na descrição acima.
          </p>
        </div>
      </div>
    );
  }

  if (content.type === 'sop' && content.steps) {
    const color = doc.color ?? '--accent2';
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>{doc.descricao}</p>
        {content.steps.map((step) => <StepCard key={step.n} step={step} color={color} />)}
      </div>
    );
  }

  if (content.type === 'template' && content.sections) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(91,110,245,0.06)', border: '1px solid rgba(91,110,245,0.15)' }}>
          <p style={{ fontSize: 11, color: 'var(--accent2)' }}>💡 Substitua os textos entre <strong>[colchetes]</strong> pelos dados reais do seu cliente antes de enviar.</p>
        </div>
        {content.sections.map((s, i) => <TemplateSectionBlock key={i} section={s} />)}
      </div>
    );
  }

  return <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{content.rawText ?? doc.descricao}</p>;
}

/* ─── Document Modal ─────────────────────────────────────────────────────────── */
function DocModal({ doc, docType, folderColor, onClose }) {
  const color   = doc.color ?? (docType === 'guia_doc' ? '--accent' : folderColor) ?? '--accent2';
  const content = docType === 'guia_doc' ? null : DOC_CONTENT[doc.id];

  const [editing,     setEditing]     = useState(false);
  const [editText,    setEditText]    = useState(content?.rawText ?? doc.descricao ?? '');
  const [showHistory, setShowHistory] = useState(false);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Escape to close
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const iconMap = { sop: FileText, template: LayoutTemplate, fluxograma: GitBranch, contrato: FileSignature };
  const DocIcon = iconMap[docType] ?? FileText;

  const actionBtn = (onClick, children, active) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, background: active ? 'var(--accent-bg)' : 'var(--bg4)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 7, padding: '6px 11px', color: active ? 'var(--accent2)' : 'var(--text2)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 0.13s, border-color 0.13s' }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border2)'; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.borderColor = 'var(--border)'; } }}
    >
      {children}
    </button>
  );

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 400 }} />

      {/* Modal box */}
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '85vw', height: '85vh', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, zIndex: 401, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Modal header ── */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {/* Icon */}
          <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: `color-mix(in srgb, var(${color}) 12%, transparent)`, border: `1px solid color-mix(in srgb, var(${color}) 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DocIcon size={17} style={{ color: `var(${color})` }} />
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.nome ?? doc.title}</p>
              {doc.status && <StatusBadge status={doc.status} />}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {doc.responsavel && <MetaItem icon={User}  label={doc.responsavel} />}
              {doc.updatedAt   && <MetaItem icon={Clock} label={`Atualizado ${doc.updatedAt}`} />}
              {doc.passos      && <MetaItem icon={Hash}  label={`${doc.passos} passos`} />}
              {doc.versao      && <MetaItem icon={Tag}   label={doc.versao} color={color} />}
              {doc.formato     && <MetaItem icon={FileText} label={doc.formato} />}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            <PermissionGate module="diretorio" action="edit">
              {actionBtn(
                () => setEditing((v) => !v),
                editing ? <><Check size={12} /> Salvar</> : <><Pencil size={12} /> Editar</>,
                editing,
              )}
            </PermissionGate>

            {actionBtn(() => {}, <><Download size={12} /> Exportar</>)}

            {/* History popover */}
            <div style={{ position: 'relative' }}>
              {actionBtn(() => setShowHistory((v) => !v), <><History size={12} /> Histórico</>, showHistory)}
              {showHistory && (
                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 320, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Histórico de versões</span>
                    <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={13} /></button>
                  </div>
                  {FAKE_VERSIONS.map((v, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderBottom: i < FAKE_VERSIONS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: `var(${color})` }}>{v.v}</span>
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{v.date}</span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>{v.change}</p>
                      <p style={{ fontSize: 10, color: 'var(--text3)' }}>{v.author}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Close */}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', borderRadius: 6, flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body: 60% content + 40% AI ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left: document content (60%) */}
          <div style={{ flex: 3, overflowY: 'auto', padding: '24px 28px' }}>
            {editing ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{ width: '100%', minHeight: '100%', background: 'var(--bg3)', border: '1px solid var(--accent)', borderRadius: 8, padding: '14px 16px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', resize: 'vertical', lineHeight: 1.7, outline: 'none', boxSizing: 'border-box' }}
              />
            ) : (
              <DocBody doc={doc} docType={docType} />
            )}
          </div>

          {/* Right: inline AI panel (40%) */}
          <div style={{ flex: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 280 }}>
            <InlineAIPanel doc={doc} docType={docType} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Guide doc badge ────────────────────────────────────────────────────────── */
function GuideDocCard({ doc, onOpen }) {
  const d = new Date(doc.createdAt);
  const dateStr = isNaN(d) ? '' : `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
  return (
    <div
      style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent2)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.13s, background 0.13s' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent2)'; e.currentTarget.style.background = 'var(--bg4)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg3)'; }}
      onClick={() => onOpen(doc, 'guia_doc')}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(91,110,245,0.12)', border: '1px solid rgba(91,110,245,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={14} style={{ color: 'var(--accent2)' }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{doc.title}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
              {doc.content?.split('\n')[0] ?? 'Documento criado pelo Guia Estratégico'}
            </p>
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(91,110,245,0.12)', color: 'var(--accent2)', border: '1px solid rgba(91,110,245,0.25)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          📖 Criado pelo Guia
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={11} style={{ color: 'var(--text3)' }} />
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Criado em {dateStr}</span>
        <ChevronRight size={13} style={{ color: 'var(--text3)', marginLeft: 'auto' }} />
      </div>
    </div>
  );
}

function loadGuiaDocs(folder) {
  try {
    const all = JSON.parse(localStorage.getItem('dir_guia_docs') ?? 'null') ?? [];
    return Array.isArray(all) ? all.filter(d => d.folder === folder) : [];
  } catch { return []; }
}

/* ─── Folder content components ──────────────────────────────────────────────── */
function ProcessosContent({ query, onOpen }) {
  const items = SOPS.filter((s) => !query || s.nome.toLowerCase().includes(query) || s.tags.some((t) => t.toLowerCase().includes(query)));
  const guiaDocs = loadGuiaDocs('processos').filter(d => !query || d.title.toLowerCase().includes(query));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {guiaDocs.map(doc => (
        <GuideDocCard key={doc.id} doc={doc} onOpen={onOpen} />
      ))}
      {items.map((sop) => (
        <div key={sop.id}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderLeft: `3px solid var(${sop.color})`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.13s, background 0.13s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `var(${sop.color})`; e.currentTarget.style.background = 'var(--bg4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg3)'; }}
          onClick={() => onOpen(sop, 'sop')}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `color-mix(in srgb, var(${sop.color}) 12%, transparent)`, border: `1px solid color-mix(in srgb, var(${sop.color}) 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={14} style={{ color: `var(${sop.color})` }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{sop.nome}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sop.descricao}</p>
              </div>
            </div>
            <StatusBadge status={sop.status} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <MetaItem icon={User}  label={sop.responsavel} />
            <MetaItem icon={Hash}  label={`${sop.passos} passos`} />
            <MetaItem icon={Clock} label={`Atualizado ${sop.updatedAt}`} />
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              {sop.tags.map((t) => <TagChip key={t} label={t} />)}
            </div>
            <ChevronRight size={13} style={{ color: 'var(--text3)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SenhasContent({ query, isAdmin, showAdd, setShowAdd }) {
  const items = SENHAS.filter((s) => !query || s.plataforma.toLowerCase().includes(query) || s.categoria.toLowerCase().includes(query));
  const [newEntry, setNewEntry] = useState({ plataforma: '', usuario: '', senha: '', categoria: '' });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(240,168,50,0.08)', border: '1px solid rgba(240,168,50,0.25)' }}>
          <Shield size={14} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--amber)', marginBottom: 2 }}>Visível apenas para administradores</p>
            <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>Credenciais exibidas somente ao perfil Admin. Nunca compartilhe por mensagem ou e-mail. Considere migrar para 1Password ou Bitwarden.</p>
          </div>
        </div>
      )}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg4)', borderBottom: '1px solid var(--border)' }}>
              {['Plataforma', 'Usuário', 'Senha', 'Categoria', ''].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((pw, i) => (
              <tr key={pw.id} style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={{ padding: '11px 14px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>{pw.icone}</span><span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{pw.plataforma}</span></div></td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)' }}>{pw.usuario}</td>
                <td style={{ padding: '11px 14px' }}>
                  {isAdmin ? <PasswordCell senha={pw.senha} /> : <span style={{ fontSize: 12, color: 'var(--text3)', letterSpacing: '0.1em', fontFamily: 'monospace' }}>{MASKED}</span>}
                </td>
                <td style={{ padding: '11px 14px' }}><TagChip label={pw.categoria} /></td>
                <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                  {isAdmin && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', borderRadius: 6 }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text2)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; }}><ExternalLink size={12} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && isAdmin && (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--accent)', borderRadius: 10, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 12 }}>Nova entrada</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[{ key: 'plataforma', label: 'Plataforma', ph: 'Ex: Salesforce' }, { key: 'categoria', label: 'Categoria', ph: 'Ex: CRM' }, { key: 'usuario', label: 'Usuário', ph: 'email@empresa.com' }, { key: 'senha', label: 'Senha', ph: '••••••••', type: 'password' }].map(({ key, label, ph, type }) => (
              <div key={key}>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>{label}</label>
                <input type={type || 'text'} value={newEntry[key]} onChange={(e) => setNewEntry((p) => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setShowAdd(false)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Salvar</button>
            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplatesContent({ query, onOpen }) {
  const items = TEMPLATES.filter((t) => !query || t.nome.toLowerCase().includes(query) || t.tags.some((tag) => tag.toLowerCase().includes(query)));
  const guiaDocs = loadGuiaDocs('templates').filter((d) => !query || d.title.toLowerCase().includes(query));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {guiaDocs.map((doc) => (<GuideDocCard key={doc.id} doc={doc} onOpen={onOpen} />))}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {items.map((tpl) => (
        <div key={tpl.id}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.13s, background 0.13s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `var(${tpl.color})`; e.currentTarget.style.background = 'var(--bg4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg3)'; }}
          onClick={() => onOpen(tpl, 'template')}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: `color-mix(in srgb, var(${tpl.color}) 12%, transparent)`, border: `1px solid color-mix(in srgb, var(${tpl.color}) 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LayoutTemplate size={15} style={{ color: `var(${tpl.color})` }} />
            </div>
            <StatusBadge status={tpl.status} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>{tpl.nome}</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.45, marginBottom: 10 }}>{tpl.descricao}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{tpl.tags.map((t) => <TagChip key={t} label={t} />)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text3)' }}>
              <span style={{ color: `var(${tpl.color})`, fontWeight: 500 }}>{tpl.versao}</span>
              <span>· {tpl.formato}</span>
              <span>· {tpl.uso} usos</span>
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

function GenericContent({ items, query, docType, onOpen }) {
  const filtered = items.filter((i) => !query || i.nome.toLowerCase().includes(query));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {filtered.map((item) => (
        <div key={item.id}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderLeft: `3px solid var(${item.color})`, borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', transition: 'background 0.13s, border-color 0.13s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.borderColor = `var(${item.color})`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          onClick={() => onOpen(item, docType)}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{item.nome}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>{item.descricao || item.partes}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {item.versao && <span style={{ fontSize: 11, color: `var(${item.color})`, fontWeight: 500 }}>{item.versao}</span>}
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{item.updatedAt}</span>
            <StatusBadge status={item.status} />
            <ChevronRight size={13} style={{ color: 'var(--text3)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── FileCard ──────────────────────────────────────────────────────────── */
function FileCard({ file, onDelete, onUpdateTags }) {
  const cfg = FILE_TYPE_CFG[file.mimeType] ?? { label: (file.ext || 'FILE').toUpperCase(), color: 'var(--text3)', isImage: false };
  const [confirmDel, setConfirmDel] = useState(false);
  const [editingTag, setEditingTag] = useState(false);
  const [tagInput,   setTagInput]   = useState('');
  const tagInputRef = useRef(null);

  function addTag() {
    const t = tagInput.trim();
    setTagInput('');
    setEditingTag(false);
    if (!t || file.tags.includes(t)) return;
    onUpdateTags(file.id, [...file.tags, t]);
  }

  function removeTag(tag) {
    onUpdateTags(file.id, file.tags.filter(t => t !== tag));
  }

  useEffect(() => { if (editingTag) tagInputRef.current?.focus(); }, [editingTag]);

  return (
    <div
      style={{ position: 'relative', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.13s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Preview area */}
      <div style={{ height: 110, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {cfg.isImage ? (
          <img src={file.data} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 44, height: 52, borderRadius: 6, background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          </div>
        )}
        {/* Type badge */}
        <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 20, background: `color-mix(in srgb, ${cfg.color} 15%, var(--bg4))`, color: cfg.color, border: `1px solid color-mix(in srgb, ${cfg.color} 30%, transparent)` }}>
          {cfg.label}
        </span>
        {/* Delete button */}
        {!confirmDel && (
          <button onClick={() => setConfirmDel(true)} title="Excluir"
            style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 5, padding: '3px 5px', cursor: 'pointer', color: 'var(--text3)', display: 'flex', lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          >
            <X size={11} />
          </button>
        )}
        {/* Delete confirmation overlay */}
        {confirmDel && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <p style={{ fontSize: 11, color: '#fff', textAlign: 'center', margin: 0 }}>Excluir arquivo?</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onDelete(file.id)} style={{ fontSize: 11, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Sim</button>
              <button onClick={() => setConfirmDel(false)} style={{ fontSize: 11, background: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', color: '#ccc', fontFamily: 'var(--font-body)' }}>Não</button>
            </div>
          </div>
        )}
      </div>

      {/* Meta area */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }} title={file.name}>{file.name}</p>
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text3)' }}>
          <span>{fmtSize(file.size)}</span>
          <span>·</span>
          <span>{fmtUploadDate(file.uploadedAt)}</span>
        </div>
        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', minHeight: 22 }}>
          {file.tags.map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)', cursor: 'default' }}>
              {tag}
              <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text3)', display: 'flex', lineHeight: 1 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
              ><X size={8} /></button>
            </span>
          ))}
          {editingTag ? (
            <input
              ref={tagInputRef}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onBlur={addTag}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } if (e.key === 'Escape') { setEditingTag(false); setTagInput(''); } }}
              placeholder="tag…"
              style={{ fontSize: 10, width: 60, background: 'var(--bg4)', border: '1px solid var(--accent)', borderRadius: 20, padding: '1px 6px', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}
            />
          ) : (
            <button onClick={() => setEditingTag(true)} title="Adicionar tag"
              style={{ fontSize: 10, background: 'none', border: '1px dashed var(--border)', borderRadius: 20, padding: '1px 6px', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-body)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; }}
            >
              <Tag size={8} /> tag
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── FolderFilesSection ────────────────────────────────────────────────── */
function FolderFilesSection({ folderId }) {
  const { files, addFiles, removeFile, updateFileTags } = useFilesForFolder(folderId);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    await addFiles(e.dataTransfer.files);
  }

  async function handleInput(e) {
    await addFiles(e.target.files);
    e.target.value = '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
          Arquivos{files.length > 0 && (
            <span style={{ background: 'var(--bg4)', borderRadius: 20, padding: '1px 6px', border: '1px solid var(--border)', marginLeft: 6, fontSize: 10 }}>{files.length}</span>
          )}
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 11px', color: 'var(--text2)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'border-color 0.13s, color 0.13s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; }}
        >
          <Upload size={11} /> Adicionar arquivo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.svg,.webp,.pdf,.docx,.xlsx,.pptx"
          onChange={handleInput}
          style={{ display: 'none' }}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 10,
          padding: files.length === 0 ? '32px 20px' : '10px 16px',
          background: dragOver ? 'rgba(91,110,245,0.06)' : 'transparent',
          transition: 'border-color 0.15s, background 0.15s, padding 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {files.length === 0 ? (
          <>
            <Upload size={22} style={{ color: dragOver ? 'var(--accent2)' : 'var(--text3)' }} />
            <p style={{ fontSize: 12, color: dragOver ? 'var(--accent2)' : 'var(--text3)', margin: 0, textAlign: 'center' }}>
              Arraste arquivos aqui ou clique em{' '}
              <strong style={{ color: 'var(--accent2)', fontWeight: 500 }}>Adicionar arquivo</strong>
            </p>
            <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>
              JPG, PNG, GIF, SVG, WEBP, PDF, DOCX, XLSX, PPTX
            </p>
          </>
        ) : (
          <p style={{ fontSize: 11, color: dragOver ? 'var(--accent2)' : 'var(--text3)', margin: 0 }}>
            {dragOver ? 'Solte para adicionar' : 'Arraste mais arquivos aqui'}
          </p>
        )}
      </div>

      {/* File grid */}
      {files.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {files.map(file => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={removeFile}
              onUpdateTags={updateFileTags}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── FolderAccessDenied ────────────────────────────────────────────────── */
function FolderAccessDenied({ folderLabel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(240,168,50,0.1)', border: '1px solid rgba(240,168,50,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Lock size={22} style={{ color: 'var(--amber)' }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Acesso restrito</p>
      <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
        Você não tem permissão para acessar a pasta{' '}
        <strong style={{ color: 'var(--text2)' }}>{folderLabel}</strong>.<br />
        Entre em contato com o administrador para solicitar acesso.
      </p>
    </div>
  );
}

/* ─── GlobalSearchResults ────────────────────────────────────────────────── */
function GlobalSearchResults({ query, folderInfos }) {
  const term = query.trim().toLowerCase();
  if (!term) return null;

  const groups = [];
  for (const { folderId, folderLabel, folderEmoji } of folderInfos) {
    const files = readFolderFiles(folderId);
    const matched = files.filter(f =>
      f.name.toLowerCase().includes(term) ||
      (f.tags || []).some(t => t.toLowerCase().includes(term))
    );
    if (matched.length) groups.push({ folderId, folderLabel, folderEmoji, files: matched });
  }

  if (groups.length === 0) {
    return (
      <div style={{ padding: '24px 20px', textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
          Nenhum arquivo encontrado para <strong style={{ color: 'var(--text2)' }}>"{query}"</strong>
        </p>
      </div>
    );
  }

  const total = groups.reduce((n, g) => n + g.files.length, 0);

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
        Resultados — <span style={{ color: 'var(--accent2)' }}>{total}</span> arquivo{total !== 1 ? 's' : ''}
      </p>
      {groups.map(group => (
        <div key={group.folderId}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            {group.folderEmoji && <span style={{ fontSize: 13 }}>{group.folderEmoji}</span>}
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>{group.folderLabel}</span>
            <span style={{ fontSize: 10, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 20, padding: '0 5px', color: 'var(--text3)' }}>
              {group.files.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {group.files.map(file => {
              const cfg = FILE_TYPE_CFG[file.mimeType] ?? { label: (file.ext || 'FILE').toUpperCase(), color: 'var(--text3)', isImage: false };
              return (
                <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, transition: 'border-color 0.13s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {cfg.isImage ? (
                    <img src={file.data} alt={file.name} style={{ width: 34, height: 34, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 34, height: 34, borderRadius: 6, background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {highlightText(file.name, query)}
                    </p>
                    {(file.tags || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>
                        {file.tags.map(t => {
                          const isMatch = term && t.toLowerCase().includes(term);
                          return (
                            <span key={t} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: isMatch ? 'rgba(91,110,245,0.12)' : 'var(--bg4)', color: isMatch ? 'var(--accent2)' : 'var(--text3)', border: `1px solid ${isMatch ? 'rgba(91,110,245,0.35)' : 'var(--border)'}` }}>
                              {highlightText(t, query)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>{fmtSize(file.size)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── PermissionModal ────────────────────────────────────────────────────── */
function PermissionModal({ folderId, folderLabel, folderEmoji, currentPerm, onSave, onClose }) {
  const [type,  setType]  = useState(currentPerm?.type  ?? 'all');
  const [roles, setRoles] = useState(currentPerm?.roles ?? []);
  const [users, setUsers] = useState(currentPerm?.users ?? []);

  function toggleRole(id) {
    setRoles(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  }

  function toggleUser(id) {
    setUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  }

  function handleSave() {
    if (type === 'all')   onSave(folderId, { type: 'all' });
    else if (type === 'roles') onSave(folderId, { type: 'roles', roles });
    else                  onSave(folderId, { type: 'users', users });
    onClose();
  }

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const radioStyle = (active) => ({
    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
    borderRadius: 8, cursor: 'pointer',
    background: active ? 'rgba(91,110,245,0.07)' : 'var(--bg4)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    transition: 'all 0.13s',
  });

  const radioDot = (active) => ({
    width: 14, height: 14, borderRadius: '50%', flexShrink: 0, marginTop: 1,
    border: `2px solid ${active ? 'var(--accent)' : 'var(--border2)'}`,
    background: active ? 'var(--accent)' : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.13s',
  });

  const checkBox = (active) => ({
    width: 14, height: 14, borderRadius: 4, flexShrink: 0,
    border: `2px solid ${active ? 'var(--accent)' : 'var(--border2)'}`,
    background: active ? 'var(--accent)' : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.13s',
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 600 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 410, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, zIndex: 601, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(240,168,50,0.1)', border: '1px solid rgba(240,168,50,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Lock size={15} style={{ color: 'var(--amber)' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Permissões de acesso</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                {folderEmoji && <span style={{ marginRight: 4 }}>{folderEmoji}</span>}
                {folderLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', borderRadius: 6 }}>
            <X size={15} />
          </button>
        </div>

        {/* Visibility options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {/* All */}
          <div onClick={() => setType('all')} style={radioStyle(type === 'all')}>
            <div style={radioDot(type === 'all')}>
              {type === 'all' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Visível para todos</p>
              <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>Qualquer usuário autenticado pode acessar</p>
            </div>
          </div>

          {/* Roles */}
          <div onClick={() => setType('roles')} style={radioStyle(type === 'roles')}>
            <div style={radioDot(type === 'roles')}>
              {type === 'roles' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Apenas roles específicas</p>
              <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>Selecione quais perfis têm acesso</p>
            </div>
          </div>
          {type === 'roles' && (
            <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 7, padding: '2px 0 4px' }}>
              {ALL_ROLES.map(r => (
                <div key={r.id} onClick={e => { e.stopPropagation(); toggleRole(r.id); }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={checkBox(roles.includes(r.id))}>
                    {roles.includes(r.id) && <Check size={9} style={{ color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{r.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Users */}
          <div onClick={() => setType('users')} style={radioStyle(type === 'users')}>
            <div style={radioDot(type === 'users')}>
              {type === 'users' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Apenas usuários específicos</p>
              <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>Selecione quais pessoas têm acesso</p>
            </div>
          </div>
          {type === 'users' && (
            <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 7, padding: '2px 0 4px' }}>
              {MOCK_USERS_LIST.map(u => (
                <div key={u.id} onClick={e => { e.stopPropagation(); toggleUser(u.id); }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={checkBox(users.includes(u.id))}>
                    {users.includes(u.id) && <Check size={9} style={{ color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{u.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                    ({ALL_ROLES.find(r => r.id === u.role)?.label})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Salvar permissões
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── FolderModal ────────────────────────────────────────────────────────── */
function FolderModal({ parentId, onSave, onClose }) {
  const [nome, setNome] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  function handleSubmit() {
    const n = nome.trim();
    if (!n) return;
    onSave(n, emoji);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 500 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 380, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, zIndex: 501, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{parentId ? 'Nova subpasta' : 'Nova pasta'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 4, borderRadius: 6 }}>
            <X size={15} />
          </button>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Ícone</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 18, padding: '10px 8px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
          {EMOJI_OPTIONS.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{
              fontSize: 17, lineHeight: 1, padding: '4px 5px', borderRadius: 6,
              background: emoji === e ? 'rgba(91,110,245,0.15)' : 'transparent',
              border: `1px solid ${emoji === e ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer', transition: 'background 0.1s, border-color 0.1s',
            }}>
              {e}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Nome da pasta</p>
        <input
          ref={inputRef}
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder={parentId ? 'Nome da subpasta…' : 'Ex: Comercial, Marketing…'}
          style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', marginBottom: 18, display: 'block' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!nome.trim()}
            style={{ background: nome.trim() ? 'var(--accent)' : 'var(--bg4)', color: nome.trim() ? '#fff' : 'var(--text3)', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: nome.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-body)', transition: 'background 0.13s' }}
          >
            Criar pasta
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── CustomFolderItem ───────────────────────────────────────────────────── */
function CustomFolderItem({ folder, depth, activeFolder, onSelect, onAddSubfolder, onRename, onDelete, dragHandleProps, isDragging }) {
  const isActive    = activeFolder === folder.id;
  const hasChildren = (folder.children?.length ?? 0) > 0;
  const [expanded,      setExpanded]      = useState(true);
  const [hovered,       setHovered]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming,      setRenaming]      = useState(false);
  const [draft,         setDraft]         = useState(folder.nome);

  function commitRename() {
    const t = draft.trim();
    if (t && t !== folder.nome) onRename(folder.id, t);
    setRenaming(false);
  }

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          paddingLeft: 8 + depth * 14, paddingRight: 8,
          paddingTop: 6, paddingBottom: 6,
          background: isActive ? 'rgba(91,110,245,0.08)' : isDragging ? 'var(--bg4)' : 'transparent',
          transition: 'background 0.1s',
        }}
      >
        {/* Drag handle — root only */}
        {depth === 0 && (
          <span {...dragHandleProps} style={{ cursor: 'grab', color: 'var(--text3)', opacity: hovered ? 0.5 : 0, flexShrink: 0, display: 'flex', transition: 'opacity 0.1s' }}>
            <GripVertical size={11} />
          </span>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: hasChildren ? 'pointer' : 'default', color: 'var(--text3)', display: 'flex', flexShrink: 0, width: 14, justifyContent: 'center', opacity: hasChildren ? 1 : 0 }}
        >
          {hasChildren && (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />)}
        </button>

        {/* Emoji */}
        <span onClick={() => onSelect(folder.id)} style={{ fontSize: 13, flexShrink: 0, cursor: 'pointer', lineHeight: 1 }}>
          {folder.emoji}
        </span>

        {/* Name / inline rename */}
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitRename(); } if (e.key === 'Escape') setRenaming(false); }}
            style={{ flex: 1, background: 'var(--bg4)', border: '1px solid var(--accent)', borderRadius: 4, padding: '2px 6px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', minWidth: 0 }}
          />
        ) : (
          <span
            onClick={() => onSelect(folder.id)}
            onDoubleClick={e => { e.preventDefault(); setDraft(folder.nome); setRenaming(true); }}
            style={{ flex: 1, fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--accent2)' : 'var(--text2)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, lineHeight: 1.4 }}
          >
            {folder.nome}
          </span>
        )}

        {/* Hover actions */}
        {hovered && !renaming && !confirmDelete && (
          <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            {depth < 2 && (
              <button title="Adicionar subpasta" onClick={e => { e.stopPropagation(); onAddSubfolder(folder.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 3, display: 'flex', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
              >
                <Plus size={10} />
              </button>
            )}
            <button title="Renomear (duplo clique)" onClick={e => { e.stopPropagation(); setDraft(folder.nome); setRenaming(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 3, display: 'flex', borderRadius: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            >
              <Pencil size={10} />
            </button>
            <button title="Excluir pasta" onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 3, display: 'flex', borderRadius: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            >
              <X size={10} />
            </button>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>Excluir?</span>
            <button onClick={e => { e.stopPropagation(); onDelete(folder.id); }}
              style={{ fontSize: 10, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Sim
            </button>
            <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
              style={{ fontSize: 10, background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', color: 'var(--text3)', fontFamily: 'var(--font-body)' }}>
              Não
            </button>
          </div>
        )}
      </div>

      {/* Children (recursive, no DnD) */}
      {expanded && hasChildren && (
        <div>
          {folder.children.map(child => (
            <CustomFolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              activeFolder={activeFolder}
              onSelect={onSelect}
              onAddSubfolder={onAddSubfolder}
              onRename={onRename}
              onDelete={onDelete}
              dragHandleProps={{}}
              isDragging={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── CustomFolderContent ────────────────────────────────────────────────── */
function CustomFolderContent({ folder }) {
  const navigate   = useNavigate();
  const totalItems = (folder.shortcuts?.length ?? 0) + (folder.children?.length ?? 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {folder.shortcuts?.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Atalhos rápidos
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {folder.shortcuts.map(sh => (
              <button
                key={sh.id}
                onClick={() => navigate(sh.route)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'border-color 0.13s, background 0.13s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>{sh.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{sh.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <ExternalLink size={9} /> {sh.route}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {folder.children?.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Subpastas
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {folder.children.map(child => (
              <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>{child.emoji}</span>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{child.nome}</span>
                {(child.children?.length ?? 0) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
                    {child.children.length} subpasta{child.children.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {totalItems === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <span style={{ fontSize: 32 }}>📂</span>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 10 }}>Pasta vazia</p>
          <p style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginTop: 4 }}>
            Adicione subpastas usando o botão + na barra lateral
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function DiretorioInterno() {
  const { user }   = useAuth();
  const { openAI } = useUI();
  const isAdmin    = user?.role === 'admin';

  const navigate = useNavigate();

  const [activeFolder, setActiveFolder] = useState('processos');
  const [query,        setQuery]        = useState('');
  const [showSenhaAdd, setShowSenhaAdd] = useState(false);
  const [docModal,     setDocModal]     = useState(null); // { doc, docType }

  // Custom folders — persisted in localStorage
  const [customFolders, setCustomFolders] = useState(() => {
    try {
      const s = localStorage.getItem('dir_custom_folders');
      return s ? JSON.parse(s) : INITIAL_CUSTOM_FOLDERS;
    } catch { return INITIAL_CUSTOM_FOLDERS; }
  });
  useEffect(() => {
    try { localStorage.setItem('dir_custom_folders', JSON.stringify(customFolders)); } catch {}
  }, [customFolders]);
  const [folderModal,    setFolderModal]    = useState(null); // null | { parentId?: string }
  const [hoveredBuiltin, setHoveredBuiltin] = useState(null);
  const [permModal,      setPermModal]      = useState(null); // null | { folderId, folderLabel, folderEmoji? }

  const { perms, setPermission, canAccess, isRestricted } = useFolderPermissions();

  const activeCustomFolder = findInTree(customFolders, activeFolder);
  const activeConfig = FOLDERS.find((f) => f.id === activeFolder);

  // All folder descriptors for global file search
  const allFolderInfos = [
    ...FOLDERS.map(f => ({ folderId: f.id, folderLabel: f.label, folderEmoji: null })),
    ...getAllFolderIds(customFolders).map(id => {
      const f = findInTree(customFolders, id);
      return { folderId: id, folderLabel: f?.nome ?? id, folderEmoji: f?.emoji ?? '📁' };
    }),
  ];

  // 5 most recently uploaded files across all folders (sorted by uploadedAt)
  const recentFiles = (() => {
    const all = [];
    for (const { folderId, folderLabel, folderEmoji } of allFolderInfos) {
      for (const f of readFolderFiles(folderId)) {
        all.push({ ...f, folderId, folderLabel, folderEmoji });
      }
    }
    return all.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 5);
  })();

  function openDoc(doc, docType) { setDocModal({ doc, docType }); }
  function closeDoc()            { setDocModal(null); }

  function handleCriarIA() {
    openAI(
      `Crie um novo documento para a pasta "${activeConfig?.label ?? activeFolder}" do nosso diretório interno. ` +
      `Empresa de serviços B2B para PMEs brasileiras. ` +
      `Gere um template profissional e completo com estrutura, instruções de preenchimento e exemplos práticos.`
    );
  }

  function handleSaveFolder(nome, emoji) {
    const folder = { id: newCfId(), emoji, nome, children: [], shortcuts: [] };
    if (folderModal?.parentId) {
      setCustomFolders(prev => addChildToTree(prev, folderModal.parentId, folder));
    } else {
      setCustomFolders(prev => [...prev, folder]);
    }
    setFolderModal(null);
  }

  function handleRenameFolder(id, nome) {
    setCustomFolders(prev => updateInTree(prev, id, f => ({ ...f, nome })));
  }

  function handleDeleteFolder(id) {
    setCustomFolders(prev => deleteFromTree(prev, id));
    if (activeFolder === id) setActiveFolder('processos');
  }

  function handleFolderDragEnd(result) {
    if (!result.destination || result.source.index === result.destination.index) return;
    const items = [...customFolders];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setCustomFolders(items);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start', minHeight: 600 }}>

      {/* ── Sidebar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 4 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value.toLowerCase())} placeholder="Buscar…"
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 28px 7px 28px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
          />
          {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }}><X size={11} /></button>}
        </div>

        {/* Recent files — shown below search when query is empty */}
        {!query && recentFiles.length > 0 && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Arquivos recentes</p>
            {recentFiles.map((f, i) => {
              const cfg = FILE_TYPE_CFG[f.mimeType] ?? { label: (f.ext || 'FILE').toUpperCase(), color: 'var(--text3)', isImage: false };
              return (
                <div
                  key={f.id}
                  onClick={() => { setActiveFolder(f.folderId); setQuery(''); setShowSenhaAdd(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: i < recentFiles.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'opacity 0.13s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <span style={{ fontSize: 9, fontWeight: 600, color: cfg.color, background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${cfg.color} 20%, transparent)`, borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {f.name}
                  </span>
                  {f.folderEmoji && (
                    <span style={{ fontSize: 11, flexShrink: 0 }} title={f.folderLabel}>{f.folderEmoji}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Folder list */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {FOLDERS.map((f, i) => {
            const Icon   = f.Icon;
            const active = activeFolder === f.id;
            return (
              <button key={f.id} onClick={() => { setActiveFolder(f.id); setQuery(''); setShowSenhaAdd(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: active ? 'var(--accent-bg)' : 'transparent', border: 'none', borderBottom: i < FOLDERS.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'background 0.13s' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg3)'; setHoveredBuiltin(f.id); }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; setHoveredBuiltin(null); }}
              >
                {active ? <FolderOpen size={14} style={{ color: `var(${f.color})`, flexShrink: 0 }} /> : <Folder size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
                <span style={{ flex: 1, fontSize: 12, fontWeight: active ? 500 : 400, color: active ? `var(${f.color})` : 'var(--text2)' }}>{f.label}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: active ? `color-mix(in srgb, var(${f.color}) 12%, transparent)` : 'var(--bg4)', color: active ? `var(${f.color})` : 'var(--text3)', border: `1px solid ${active ? `color-mix(in srgb, var(${f.color}) 25%, transparent)` : 'var(--border)'}` }}>
                  {COUNTS[f.id]}
                </span>
                {(isRestricted(f.id) || hoveredBuiltin === f.id) && (
                  <span
                    onClick={e => { e.stopPropagation(); setPermModal({ folderId: f.id, folderLabel: f.label }); }}
                    title="Permissões de acesso"
                    style={{ display: 'flex', padding: 3, borderRadius: 4, cursor: 'pointer', color: isRestricted(f.id) ? 'var(--amber)' : 'var(--text3)', flexShrink: 0, transition: 'color 0.13s' }}
                    onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = 'var(--amber)'; }}
                    onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.color = isRestricted(f.id) ? 'var(--amber)' : 'var(--text3)'; }}
                  >
                    <Lock size={11} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom folders */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px 8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: customFolders.length > 0 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Minhas Pastas
            </span>
            <button
              onClick={() => setFolderModal({})}
              title="Nova pasta"
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '3px 5px', borderRadius: 5, fontFamily: 'var(--font-body)', fontSize: 11 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'var(--bg3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'none'; }}
            >
              <Plus size={11} /> Nova pasta
            </button>
          </div>

          <DragDropContext onDragEnd={handleFolderDragEnd}>
            <Droppable droppableId="custom-folders">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} style={{ paddingTop: customFolders.length > 0 ? 4 : 0, paddingBottom: customFolders.length > 0 ? 4 : 0 }}>
                  {customFolders.map((folder, index) => (
                    <Draggable key={folder.id} draggableId={folder.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <CustomFolderItem
                            folder={folder}
                            depth={0}
                            activeFolder={activeFolder}
                            onSelect={id => { setActiveFolder(id); setQuery(''); setShowSenhaAdd(false); }}
                            onAddSubfolder={parentId => setFolderModal({ parentId })}
                            onRename={handleRenameFolder}
                            onDelete={handleDeleteFolder}
                            dragHandleProps={provided.dragHandleProps}
                            isDragging={snapshot.isDragging}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {customFolders.length === 0 && (
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', textAlign: 'center' }}>Nenhuma pasta ainda</p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Recents */}
        <div style={{ padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Recentes</p>
          {[SOPS[1], SOPS[5], TEMPLATES[0]].map((item) => (
            <div key={item.id} onClick={() => openDoc(item, item.passos ? 'sop' : 'template')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <Clock size={10} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content area ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeCustomFolder ? (
              <>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{activeCustomFolder.emoji}</span>
                <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{activeCustomFolder.nome}</h2>
                {((activeCustomFolder.shortcuts?.length ?? 0) + (activeCustomFolder.children?.length ?? 0)) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 20 }}>
                    {(activeCustomFolder.shortcuts?.length ?? 0) + (activeCustomFolder.children?.length ?? 0)}
                  </span>
                )}
              </>
            ) : (
              <>
                {activeConfig && <activeConfig.Icon size={16} style={{ color: `var(${activeConfig.color})` }} />}
                <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{activeConfig?.label}</h2>
                <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 20 }}>
                  {COUNTS[activeFolder]}
                </span>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeFolder === 'senhas' && isAdmin && (
              <button onClick={() => setShowSenhaAdd((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <Plus size={13} /> Adicionar
              </button>
            )}
            {!activeCustomFolder && (
              <button onClick={handleCriarIA} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <Bot size={13} /> Criar com IA
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {!canAccess(activeFolder, user) ? (
          <FolderAccessDenied folderLabel={activeCustomFolder?.nome ?? activeConfig?.label ?? activeFolder} />
        ) : (
          <>
            {/* Global file search results — shown above folder content when query is active */}
            {query && <GlobalSearchResults query={query} folderInfos={allFolderInfos} />}

            {activeCustomFolder ? (
              <CustomFolderContent folder={activeCustomFolder} />
            ) : (
              <>
                {activeFolder === 'processos'   && <ProcessosContent query={query} onOpen={openDoc} />}
                {activeFolder === 'senhas'      && <SenhasContent query={query} isAdmin={isAdmin} showAdd={showSenhaAdd} setShowAdd={setShowSenhaAdd} />}
                {activeFolder === 'templates'   && <TemplatesContent query={query} onOpen={openDoc} />}
                {activeFolder === 'fluxogramas' && <GenericContent items={FLUXOGRAMAS} query={query} docType="fluxograma" onOpen={openDoc} />}
                {activeFolder === 'contratos'   && <GenericContent items={CONTRATOS}   query={query} docType="contrato"   onOpen={openDoc} />}
              </>
            )}

            {/* File uploads — available in every folder */}
            <FolderFilesSection key={activeFolder} folderId={activeFolder} />
          </>
        )}
      </div>

      {/* Floating AI create button */}
      <button onClick={handleCriarIA} title="Criar documento com IA"
        style={{ position: 'fixed', bottom: 28, right: 28, width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(91,110,245,0.4)', transition: 'transform 0.15s, box-shadow 0.15s' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(91,110,245,0.55)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.boxShadow = '0 4px 20px rgba(91,110,245,0.4)'; }}
      >
        <Zap size={18} />
      </button>

      {/* Document modal */}
      {docModal && (
        <DocModal
          doc={docModal.doc}
          docType={docModal.docType}
          folderColor={FOLDERS.find((f) => f.id === activeFolder)?.color ?? '--accent2'}
          onClose={closeDoc}
        />
      )}

      {/* Folder create/subfolder modal */}
      {folderModal && (
        <FolderModal
          parentId={folderModal.parentId}
          onSave={handleSaveFolder}
          onClose={() => setFolderModal(null)}
        />
      )}

      {/* Folder permission modal */}
      {permModal && (
        <PermissionModal
          folderId={permModal.folderId}
          folderLabel={permModal.folderLabel}
          folderEmoji={permModal.folderEmoji}
          currentPerm={perms[permModal.folderId]}
          onSave={setPermission}
          onClose={() => setPermModal(null)}
        />
      )}
    </div>
  );
}
