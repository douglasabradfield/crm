import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Mail, MessageCircle, Phone, Plus, X, ChevronDown, ChevronRight,
  Bot, Send, Pencil, Eye, MousePointerClick, Zap, Clock,
  Users, BarChart2, Check, GripVertical, Trash2, GitBranch,
  AlertTriangle, ArrowRight, TrendingDown, Briefcase,
} from 'lucide-react';
import { useUI } from '../store/index.js';
import { useAI } from '../hooks/useAI.js';
import { useAuth } from '../store/auth.js';
import { supabase } from '../services/supabase.js';
import SkeletonLoader from '../components/UI/SkeletonLoader.jsx';
import PermissionGate from '../components/Auth/PermissionGate.jsx';

/* ─── Config ─────────────────────────────────────────────────────────────────── */

const STEP_TYPE_CFG = {
  email: {
    label: 'E-mail', Icon: Mail,
    color: '--accent2', bg: 'rgba(91,110,245,0.12)',
    badge: 'Automático', badgeColor: '--green',
  },
  whatsapp: {
    label: 'WhatsApp', Icon: MessageCircle,
    color: '--green', bg: 'rgba(45,212,160,0.12)',
    badge: 'Manual', badgeColor: '--amber',
  },
  ligacao: {
    label: 'Ligação', Icon: Phone,
    color: '--amber', bg: 'rgba(240,168,50,0.12)',
    badge: 'Manual', badgeColor: '--amber',
  },
};

const CHANNEL_CFG = {
  email:    { label: 'E-mail',   Icon: Mail,          color: '--accent2', bg: 'rgba(91,110,245,0.12)'  },
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle, color: '--green',   bg: 'rgba(45,212,160,0.12)'  },
  linkedin: { label: 'LinkedIn', Icon: Briefcase,     color: '--teal',    bg: 'rgba(56,201,224,0.12)'  },
  phone:    { label: 'Ligação',  Icon: Phone,         color: '--amber',   bg: 'rgba(240,168,50,0.12)'  },
};

const BRANCH_ACTIONS = [
  { value: 'next_step', label: 'Próximo step' },
  { value: 'add_crm',   label: 'Adicionar ao CRM' },
  { value: 'discard',   label: 'Descartar lead' },
  { value: 'end_flow',  label: 'Finalizar fluxo' },
];

const OUTCOMES = [
  { value: 'no_response', label: 'Sem resposta' },
  { value: 'interest',    label: 'Demonstrou interesse' },
  { value: 'callback',    label: 'Pediu retorno' },
  { value: 'no_interest', label: 'Não tem interesse' },
];

const CALL_MOODS = ['Ótimo', 'Bom', 'Ruim', 'Não atendeu'];

const STAT_CARDS = [
  { label: 'Fluxos ativos',     value: '3',  icon: Zap,              color: '--accent'  },
  { label: 'Contatos em fluxo', value: '82', icon: Users,            color: '--teal'    },
  { label: 'Taxa de abertura',  value: '34', icon: Eye,              color: '--green'   },
  { label: 'Taxa de resposta',  value: '18', icon: MousePointerClick, color: '--purple' },
];

const COR_OPTIONS = [
  { value: '--accent', label: 'Azul'  },
  { value: '--teal',   label: 'Verde' },
  { value: '--amber',  label: 'Âmbar' },
  { value: '--purple', label: 'Roxo'  },
];

const MODELOS_PRONTOS = [
  {
    id: 'm1',
    nome: 'Pós-venda / Boas-vindas',
    descricao: 'Sequência para novos clientes: boas-vindas, dúvidas frequentes e acompanhamento inicial.',
    trigger: 'Novo cliente ativado',
    color: '--teal',
    steps: [
      { id: 'ms1a', type: 'email',   delay: 0, assunto: 'Bem-vindo(a)! Seus próximos passos', corpo: 'Olá [Nome],\n\nSeja bem-vindo(a)! Estamos felizes em ter você como cliente.\n\nNas próximas semanas nossa equipe vai te acompanhar de perto. Qualquer dúvida, é só responder este e-mail.\n\nGrande abraço,\n[Seu Nome]', integration: 'resend', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 0, responded: 0 },
      { id: 'ms1b', type: 'email',   delay: 3, assunto: 'Como está indo? Dúvidas mais comuns dos primeiros dias', corpo: 'Olá [Nome],\n\nJá faz 3 dias! Separei as dúvidas mais comuns de quem está começando:\n\n1. [Dúvida frequente 1]\n2. [Dúvida frequente 2]\n3. [Dúvida frequente 3]\n\nTem alguma pergunta que não está aqui? Responde este e-mail!\n\n[Seu Nome]', integration: 'resend', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 0, responded: 0 },
      { id: 'ms1c', type: 'ligacao', delay: 7, objetivo: 'Checar satisfação e identificar próximos passos', script: 'Perguntar como está a experiência. Identificar se há algum gargalo. Oferecer ajuda proativa. Perguntar se indicaria para um colega.', responsavel: '', hasBranch: true, branchA: { action: 'end_flow' }, branchB: { action: 'end_flow' }, reached: 0, responded: 0 },
    ],
  },
  {
    id: 'm2',
    nome: 'Reativação de ex-cliente',
    descricao: 'Win-back para clientes ou ex-clientes sem contato há mais de 60 dias.',
    trigger: 'Sem interação há 60 dias',
    color: '--amber',
    steps: [
      { id: 'ms2a', type: 'email',    delay: 0,  assunto: 'Sentimos sua falta, [Nome]', corpo: 'Oi [Nome],\n\nFaz um tempão que não conversamos. Muita coisa evoluiu por aqui e queria te contar.\n\nTemos novidades que podem ser relevantes para o momento atual da [Empresa]. Posso te enviar um resumo?\n\n[Seu Nome]', integration: 'resend', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 0, responded: 0 },
      { id: 'ms2b', type: 'whatsapp', delay: 4,  template: 'Oi [Nome]! Enviei um e-mail semana passada com uma novidade que pode te interessar. Recebeu? 😊', roteiro: 'Mensagem curta. Verificar se recebeu o e-mail. Se sim, perguntar o que achou. Se não, reforçar o convite.', responsavel: '', hasBranch: true, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 0, responded: 0 },
      { id: 'ms2c', type: 'ligacao',  delay: 10, objetivo: 'Última tentativa de reconexão', script: 'Ligação curta e direta. Perguntar sobre o momento atual. Oferecer condição especial para retomada. Se não tiver interesse, encerrar com leveza e deixar porta aberta.', responsavel: '', hasBranch: true, branchA: { action: 'add_crm' }, branchB: { action: 'discard' }, reached: 0, responded: 0 },
    ],
  },
  {
    id: 'm3',
    nome: 'Acompanhamento de proposta',
    descricao: 'Follow-up para leads com proposta enviada aguardando decisão.',
    trigger: 'Proposta enviada sem resposta',
    color: '--accent',
    steps: [
      { id: 'ms3a', type: 'whatsapp', delay: 1, template: 'Oi [Nome]! Passando para confirmar que você recebeu a proposta que enviei ontem. Ficou alguma dúvida?', roteiro: 'Mensagem rápida de confirmação. Não pressionar — só verificar se recebeu.', responsavel: '', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 0, responded: 0 },
      { id: 'ms3b', type: 'email',    delay: 3, assunto: 'Reforço de valor: por que faz sentido para a [Empresa]', corpo: 'Olá [Nome],\n\nPasso para reforçar os pontos mais relevantes para vocês:\n\n→ [Benefício 1]\n→ [Benefício 2]\n→ [Condição especial, se houver]\n\nPosso te ajudar com alguma dúvida antes da decisão?\n\n[Seu Nome]', integration: 'resend', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 0, responded: 0 },
      { id: 'ms3c', type: 'ligacao',  delay: 6, objetivo: 'Ajudar na tomada de decisão', script: 'Perguntar sobre o estágio da decisão. Identificar objeções. Oferecer ajuda para adaptar a proposta. Definir próximo passo claro.', responsavel: '', hasBranch: true, branchA: { action: 'add_crm' }, branchB: { action: 'next_step' }, reached: 0, responded: 0 },
    ],
  },
];

/* ─── Template ↔ Step helpers ────────────────────────────────────────────────── */

const STEP_TYPE_TO_TPL_CHANNEL = { email: 'email', whatsapp: 'whatsapp', ligacao: 'phone' };

function tplContentFromStep(step) {
  if (step.type === 'email')    return { assunto: step.assunto ?? '', corpo: step.corpo ?? '' };
  if (step.type === 'whatsapp') return { assunto: null,                corpo: step.template ?? '' };
  return { assunto: step.objetivo ?? '', corpo: step.script ?? '' };
}

function applyTplToStep(step, tpl) {
  if (step.type === 'email')    return { assunto: tpl.assunto ?? '', corpo: tpl.corpo ?? '' };
  if (step.type === 'whatsapp') return { template: tpl.corpo ?? '' };
  return { objetivo: tpl.assunto ?? '', script: tpl.corpo ?? '' };
}

/* ─── Mock data ──────────────────────────────────────────────────────────────── */

const FLUXOS_INIT = [
  {
    id: 'f1', color: '--accent',
    nome: 'Pós-Demo — Cold Leads',
    descricao: 'Sequência para leads que assistiram à demo mas não avançaram para proposta.',
    trigger: 'Demo realizada sem proposta',
    status: 'ativo', contacts: 23, responseRate: 14, crmConversion: 6, dropOffStep: 2,
    steps: [
      { id: 's1a', type: 'email',    delay: 0, assunto: 'Obrigado pela atenção + resumo da demo', corpo: 'Olá [Nome],\n\nFoi ótimo conversar! Segue o resumo do que abordamos na demo...', integration: 'resend', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 23, responded: 16 },
      { id: 's1b', type: 'whatsapp', delay: 1, template: 'Oi [Nome]! Ficou alguma dúvida da demo? Posso te ajudar!', roteiro: 'Verificar objeções levantadas na demo e oferecer esclarecimento.', responsavel: 'Douglas', hasBranch: true, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 20, responded: 9 },
      { id: 's1c', type: 'email',    delay: 2, assunto: 'Case de sucesso de cliente similar', corpo: 'Olá [Nome],\n\nQueria te contar como a [Empresa Similar] resolveu o mesmo desafio...', integration: 'resend', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 17, responded: 8 },
      { id: 's1d', type: 'email',    delay: 4, assunto: 'Sua equipe já tem meta de vendas para o próximo trimestre?', corpo: 'Olá [Nome],\n\nMuitas equipes ainda estão definindo metas para o segundo semestre...', integration: 'resend', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 14, responded: 5 },
      { id: 's1e', type: 'ligacao',  delay: 7, objetivo: 'Oferecer trial ou reunião de alinhamento', script: 'Verificar interesse em fechar até o fim do trimestre. Oferecer trial de 14 dias.', responsavel: 'Douglas', hasBranch: true, branchA: { action: 'add_crm' }, branchB: { action: 'end_flow' }, reached: 9, responded: 4 },
    ],
    leads: [
      { id: 'l1', company: 'TechVision LTDA', contact: 'Carlos Mendes', stepIdx: 1, daysInStep: 2, responsavel: 'Douglas', status: 'ativo' },
      { id: 'l2', company: 'InnovateBR LTDA', contact: 'Ana Lima', stepIdx: 2, daysInStep: 0, responsavel: 'Douglas', status: 'ativo' },
      { id: 'l3', company: 'DataPrime SA', contact: 'Bruno Santos', stepIdx: 0, daysInStep: 1, responsavel: 'Douglas', status: 'ativo' },
      { id: 'l4', company: 'SoftHouse LTDA', contact: 'Fernanda Rocha', stepIdx: 3, daysInStep: 5, responsavel: 'Douglas', status: 'ativo' },
      { id: 'l5', company: 'RoboTech MEI', contact: 'Paulo Sílvio', stepIdx: 4, daysInStep: 7, responsavel: 'Douglas', status: 'ativo' },
    ],
  },
  {
    id: 'f2', color: '--teal',
    nome: 'Nurturing Educacional',
    descricao: 'Fluxo de conteúdo para novos leads frios que ainda não estão prontos para comprar.',
    trigger: 'Lead novo sem reunião agendada',
    status: 'ativo', contacts: 47, responseRate: 21, crmConversion: 9, dropOffStep: 3,
    steps: [
      { id: 's2a', type: 'email',    delay: 0, assunto: 'Boas-vindas + ebook "Como estruturar seu comercial"', corpo: 'Olá [Nome],\n\nSeja bem-vindo! Preparamos um material exclusivo para te ajudar...', integration: 'mailchimp', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 47, responded: 31 },
      { id: 's2b', type: 'whatsapp', delay: 2, template: 'Oi [Nome]! Conseguiu baixar o ebook? Tem alguma dúvida?', roteiro: 'Verificar se recebeu e abriu o material. Perguntar sobre desafios atuais.', responsavel: 'Douglas', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 42, responded: 19 },
      { id: 's2c', type: 'email',    delay: 3, assunto: '3 erros que PMEs cometem no comercial', corpo: 'Olá [Nome],\n\nNo material de ontem você viu a estrutura geral. Hoje quero te mostrar os erros...', integration: 'mailchimp', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 38, responded: 14 },
      { id: 's2d', type: 'whatsapp', delay: 4, template: 'Oi [Nome]! Tenho um vídeo rápido com uma dica prática sobre [Tema]. Vale 3 minutos!', roteiro: 'Enviar link do vídeo. Perguntar se faz sentido para a realidade deles.', responsavel: 'Douglas', hasBranch: true, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 31, responded: 12 },
      { id: 's2e', type: 'email',    delay: 5, assunto: 'Case de sucesso + convite para webinar', corpo: 'Olá [Nome],\n\nA [Empresa] estava no mesmo ponto que você. Em 3 meses eles mudaram tudo...', integration: 'mailchimp', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 25, responded: 9 },
      { id: 's2f', type: 'email',    delay: 7, assunto: 'Pronto para dar o próximo passo?', corpo: 'Olá [Nome],\n\nVocê recebeu muito conteúdo nas últimas semanas. Que tal uma conversa de 20 min?', integration: 'mailchimp', condition: 'auto', hasBranch: false, branchA: { action: 'add_crm' }, branchB: { action: 'end_flow' }, reached: 18, responded: 8 },
    ],
    leads: [
      { id: 'l6',  company: 'Logix Transportes', contact: 'Roberto Alves', stepIdx: 0, daysInStep: 0, responsavel: 'Douglas', status: 'ativo' },
      { id: 'l7',  company: 'VidaNet Telecom', contact: 'Sônia Faria', stepIdx: 1, daysInStep: 1, responsavel: 'Douglas', status: 'ativo' },
      { id: 'l8',  company: 'MedCenter LTDA', contact: 'Dr. Hugo Lima', stepIdx: 2, daysInStep: 3, responsavel: 'Douglas', status: 'ativo' },
      { id: 'l9',  company: 'AgroSul SA', contact: 'Renata Costa', stepIdx: 3, daysInStep: 4, responsavel: 'Douglas', status: 'ativo' },
      { id: 'l10', company: 'ConnectBR MEI', contact: 'Felipe Dias', stepIdx: 4, daysInStep: 2, responsavel: 'Douglas', status: 'ativo' },
      { id: 'l11', company: 'StartHub LTDA', contact: 'Bianca Martins', stepIdx: 5, daysInStep: 6, responsavel: 'Douglas', status: 'ativo' },
    ],
  },
  {
    id: 'f3', color: '--amber',
    nome: 'Reativação de Inativos',
    descricao: 'Win-back para leads ou clientes sem contato há mais de 60 dias.',
    trigger: 'Sem interação há 60 dias',
    status: 'ativo', contacts: 12, responseRate: 11, crmConversion: 2, dropOffStep: 1,
    steps: [
      { id: 's3a', type: 'email',    delay: 0, assunto: 'Sumiu! Posso te ajudar com algo?', corpo: 'Oi [Nome], faz um tempo que não conversamos. Muita coisa boa aconteceu por aqui...', integration: 'resend', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 12, responded: 5 },
      { id: 's3b', type: 'whatsapp', delay: 3, template: 'Oi [Nome]! Vi que você não recebeu meu e-mail. Tudo bem por aí?', roteiro: 'Mensagem curta e direta. Perguntar sobre momento atual da empresa.', responsavel: 'Douglas', hasBranch: true, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 9, responded: 3 },
      { id: 's3c', type: 'email',    delay: 4, assunto: 'Novidade do produto + condição especial', corpo: 'Oi [Nome], lançamos uma funcionalidade que parece feita para o seu caso...', integration: 'resend', condition: 'auto', hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 7, responded: 2 },
      { id: 's3d', type: 'ligacao',  delay: 7, objetivo: 'Última tentativa de reconexão', script: 'Ligação curta. Perguntar se ainda faz sentido. Oferecer desconto especial para reativação.', responsavel: 'Douglas', hasBranch: true, branchA: { action: 'add_crm' }, branchB: { action: 'discard' }, reached: 5, responded: 1 },
      { id: 's3e', type: 'email',    delay: 7, assunto: 'Vou te remover da lista — confirma?', corpo: 'Oi [Nome], tentei algumas vezes mas entendo que pode não ser o momento. Se mudar de ideia, é só responder este e-mail...', integration: 'resend', condition: 'auto', hasBranch: false, branchA: { action: 'end_flow' }, branchB: { action: 'discard' }, reached: 4, responded: 1 },
    ],
    leads: [
      { id: 'l12', company: 'OldTech LTDA', contact: 'Márcio Braga', stepIdx: 1, daysInStep: 1, responsavel: 'Douglas', status: 'ativo' },
      { id: 'l13', company: 'Retro Systems', contact: 'Cláudia Neves', stepIdx: 2, daysInStep: 5, responsavel: 'Douglas', status: 'ativo' },
      { id: 'l14', company: 'PastBiz MEI', contact: 'André Moura', stepIdx: 3, daysInStep: 8, responsavel: 'Douglas', status: 'ativo' },
    ],
  },
];

const TEMPLATES = [
  { id: 'tm1', channel: 'email', nome: 'Introdução + Proposta de Valor', assunto: 'Uma pergunta rápida sobre [Empresa] 🚀', tags: ['Outbound', 'Primeiro contato'], openRate: 45, responseRate: 12, uses: 134, status: 'ativo', updatedAt: '12/05/2026', preview: 'Olá [Nome], vi que a [Empresa] atua no segmento de [Segmento]. Muitos dos nossos clientes conseguiram [Resultado] em [Prazo]...', content: `Olá [Nome],\n\nVi que a [Empresa] atua no segmento de [Segmento] e queria compartilhar algo relevante.\n\nMuitos dos nossos clientes nesse mercado conseguiram [Resultado] em [Prazo]. O [Cliente Referência], por exemplo, aumentou sua conversão em 35% no primeiro trimestre.\n\nFaria sentido conversar 20 minutos para entender a realidade de vocês?\n\nTenho horários em [Dia 1] ou [Dia 2] — funciona?\n\nAbraços,\n[Seu Nome]` },
  { id: 'tm2', channel: 'whatsapp', nome: 'Follow-up Pós Reunião', assunto: 'Mensagem pós-call', tags: ['Follow-up', 'Pós-reunião'], openRate: 78, responseRate: 31, uses: 89, status: 'ativo', updatedAt: '08/05/2026', preview: 'Oi [Nome]! Que ótima conversa 🤝 Conforme alinhamos, vou te enviar a proposta até amanhã com escopo, investimento...', content: `Oi [Nome]! Que ótima conversa tivemos 🤝\n\nConforme alinhamos, vou te enviar a proposta até amanhã com:\n✅ Escopo do projeto\n✅ Investimento e formas de pagamento\n✅ Próximos passos\n\nQualquer dúvida é só chamar. Um abraço! 🚀` },
  { id: 'tm3', channel: 'email', nome: 'Case de Sucesso', assunto: 'Como a [Empresa Similar] cresceu [X]% com a gente', tags: ['Nurturing', 'Social proof'], openRate: 52, responseRate: 8, uses: 67, status: 'ativo', updatedAt: '22/04/2026', preview: 'Olá [Nome], quero te contar a história da [Empresa Similar], que tinha o mesmo desafio que vocês...', content: `Olá [Nome],\n\nQuero te contar a história da [Empresa Similar], que tinha o mesmo desafio que vocês: [Desafio Principal].\n\nEm [Prazo], eles conseguiram:\n📈 [Resultado 1]\n💰 [Resultado 2]\n⏱️ [Resultado 3]\n\nO diferencial? [Diferencial Principal].\n\nConsigo marcar uma call de 15 min para te mostrar como replicamos isso para a [Empresa] de vocês?\n\nAbraços,\n[Seu Nome]` },
  { id: 'tm4', channel: 'whatsapp', nome: 'Lembrete de Reunião', assunto: 'Lembrete call', tags: ['Reunião', 'Lembrete'], openRate: 85, responseRate: 42, uses: 203, status: 'ativo', updatedAt: '15/05/2026', preview: 'Oi [Nome]! Confirmando nossa conversa amanhã às [Hora] 🗓 Vou te enviar o link do Meet...', content: `Oi [Nome]! 👋\n\nSó confirmando nossa conversa amanhã, [Data], às [Hora] 🗓\n\n📎 Link: [Link Meet]\n⏱️ Duração: 30 minutos\n📋 Pauta: [Tópicos]\n\nSe precisar remarcar, é só avisar!\n\nAté amanhã 🚀` },
  { id: 'tm5', channel: 'email', nome: 'E-mail de Reativação', assunto: 'Ainda faz sentido conversarmos, [Nome]?', tags: ['Reativação', 'Win-back'], openRate: 33, responseRate: 9, uses: 41, status: 'ativo', updatedAt: '10/04/2026', preview: 'Oi [Nome], tentei contato algumas vezes mas entendo que o timing pode não ser ideal agora...', content: `Oi [Nome],\n\nTentei contato algumas vezes mas entendo que o timing pode não ser ideal agora.\n\nSó queria deixar registrado que:\n→ Nossa plataforma evoluiu bastante desde nossa última conversa\n→ Temos novidades que se encaixam no [Desafio mencionado]\n→ Condição especial para retomadas até [Data]\n\nSe não fizer mais sentido, tudo bem — é só me falar!\n\nSe tiver interesse: [Link Calendly]\n\nAbraços,\n[Seu Nome]` },
  { id: 'tm6', channel: 'linkedin', nome: 'Conexão Inicial LinkedIn', assunto: 'Mensagem de conexão', tags: ['LinkedIn', 'Outbound'], openRate: null, responseRate: 15, uses: 78, status: 'ativo', updatedAt: '01/05/2026', preview: 'Olá [Nome]! Vi que você está à frente do comercial na [Empresa]. Tenho trabalhado com empresas de [Segmento]...', content: `Olá [Nome]!\n\nVi que você está à frente do comercial na [Empresa] e queria conectar.\n\nTenho trabalhado com empresas de [Segmento] para [Resultado Principal] — sem precisar contratar mais vendedores.\n\nSeria legal trocar uma ideia sobre os desafios de vocês. Posso te enviar algo útil?\n\nAbraços! 👋` },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────────── */

function getCumulativeDays(steps) {
  return steps.reduce((acc, step, i) => {
    acc.push(i === 0 ? 0 : (acc[i - 1] || 0) + step.delay);
    return acc;
  }, []);
}

function getStepTitle(step) {
  if (step.type === 'email') return step.assunto || 'Sem assunto';
  if (step.type === 'whatsapp') return step.template ? step.template.slice(0, 60) + (step.template.length > 60 ? '…' : '') : 'Sem template';
  return step.objetivo || 'Sem objetivo';
}

function uid() {
  return `s${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeStep(type) {
  const base = { id: uid(), type, delay: 1, template_id: null, hasBranch: false, branchA: { action: 'next_step' }, branchB: { action: 'next_step' }, reached: 0, responded: 0 };
  if (type === 'email')    return { ...base, assunto: '', corpo: '', integration: 'resend', condition: 'auto' };
  if (type === 'whatsapp') return { ...base, template: '', roteiro: '', responsavel: '' };
  return { ...base, objetivo: '', script: '', responsavel: '' };
}

/* ─── Row mappers ────────────────────────────────────────────────────────────── */

function ddmmyyyyR(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}
function parseBRDateR(s) {
  if (!s || !s.includes('/')) return new Date().toISOString();
  const [d, m, y] = s.split('/');
  return new Date(`${y}-${m}-${d}`).toISOString();
}

function fluxoFromRow(r) {
  return { id: r.id, color: r.cor, nome: r.nome, descricao: r.descricao, trigger: r.trigger_texto, status: r.status, steps: r.steps ?? [], leads: [], contacts: 0, responseRate: 0, crmConversion: 0, dropOffStep: 0 };
}
function fluxoLeadFromRow(r) {
  return {
    id:             r.id,
    company:        r.company        ?? '',
    contact:        r.contact        ?? '',
    stepIdx:        r.step_idx       ?? 0,
    daysInStep:     r.days_in_step   ?? 0,
    responsavel:    r.responsavel    ?? '',
    status:         r.status         ?? 'ativo',
    // vínculo polimórfico (Migration 3)
    leadId:         r.lead_id        ?? null,
    clienteId:      r.cliente_id     ?? null,
    origem:         r.origem         ?? 'avulso',
    email:          r.email          ?? null,
    // resultado do último passo
    outcome:        r.outcome        ?? null,
    outcomeNotes:   r.outcome_notes  ?? null,
    // controle temporal real
    lastContactAt:  r.last_contact_at  ?? null,
    nextStepDueAt:  r.next_step_due_at ?? null,
  };
}
function templateFromRow(r) {
  return { id: r.id, channel: r.channel, nome: r.nome, assunto: r.assunto, corpo: r.corpo, preview: r.preview, tags: r.tags ?? [], openRate: r.open_rate, responseRate: r.response_rate, uses: r.uses, status: r.status, updatedAt: ddmmyyyyR(r.atualizado_em), content: r.corpo };
}

/* ─── Small components ───────────────────────────────────────────────────────── */

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in srgb, var(${color}) 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color: `var(${color})` }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  const cfg = STEP_TYPE_CFG[type];
  if (!cfg) return null;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: `color-mix(in srgb, var(${cfg.badgeColor}) 15%, transparent)`, color: `var(${cfg.badgeColor})` }}>
      {cfg.badge}
    </span>
  );
}

function ChannelBadge({ channel }) {
  const cfg = CHANNEL_CFG[channel];
  if (!cfg) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 11, background: cfg.bg, color: `var(${cfg.color})` }}>
      <cfg.Icon size={10} />{cfg.label}
    </span>
  );
}

function CSSBar({ pct, color = '--accent', height = 4 }) {
  return (
    <div style={{ height, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct || 0)}%`, background: `var(${color})`, borderRadius: 2, transition: 'width .3s' }} />
    </div>
  );
}

function FluxoStatusBadge({ status }) {
  const cfg = status === 'ativo'
    ? { label: 'Ativo',   bg: 'rgba(45,212,160,0.15)', color: 'var(--green)' }
    : { label: 'Pausado', bg: 'rgba(240,168,50,0.15)',  color: 'var(--amber)' };
  return <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
}

/* ─── StepCard ───────────────────────────────────────────────────────────────── */

function StepCard({ step, index, cumDay, fluxoColor, expanded, onToggle, onChange, onDelete, dragHandleProps, isDragging, templates, onCreateTemplate }) {
  const cfg = STEP_TYPE_CFG[step.type];
  const isManual = step.type !== 'email';

  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [saveAsPending, setSaveAsPending] = useState(false);
  const [saveAsError, setSaveAsError] = useState('');
  const [saveAsJustCreated, setSaveAsJustCreated] = useState(null);

  const tplChannel = STEP_TYPE_TO_TPL_CHANNEL[step.type];
  const compatibleTpls = (templates ?? []).filter(t => t.channel === tplChannel && t.status !== 'inativo');
  const linkedTpl = step.template_id ? (templates ?? []).find(t => t.id === step.template_id) : null;
  const isLinked = !!linkedTpl;

  function handleLink(tpl) {
    onChange({ template_id: tpl.id, ...applyTplToStep(step, tpl) });
    setShowLinkPicker(false);
    setSaveAsJustCreated(null);
  }

  function handleUnlink() {
    onChange({ template_id: null });
  }

  async function handleSaveAs(e) {
    e.preventDefault();
    if (!saveAsName.trim()) return;
    setSaveAsPending(true); setSaveAsError('');
    const result = await onCreateTemplate({ channel: tplChannel, nome: saveAsName.trim(), ...tplContentFromStep(step) });
    if (result?.error) { setSaveAsError(result.error); setSaveAsPending(false); }
    else { setSaveAsJustCreated(result?.tpl ?? null); setShowSaveAs(false); setSaveAsName(''); setSaveAsPending(false); }
  }

  const roReadOnly = { width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-body)', opacity: 0.75 };

  return (
    <div style={{
      background: isDragging ? 'var(--bg3)' : 'var(--bg2)',
      border: `1px solid ${expanded ? `var(${fluxoColor})` : 'var(--border)'}`,
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
      transition: 'border-color .15s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
        onClick={onToggle}>
        <div {...dragHandleProps} onClick={(e) => e.stopPropagation()}
          style={{ color: 'var(--text3)', cursor: 'grab', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <GripVertical size={14} />
        </div>

        <span style={{ fontSize: 10, fontWeight: 600, color: `var(${fluxoColor})`, background: `color-mix(in srgb, var(${fluxoColor}) 15%, transparent)`, padding: '2px 7px', borderRadius: 8, flexShrink: 0, fontFamily: 'var(--font-display)' }}>
          D+{cumDay}
        </span>

        <div style={{ width: 26, height: 26, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <cfg.Icon size={13} style={{ color: `var(${cfg.color})` }} />
        </div>

        <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getStepTitle(step)}
        </span>

        {isLinked && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, fontSize: 10, background: 'rgba(45,212,160,0.12)', color: 'var(--green)', flexShrink: 0 }}>
            <Check size={9} /> Template
          </span>
        )}

        <TypeBadge type={step.type} />

        {step.hasBranch && (
          <GitBranch size={12} style={{ color: 'var(--purple)', flexShrink: 0 }} title="Bifurcação ativa" />
        )}

        <ChevronDown size={13} style={{ color: 'var(--text3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />

        <PermissionGate module="regua" action="edit">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            title="Remover step">
            <Trash2 size={12} />
          </button>
        </PermissionGate>
      </div>

      {/* Expanded fields */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'var(--bg3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>

            {/* Delay */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', width: 80 }}>Delay (dias)</label>
              <input type="number" min="0" value={step.delay}
                onChange={(e) => onChange({ delay: Math.max(0, parseInt(e.target.value) || 0) })}
                style={{ width: 60, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}
              />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>após step anterior</span>
            </div>

            {/* ── Template link panel ── */}
            {tplChannel && (isLinked ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(45,212,160,0.08)', border: '1px solid rgba(45,212,160,0.25)', borderRadius: 8 }}>
                  <Check size={12} style={{ color: 'var(--green)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, color: 'var(--green)' }}>Vinculado: <strong>{linkedTpl.nome}</strong></span>
                  <button onClick={handleUnlink}
                    style={{ fontSize: 11, color: 'var(--text3)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                    Desvincular
                  </button>
                </div>
                <div style={{ padding: '6px 10px', background: 'rgba(240,168,50,0.08)', border: '1px solid rgba(240,168,50,0.2)', borderRadius: 8, fontSize: 11, color: 'var(--amber)', lineHeight: 1.5 }}>
                  Este passo usa um template. Para alterar o texto, edite o template ou clique em "Desvincular".
                </div>
              </>
            ) : (
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setShowLinkPicker(v => !v); setShowSaveAs(false); setSaveAsJustCreated(null); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--accent2)', background: 'rgba(91,110,245,0.08)', border: '1px solid rgba(91,110,245,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <ArrowRight size={11} /> Usar um template{compatibleTpls.length > 0 ? ` (${compatibleTpls.length})` : ''}
                </button>
                {showLinkPicker && (
                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 20, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, width: 290, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
                    {compatibleTpls.length === 0 ? (
                      <div style={{ padding: 14, fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
                        Nenhum template de {CHANNEL_CFG[tplChannel]?.label ?? tplChannel} disponível
                      </div>
                    ) : compatibleTpls.map((t, ti) => (
                      <button key={t.id} onClick={() => handleLink(t)}
                        style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', borderBottom: ti < compatibleTpls.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{t.nome}</div>
                        {t.assunto && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.assunto}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Offer to link after save-as */}
            {saveAsJustCreated && (
              <div style={{ padding: '8px 10px', background: 'rgba(45,212,160,0.08)', border: '1px solid rgba(45,212,160,0.25)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--green)', flex: 1 }}>Template "{saveAsJustCreated.nome}" criado!</span>
                <button onClick={() => { handleLink(saveAsJustCreated); setSaveAsJustCreated(null); }}
                  style={{ fontSize: 11, color: 'var(--green)', background: 'rgba(45,212,160,0.15)', border: '1px solid rgba(45,212,160,0.3)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                  Vincular agora
                </button>
                <button onClick={() => setSaveAsJustCreated(null)}
                  style={{ fontSize: 11, color: 'var(--text3)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>✕</button>
              </div>
            )}

            {/* Email fields */}
            {step.type === 'email' && (
              <>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Assunto</label>
                  {isLinked
                    ? <div style={roReadOnly}>{step.assunto}</div>
                    : <input value={step.assunto} onChange={(e) => onChange({ assunto: e.target.value })}
                        placeholder="Assunto do e-mail..."
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}
                      />
                  }
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Corpo</label>
                  {isLinked
                    ? <pre style={{ ...roReadOnly, whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6, minHeight: 80 }}>{step.corpo}</pre>
                    : <textarea value={step.corpo} onChange={(e) => onChange({ corpo: e.target.value })}
                        rows={4} placeholder="Conteúdo do e-mail..."
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
                      />
                  }
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Integração</label>
                    <select value={step.integration} onChange={(e) => onChange({ integration: e.target.value })}
                      style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                      <option value="resend">Resend (grátis até 3k/mês)</option>
                      <option value="mailchimp">Mailchimp (grátis até 1k/mês)</option>
                      <option value="rdstation">RD Station</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Avanço</label>
                    <select value={step.condition} onChange={(e) => onChange({ condition: e.target.value })}
                      style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                      <option value="auto">Automático após delay</option>
                      <option value="manual">Aguardar ação manual</option>
                    </select>
                  </div>
                </div>
                <div style={{ padding: '8px 10px', background: 'rgba(91,110,245,0.08)', border: '1px solid rgba(91,110,245,0.2)', borderRadius: 8, fontSize: 11, color: 'var(--accent2)', display: 'flex', gap: 6 }}>
                  <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  Integrações de e-mail requerem configuração externa. Custos adicionais podem se aplicar além do plano gratuito.
                </div>
              </>
            )}

            {/* WhatsApp fields */}
            {step.type === 'whatsapp' && (
              <>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Template de mensagem</label>
                  {isLinked
                    ? <pre style={{ ...roReadOnly, whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6, minHeight: 60 }}>{step.template}</pre>
                    : <textarea value={step.template} onChange={(e) => onChange({ template: e.target.value })}
                        rows={3} placeholder="Mensagem a ser enviada..."
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
                      />
                  }
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Roteiro de abordagem</label>
                  <textarea value={step.roteiro} onChange={(e) => onChange({ roteiro: e.target.value })}
                    rows={2} placeholder="Dicas para o responsável durante a abordagem..."
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Responsável</label>
                  <input value={step.responsavel} onChange={(e) => onChange({ responsavel: e.target.value })}
                    placeholder="Nome do responsável..."
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}
                  />
                </div>
              </>
            )}

            {/* Ligação fields */}
            {step.type === 'ligacao' && (
              <>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Objetivo da call</label>
                  {isLinked
                    ? <div style={roReadOnly}>{step.objetivo}</div>
                    : <input value={step.objetivo} onChange={(e) => onChange({ objetivo: e.target.value })}
                        placeholder="O que deve ser alcançado nesta ligação..."
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}
                      />
                  }
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Script de ligação</label>
                  {isLinked
                    ? <pre style={{ ...roReadOnly, whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6, minHeight: 60 }}>{step.script}</pre>
                    : <textarea value={step.script} onChange={(e) => onChange({ script: e.target.value })}
                        rows={3} placeholder="Script para conduzir a ligação..."
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
                      />
                  }
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Responsável</label>
                  <input value={step.responsavel} onChange={(e) => onChange({ responsavel: e.target.value })}
                    placeholder="Nome do responsável..."
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}
                  />
                </div>
              </>
            )}

            {/* Salvar como template (only when not linked) */}
            {!isLinked && tplChannel && (
              <div>
                {!showSaveAs ? (
                  <button onClick={() => { setShowSaveAs(true); setShowLinkPicker(false); setSaveAsJustCreated(null); }}
                    style={{ fontSize: 11, color: 'var(--text3)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    Salvar como template
                  </button>
                ) : (
                  <form onSubmit={handleSaveAs} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input value={saveAsName} onChange={e => setSaveAsName(e.target.value)}
                      placeholder="Nome do template..." autoFocus
                      style={{ flex: 1, minWidth: 160, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}
                    />
                    <button type="submit" disabled={!saveAsName.trim() || saveAsPending}
                      style={{ padding: '5px 10px', borderRadius: 6, background: saveAsName.trim() && !saveAsPending ? 'var(--accent)' : 'var(--bg3)', color: saveAsName.trim() && !saveAsPending ? '#fff' : 'var(--text3)', border: 'none', cursor: saveAsName.trim() && !saveAsPending ? 'pointer' : 'not-allowed', fontSize: 11, fontFamily: 'var(--font-body)' }}>
                      {saveAsPending ? '...' : 'Salvar'}
                    </button>
                    <button type="button" onClick={() => { setShowSaveAs(false); setSaveAsName(''); setSaveAsError(''); }}
                      style={{ padding: '5px 8px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-body)' }}>
                      Cancelar
                    </button>
                    {saveAsError && <div style={{ width: '100%', fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{saveAsError}</div>}
                  </form>
                )}
              </div>
            )}

            {/* Branching (manual steps only) */}
            {isManual && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: step.hasBranch ? 10 : 0 }}>
                  <GitBranch size={13} style={{ color: 'var(--purple)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Bifurcação condicional</span>
                  <button onClick={() => onChange({ hasBranch: !step.hasBranch })}
                    style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 20, fontSize: 11, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s',
                      background: step.hasBranch ? 'rgba(176,110,245,0.15)' : 'transparent',
                      borderColor: step.hasBranch ? 'rgba(176,110,245,0.4)' : 'var(--border)',
                      color: step.hasBranch ? 'var(--purple)' : 'var(--text3)',
                    }}>
                    {step.hasBranch ? 'Ativa' : 'Ativar'}
                  </button>
                </div>

                {step.hasBranch && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { key: 'branchA', label: 'Path A — Respondeu', color: '--green' },
                      { key: 'branchB', label: 'Path B — Sem resposta', color: '--red' },
                    ].map(({ key, label, color }) => (
                      <div key={key} style={{ padding: '10px 12px', background: 'var(--bg4)', borderRadius: 8, border: `1px solid color-mix(in srgb, var(${color}) 25%, transparent)` }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: `var(${color})`, marginBottom: 6 }}>{label}</div>
                        <select value={step[key].action}
                          onChange={(e) => onChange({ [key]: { action: e.target.value } })}
                          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', fontSize: 11, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}>
                          {BRANCH_ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── AddStepModal ───────────────────────────────────────────────────────────── */

function AddStepModal({ onAdd, onClose }) {
  const [selected, setSelected] = useState(null);
  const [delay, setDelay] = useState(1);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 440, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Adicionar step</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>

        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Escolha o tipo de step:</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {Object.entries(STEP_TYPE_CFG).map(([type, cfg]) => (
              <button key={type} onClick={() => setSelected(type)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'all .15s',
                  background: selected === type ? `color-mix(in srgb, var(${cfg.color}) 12%, var(--bg3))` : 'var(--bg2)',
                  border: `1px solid ${selected === type ? `var(${cfg.color})` : 'var(--border)'}`,
                }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <cfg.Icon size={15} style={{ color: `var(${cfg.color})` }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                    {cfg.label}
                    <TypeBadge type={type} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                    {type === 'email' && 'Disparo automático via integração (Resend / Mailchimp / RD Station)'}
                    {type === 'whatsapp' && 'Cria tarefa manual para o responsável com prazo e roteiro'}
                    {type === 'ligacao' && 'Cria tarefa de ligação com script e objetivo definidos'}
                  </div>
                </div>
                {selected === type && <Check size={14} style={{ color: `var(${cfg.color})`, flexShrink: 0 }} />}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>Delay após step anterior:</label>
            <input type="number" min="0" value={delay} onChange={(e) => setDelay(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: 60, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>dias</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancelar</button>
            <button onClick={() => { if (selected) onAdd(selected, delay); }}
              disabled={!selected}
              style={{ flex: 2, padding: '8px', borderRadius: 8, background: selected ? 'var(--accent)' : 'var(--bg3)', color: selected ? '#fff' : 'var(--text3)', border: 'none', fontSize: 13, fontWeight: 500, cursor: selected ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', transition: 'all .15s' }}>
              Adicionar step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ResultModal ────────────────────────────────────────────────────────────── */

function ResultModal({ lead, step, onSave, onClose }) {
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState('');
  const isCall = step?.type === 'ligacao';
  const cfg = step ? STEP_TYPE_CFG[step.type] : null;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 460, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          {cfg && (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <cfg.Icon size={15} style={{ color: `var(${cfg.color})` }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Registrar resultado</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{lead.company} — {lead.contact}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Qual foi o resultado?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {OUTCOMES.map((o) => (
                <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background .1s',
                  background: outcome === o.value ? 'var(--bg3)' : 'transparent',
                  border: `1px solid ${outcome === o.value ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                  <input type="radio" name="outcome" value={o.value} checked={outcome === o.value}
                    onChange={() => setOutcome(o.value)}
                    style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          {isCall && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>Humor da call</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {CALL_MOODS.map((m) => (
                  <button key={m} onClick={() => setMood(m)}
                    style={{ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s',
                      background: mood === m ? 'var(--accent)' : 'var(--bg2)',
                      border: `1px solid ${mood === m ? 'var(--accent)' : 'var(--border)'}`,
                      color: mood === m ? '#fff' : 'var(--text3)',
                    }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Anotações</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3} placeholder="O que foi discutido, objeções levantadas, próximos passos combinados..."
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
            />
          </div>

          {outcome && (
            <div style={{ padding: '8px 12px', background: 'rgba(91,110,245,0.08)', borderRadius: 8, border: '1px solid rgba(91,110,245,0.2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Bot size={12} style={{ color: 'var(--accent2)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--accent2)', lineHeight: 1.5 }}>
                {outcome === 'interest' && 'Sugestão IA: Lead quente — mover para próximo step e considerar adicionar ao CRM.'}
                {outcome === 'callback' && 'Sugestão IA: Agendar retorno em até 48h enquanto o interesse está fresco.'}
                {outcome === 'no_response' && 'Sugestão IA: Aguardar mais 2 dias e tentar por canal alternativo.'}
                {outcome === 'no_interest' && 'Sugestão IA: Registrar motivo e descartar. Considerar reativação em 90 dias.'}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancelar</button>
            <button onClick={() => { if (outcome) onSave({ outcome, notes, mood }); }}
              disabled={!outcome}
              style={{ flex: 2, padding: '8px', borderRadius: 8, background: outcome ? 'var(--accent)' : 'var(--bg3)', color: outcome ? '#fff' : 'var(--text3)', border: 'none', fontSize: 13, fontWeight: 500, cursor: outcome ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)' }}>
              Salvar resultado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MetricsCard ────────────────────────────────────────────────────────────── */

function MetricsCard({ fluxo }) {
  const cumulDays = getCumulativeDays(fluxo.steps);
  const maxReached = fluxo.steps[0]?.reached || 1;

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Leads ativos',   value: fluxo.leads?.filter(l => l.status === 'ativo').length ?? 0, color: '--accent' },
          { label: 'Taxa de resposta', value: `${fluxo.responseRate}%`,  color: fluxo.responseRate >= 15 ? '--green' : '--amber' },
          { label: 'Maior abandono', value: `Step ${fluxo.dropOffStep + 1}`, color: '--red' },
          { label: 'Conversão CRM',  value: `${fluxo.crmConversion}%`,  color: '--purple' },
        ].map((m) => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: `var(${m.color})`, fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>{m.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8 }}>ALCANCE POR STEP</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {fluxo.steps.map((step, i) => {
            const cfg = STEP_TYPE_CFG[step.type];
            const pct = Math.round((step.reached / maxReached) * 100);
            return (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)', width: 28, flexShrink: 0 }}>D+{cumulDays[i]}</span>
                <cfg.Icon size={10} style={{ color: `var(${cfg.color})`, flexShrink: 0 }} />
                <CSSBar pct={pct} color={step.reached > 0 && i === fluxo.dropOffStep ? '--red' : cfg.color} />
                <span style={{ fontSize: 10, color: 'var(--text3)', width: 34, textAlign: 'right', flexShrink: 0 }}>{step.reached}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── LeadsTable ─────────────────────────────────────────────────────────────── */

function LeadsTable({ leads, steps, onRegisterResult, onRemove }) {
  if (!leads || leads.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
        Nenhum lead ativo neste fluxo.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Empresa', 'Step atual', 'Dias no step', 'Próxima ação', 'Responsável', ''].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.filter(l => l.status === 'ativo').map((lead) => {
            const step = steps[lead.stepIdx];
            const cfg = step ? STEP_TYPE_CFG[step.type] : null;
            const isOverdue = lead.daysInStep > (step?.delay || 0) + 2;
            const cumulDays = getCumulativeDays(steps);

            return (
              <tr key={lead.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text)' }}>{lead.company}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 11 }}>{lead.contact}</div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {step && cfg ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: `var(${cfg.color})`, fontWeight: 600 }}>D+{cumulDays[lead.stepIdx]}</span>
                      <cfg.Icon size={11} style={{ color: `var(${cfg.color})` }} />
                      <TypeBadge type={step.type} />
                    </div>
                  ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ color: isOverdue ? 'var(--red)' : 'var(--text2)', fontWeight: isOverdue ? 600 : 400 }}>
                    {lead.daysInStep}d {isOverdue && '⚠'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', maxWidth: 180 }}>
                  <span style={{ color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                    {step ? getStepTitle(step) : '—'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ color: 'var(--text2)' }}>{lead.responsavel}</span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {step && step.type !== 'email' && (
                      <button onClick={() => onRegisterResult(lead, step)}
                        style={{ padding: '4px 9px', borderRadius: 7, background: 'var(--bg4)', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                        Registrar
                      </button>
                    )}
                    <button onClick={() => onRemove(lead.id)}
                      style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── FlowBuilder ────────────────────────────────────────────────────────────── */

function AddStepButton({ onClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', opacity: 0, transition: 'opacity .15s' }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
      onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <button onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'var(--bg3)', border: '1px dashed var(--border2)', fontSize: 11, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
        <Plus size={10} /> step
      </button>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function FlowBuilder({ fluxo, expandedStepId, onToggleStep, onUpdateStep, onDeleteStep, onReorderSteps, onAddStep, templates, onCreateTemplate }) {
  const cumulDays = getCumulativeDays(fluxo.steps);

  function handleDragEnd(result) {
    if (!result.destination || result.destination.index === result.source.index) return;
    const arr = [...fluxo.steps];
    const [removed] = arr.splice(result.source.index, 1);
    arr.splice(result.destination.index, 0, removed);
    onReorderSteps(arr);
  }

  return (
    <div>
      <PermissionGate module="regua" action="edit">
        <AddStepButton onClick={() => onAddStep(0)} />
      </PermissionGate>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`flow-${fluxo.id}`}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {fluxo.steps.map((step, i) => (
                <Draggable key={step.id} draggableId={step.id} index={i}>
                  {(dragProvided, snapshot) => (
                    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                      <StepCard
                        step={step}
                        index={i}
                        cumDay={cumulDays[i]}
                        fluxoColor={fluxo.color}
                        expanded={expandedStepId === step.id}
                        onToggle={() => onToggleStep(step.id)}
                        onChange={(updates) => onUpdateStep(i, updates)}
                        onDelete={() => onDeleteStep(i)}
                        dragHandleProps={dragProvided.dragHandleProps}
                        isDragging={snapshot.isDragging}
                        templates={templates}
                        onCreateTemplate={onCreateTemplate}
                      />
                      <PermissionGate module="regua" action="edit">
                        <AddStepButton onClick={() => onAddStep(i + 1)} />
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
  );
}

/* ─── NovoFluxoModal ─────────────────────────────────────────────────────────── */

function NovoFluxoModal({ onSave, onClose }) {
  const [modeloId, setModeloId] = useState(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [trigger, setTrigger] = useState('');
  const [cor, setCor] = useState('--accent');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function selectModelo(id) {
    if (id === modeloId) {
      setModeloId(null); setNome(''); setDescricao(''); setTrigger(''); setCor('--accent');
      return;
    }
    const m = MODELOS_PRONTOS.find(m => m.id === id);
    if (m) { setModeloId(id); setNome(m.nome); setDescricao(m.descricao); setTrigger(m.trigger); setCor(m.color); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) { setError('O nome do fluxo é obrigatório.'); return; }
    setSaving(true); setError('');
    const steps = modeloId
      ? (MODELOS_PRONTOS.find(m => m.id === modeloId)?.steps ?? []).map(s => ({ ...s, id: uid() }))
      : [];
    const err = await onSave({ nome: nome.trim(), descricao: descricao.trim(), trigger: trigger.trim(), cor }, steps);
    if (err) { setError(err); setSaving(false); } else onClose();
  }

  const modelo = modeloId ? MODELOS_PRONTOS.find(m => m.id === modeloId) : null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Novo fluxo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        {/* Ponto de partida */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: 10 }}>PONTO DE PARTIDA</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => { setModeloId(null); setNome(''); setDescricao(''); setTrigger(''); setCor('--accent'); }}
              style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: `1px solid ${modeloId === null ? 'var(--accent)' : 'var(--border)'}`, background: modeloId === null ? 'rgba(91,110,245,0.1)' : 'var(--bg3)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>Em branco</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Criar do zero</div>
            </button>
            {MODELOS_PRONTOS.map(m => {
              const active = modeloId === m.id;
              return (
                <button key={m.id} onClick={() => selectModelo(m.id)}
                  style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: `1px solid ${active ? `var(${m.color})` : 'var(--border)'}`, background: active ? `color-mix(in srgb, var(${m.color}) 12%, transparent)` : 'var(--bg3)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{m.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{m.steps.length} passos · {m.trigger}</div>
                </button>
              );
            })}
          </div>
          {modelo && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {modelo.steps.map((s, i) => {
                const cfg = STEP_TYPE_CFG[s.type];
                return (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 11, background: cfg.bg, color: `var(${cfg.color})` }}>
                    <cfg.Icon size={10} /> D+{s.delay} {cfg.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Nome do fluxo *', value: nome, set: setNome, placeholder: 'Ex.: Pós-reunião de apresentação' },
            { label: 'Descrição',       value: descricao, set: setDescricao, placeholder: 'Para que serve este fluxo?' },
            { label: 'Gatilho de entrada', value: trigger, set: setTrigger, placeholder: 'Ex.: Proposta enviada sem resposta' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>{label}</label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>Cor</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COR_OPTIONS.map(opt => (
                <button type="button" key={opt.value} onClick={() => setCor(opt.value)} title={opt.label}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: `var(${opt.value})`, border: `2px solid ${cor === opt.value ? '#fff' : 'transparent'}`, outline: `2px solid ${cor === opt.value ? `var(${opt.value})` : 'transparent'}`, cursor: 'pointer', transition: 'all .15s' }} />
              ))}
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(240,92,92,0.1)', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500, opacity: saving ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
              {saving ? 'Criando…' : 'Criar fluxo'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ─── EditarFluxoModal ───────────────────────────────────────────────────────── */

function EditarFluxoModal({ fluxo, onSave, onClose }) {
  const [nome, setNome] = useState(fluxo.nome);
  const [descricao, setDescricao] = useState(fluxo.descricao ?? '');
  const [trigger, setTrigger] = useState(fluxo.trigger ?? '');
  const [cor, setCor] = useState(fluxo.color ?? '--accent');
  const [status, setStatus] = useState(fluxo.status ?? 'ativo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) { setError('O nome é obrigatório.'); return; }
    setSaving(true); setError('');
    const err = await onSave(fluxo.id, {
      cor,
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      trigger_texto: trigger.trim() || null,
      status,
    });
    if (err) { setError(err); setSaving(false); } else onClose();
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 460, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Editar fluxo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Nome *',             value: nome,     set: setNome },
            { label: 'Descrição',          value: descricao, set: setDescricao },
            { label: 'Gatilho de entrada', value: trigger,  set: setTrigger },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>{label}</label>
              <input value={value} onChange={e => set(e.target.value)}
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>Cor</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COR_OPTIONS.map(opt => (
                <button type="button" key={opt.value} onClick={() => setCor(opt.value)} title={opt.label}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: `var(${opt.value})`, border: `2px solid ${cor === opt.value ? '#fff' : 'transparent'}`, outline: `2px solid ${cor === opt.value ? `var(${opt.value})` : 'transparent'}`, cursor: 'pointer', transition: 'all .15s' }} />
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>Status</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { value: 'ativo',   label: 'Ativo',   activeColor: '--green', activeBg: 'rgba(45,212,160,0.12)'  },
                { value: 'pausado', label: 'Pausado', activeColor: '--amber', activeBg: 'rgba(240,168,50,0.12)' },
              ].map(opt => (
                <button type="button" key={opt.value} onClick={() => setStatus(opt.value)}
                  style={{ padding: '5px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s',
                    border: `1px solid ${status === opt.value ? `var(${opt.activeColor})` : 'var(--border)'}`,
                    background: status === opt.value ? opt.activeBg : 'transparent',
                    color: status === opt.value ? `var(${opt.activeColor})` : 'var(--text3)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(240,92,92,0.1)', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500, opacity: saving ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ─── FluxoCard ──────────────────────────────────────────────────────────────── */

function FluxoCard({ fluxo, onUpdateSteps, onUpdateLeads, onEdit, onDelete, templates, onCreateTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const [subTab, setSubTab] = useState('steps');
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [addStepPos, setAddStepPos] = useState(null);
  const [resultCtx, setResultCtx] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletePending, setDeletePending] = useState(false);

  async function handleDeleteConfirm() {
    setDeletePending(true);
    const err = await onDelete(fluxo.id);
    if (err) { setDeleteError(err); setDeleteMode(false); setDeletePending(false); }
  }

  function handleToggleStep(id) {
    setExpandedStepId((prev) => prev === id ? null : id);
  }

  function handleUpdateStep(index, updates) {
    const next = fluxo.steps.map((s, i) => i === index ? { ...s, ...updates } : s);
    onUpdateSteps(next);
  }

  function handleDeleteStep(index) {
    onUpdateSteps(fluxo.steps.filter((_, i) => i !== index));
    setExpandedStepId(null);
  }

  function handleAddStep(type, delay) {
    const step = { ...makeStep(type), delay };
    const next = [...fluxo.steps];
    next.splice(addStepPos, 0, step);
    onUpdateSteps(next);
    setAddStepPos(null);
    setExpandedStepId(step.id);
  }

  function handleRegisterResult(lead, step) {
    setResultCtx({ lead, step });
  }

  function handleSaveResult({ outcome, notes, mood }) {
    const next = fluxo.leads.map((l) => {
      if (l.id !== resultCtx.lead.id) return l;
      if (outcome === 'no_interest') return { ...l, status: 'descartado' };
      return { ...l, daysInStep: 0 };
    });
    onUpdateLeads(next);
    setResultCtx(null);
  }

  function handleRemoveLead(leadId) {
    onUpdateLeads(fluxo.leads.filter((l) => l.id !== leadId));
  }

  const activeLeads = fluxo.leads?.filter(l => l.status === 'ativo') ?? [];

  return (
    <>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Header */}
        <div onClick={() => setExpanded((v) => !v)}
          style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: `var(${fluxo.color})`, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{fluxo.nome}</span>
              <FluxoStatusBadge status={fluxo.status} />
              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: 'var(--bg3)', color: 'var(--text3)' }}>
                {fluxo.trigger}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{fluxo.descricao}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            {[
              { label: 'Steps',    value: fluxo.steps.length },
              { label: 'Leads',    value: activeLeads.length, color: '--teal' },
              { label: 'Resposta', value: `${fluxo.responseRate}%`, color: fluxo.responseRate >= 15 ? '--green' : '--amber' },
              { label: 'CRM',      value: `${fluxo.crmConversion}%`, color: '--purple' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.color ? `var(${s.color})` : 'var(--text)' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.label}</div>
              </div>
            ))}
            <PermissionGate module="regua" action="edit">
              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={() => onEdit(fluxo)} title="Editar fluxo"
                  style={{ width: 27, height: 27, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={11} />
                </button>
                {!deleteMode ? (
                  <button onClick={() => { setDeleteMode(true); setDeleteError(''); }} title="Excluir fluxo"
                    style={{ width: 27, height: 27, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={11} />
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'rgba(240,92,92,0.1)', padding: '3px 8px', borderRadius: 8, border: '1px solid rgba(240,92,92,0.3)' }}>
                    <span style={{ fontSize: 11, color: 'var(--red)' }}>Excluir?</span>
                    <button onClick={handleDeleteConfirm} disabled={deletePending}
                      style={{ fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: deletePending ? 'not-allowed' : 'pointer', fontWeight: 600, padding: '0 2px', opacity: deletePending ? 0.6 : 1 }}>
                      Sim
                    </button>
                    <button onClick={() => { setDeleteMode(false); setDeleteError(''); }}
                      style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>
                      Não
                    </button>
                  </div>
                )}
              </div>
            </PermissionGate>
            <ChevronDown size={16} style={{ color: 'var(--text3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </div>
        </div>

        {deleteError && (
          <div style={{ padding: '8px 20px', background: 'rgba(240,92,92,0.08)', borderTop: '1px solid rgba(240,92,92,0.2)', fontSize: 12, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={13} style={{ flexShrink: 0 }} />
            {deleteError}
            <button onClick={() => setDeleteError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={12} /></button>
          </div>
        )}

        {/* Expanded body */}
        {expanded && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
              {[
                { id: 'steps', label: 'Construtor de Fluxo', count: fluxo.steps.length },
                { id: 'leads', label: 'Leads ativos', count: activeLeads.length },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setSubTab(tab.id)}
                  style={{ padding: '9px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)', background: 'transparent',
                    color: subTab === tab.id ? 'var(--text)' : 'var(--text3)',
                    borderBottom: `2px solid ${subTab === tab.id ? `var(${fluxo.color})` : 'transparent'}`,
                    marginBottom: -1,
                  }}>
                  {tab.label}
                  <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 20, fontSize: 10, background: subTab === tab.id ? `color-mix(in srgb, var(${fluxo.color}) 20%, transparent)` : 'var(--bg4)', color: subTab === tab.id ? `var(${fluxo.color})` : 'var(--text3)' }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ padding: '16px 20px 20px', background: 'var(--bg)' }}>
              {subTab === 'steps' ? (
                <>
                  <MetricsCard fluxo={fluxo} />
                  <FlowBuilder
                    fluxo={fluxo}
                    expandedStepId={expandedStepId}
                    onToggleStep={handleToggleStep}
                    onUpdateStep={handleUpdateStep}
                    onDeleteStep={handleDeleteStep}
                    onReorderSteps={onUpdateSteps}
                    onAddStep={(pos) => setAddStepPos(pos)}
                    templates={templates}
                    onCreateTemplate={onCreateTemplate}
                  />
                </>
              ) : (
                <LeadsTable
                  leads={fluxo.leads}
                  steps={fluxo.steps}
                  onRegisterResult={handleRegisterResult}
                  onRemove={handleRemoveLead}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {addStepPos !== null && (
        <AddStepModal onAdd={handleAddStep} onClose={() => setAddStepPos(null)} />
      )}

      {resultCtx && (
        <ResultModal
          lead={resultCtx.lead}
          step={resultCtx.step}
          onSave={handleSaveResult}
          onClose={() => setResultCtx(null)}
        />
      )}
    </>
  );
}

/* ─── NovoTemplateModal ──────────────────────────────────────────────────────── */

function NovoTemplateModal({ onSave, onClose }) {
  const [channel, setChannel] = useState('email');
  const [nome, setNome] = useState('');
  const [assunto, setAssunto] = useState('');
  const [corpo, setCorpo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const channelOpts = [
    { value: 'email',    label: 'E-mail'   },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'phone',    label: 'Ligação'  },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) { setError('O nome é obrigatório.'); return; }
    setSaving(true); setError('');
    const result = await onSave({
      channel,
      nome: nome.trim(),
      assunto: channel === 'whatsapp' ? null : (assunto.trim() || null),
      corpo: corpo.trim() || null,
    });
    if (result?.error) { setError(result.error); setSaving(false); }
    else onClose();
  }

  const labelAssunto = channel === 'phone' ? 'Objetivo' : 'Assunto';
  const labelCorpo   = channel === 'email' ? 'Corpo do e-mail' : channel === 'phone' ? 'Script de ligação' : 'Mensagem';

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Novo template</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>Canal</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {channelOpts.map(opt => {
                const optCfg = CHANNEL_CFG[opt.value];
                const active = channel === opt.value;
                return (
                  <button type="button" key={opt.value} onClick={() => setChannel(opt.value)}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 8px', borderRadius: 10,
                      border: `1px solid ${active ? `var(${optCfg.color})` : 'var(--border)'}`,
                      background: active ? `color-mix(in srgb, var(${optCfg.color}) 12%, transparent)` : 'var(--bg3)',
                      cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    <optCfg.Icon size={15} style={{ color: `var(${optCfg.color})` }} />
                    <span style={{ fontSize: 11, color: active ? `var(${optCfg.color})` : 'var(--text3)' }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Nome *</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              placeholder={channel === 'email' ? 'Ex.: Boas-vindas ao cliente' : channel === 'whatsapp' ? 'Ex.: Follow-up pós-reunião' : 'Ex.: Script de reativação'}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
          </div>
          {channel !== 'whatsapp' && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>{labelAssunto}</label>
              <input value={assunto} onChange={e => setAssunto(e.target.value)}
                placeholder={channel === 'phone' ? 'O que alcançar nesta ligação...' : 'Assunto do e-mail...'}
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>{labelCorpo}</label>
            <textarea value={corpo} onChange={e => setCorpo(e.target.value)}
              rows={channel === 'email' ? 6 : 4}
              placeholder={channel === 'email' ? 'Olá [Nome],\n\n...' : channel === 'phone' ? 'Script para conduzir a conversa...' : 'Oi [Nome]! ...'}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)', resize: 'vertical', lineHeight: 1.6 }} />
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(240,92,92,0.1)', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500, opacity: saving ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
              {saving ? 'Salvando…' : 'Criar template'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ─── TemplateCard ───────────────────────────────────────────────────────────── */

function TemplateCard({ tpl, onOpen }) {
  const cfg = CHANNEL_CFG[tpl.channel];
  return (
    <div onClick={() => onOpen(tpl)}
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer', transition: 'border-color .15s' }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <cfg.Icon size={16} style={{ color: `var(${cfg.color})` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{tpl.nome}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.assunto}</div>
        </div>
        <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, background: 'rgba(45,212,160,0.15)', color: 'var(--green)' }}>Ativo</span>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {tpl.preview}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {tpl.tags.map((t) => (
          <span key={t} style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, background: 'var(--bg3)', color: 'var(--text3)' }}>{t}</span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 10, alignItems: 'center' }}>
        {tpl.openRate !== null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: tpl.openRate >= 40 ? 'var(--green)' : 'var(--amber)' }}>
            <Eye size={11} />{tpl.openRate}% abertura
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: tpl.responseRate >= 15 ? 'var(--green)' : 'var(--text3)' }}>
          <MousePointerClick size={11} />{tpl.responseRate}% resposta
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>{tpl.uses}× usado</span>
      </div>
    </div>
  );
}

/* ─── TemplateModal ──────────────────────────────────────────────────────────── */

function TemplateModal({ tpl, onSave, onClose, fluxos = [] }) {
  const cfg = CHANNEL_CFG[tpl.channel];
  const [editing, setEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const usageCount = fluxos.reduce((acc, f) => acc + (f.steps ?? []).filter(s => s.template_id === tpl.id).length, 0);
  const [content, setContent] = useState(tpl.content);
  const { send, loading, error } = useAI();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  const AI_CHIPS = ['Tornar mais persuasivo', 'Revisar tom de voz', 'Adicionar CTA mais forte', 'Versão mais curta'];
  const docContext = `Template "${tpl.nome}" (canal: ${cfg.label}). Assunto: "${tpl.assunto}". Conteúdo:\n${tpl.content}`;

  async function handleSend(msg) {
    const text = (msg ?? input).trim();
    if (!text) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    const reply = await send(text, docContext, [...messages, userMsg]);
    if (reply) setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <>
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '85vw', height: '85vh', background: 'var(--bg)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <cfg.Icon size={18} style={{ color: `var(${cfg.color})` }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{tpl.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{tpl.assunto}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tpl.openRate !== null && (
              <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={11} />{tpl.openRate}% abertura</span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><MousePointerClick size={11} />{tpl.responseRate}% resposta</span>
            <PermissionGate module="regua" action="edit">
              <button onClick={() => {
                  if (!editing) { setEditing(true); return; }
                  if (usageCount > 0) { setShowConfirm(true); }
                  else { onSave(tpl.id, content); setEditing(false); }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: editing ? 'var(--accent)' : 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: editing ? '#fff' : 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <Pencil size={12} />{editing ? 'Salvar' : 'Editar'}
              </button>
            </PermissionGate>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 3, padding: 24, overflowY: 'auto', borderRight: '1px solid var(--border)' }}>
            {usageCount > 0 && (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(240,168,50,0.08)', border: '1px solid rgba(240,168,50,0.25)', borderRadius: 8, fontSize: 11, color: 'var(--amber)', lineHeight: 1.5, display: 'flex', gap: 6 }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Este template está vinculado a <strong>{usageCount} passo{usageCount !== 1 ? 's' : ''}</strong> em fluxos ativos. Alterações no corpo afetarão todos esses passos.</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <ChannelBadge channel={tpl.channel} />
              {tpl.tags.map((t) => (
                <span key={t} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: 'var(--bg3)', color: 'var(--text3)' }}>{t}</span>
              ))}
            </div>

            {editing ? (
              <textarea value={content} onChange={(e) => setContent(e.target.value)}
                style={{ width: '100%', minHeight: 340, background: 'var(--bg4)', border: '1px solid var(--accent)', borderRadius: 10, padding: 16, fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            ) : (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                {tpl.channel === 'email' && (
                  <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>ASSUNTO:</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{tpl.assunto}</div>
                  </div>
                )}
                <pre style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', margin: 0 }}>
                  {content}
                </pre>
              </div>
            )}

            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>VARIÁVEIS DINÂMICAS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['[Nome]', '[Empresa]', '[Segmento]', '[Resultado]', '[Prazo]', '[Data]', '[Link]'].map((v) => (
                  <code key={v} style={{ padding: '2px 7px', borderRadius: 6, background: 'var(--bg4)', fontSize: 11, color: 'var(--accent2)', border: '1px solid var(--border)' }}>{v}</code>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { label: 'Vezes usado', value: tpl.uses, icon: BarChart2 },
                { label: 'Última atualização', value: tpl.updatedAt, icon: Clock },
                { label: 'Taxa de resposta', value: `${tpl.responseRate}%`, icon: MousePointerClick },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Bot size={14} style={{ color: 'var(--accent2)' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Assistente IA</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(45,212,160,0.12)', color: 'var(--green)' }}>contexto carregado</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && (
                <div style={{ padding: 12, background: 'var(--bg3)', borderRadius: 10, fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, border: '1px solid var(--border)' }}>
                  Posso melhorar este template, ajustar tom de voz ou criar variações. O que prefere?
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: 10, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    background: m.role === 'user' ? 'var(--accent)' : 'var(--bg2)',
                    color: m.role === 'user' ? '#fff' : 'var(--text2)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--border)',
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
              <div style={{ padding: '0 14px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AI_CHIPS.map((chip) => (
                  <button key={chip} onClick={() => handleSend(chip)}
                    style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {error && <div style={{ padding: '4px 14px', fontSize: 11, color: 'var(--red)' }}>{error}</div>}

            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Peça uma melhoria..."
                style={{ flex: 1, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || loading}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!input.trim() || loading) ? 0.5 : 1 }}>
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {showConfirm && createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <AlertTriangle size={20} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Salvar alterações no template?</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                Este template é usado em <strong style={{ color: 'var(--text)' }}>{usageCount} passo{usageCount !== 1 ? 's' : ''}</strong> de fluxo{usageCount !== 1 ? 's' : ''} de comunicação. Salvar vai alterar a mensagem em todos eles, inclusive campanhas que já estejam em andamento. Deseja continuar?
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setShowConfirm(false)}
              style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>
              Cancelar
            </button>
            <button onClick={() => { onSave(tpl.id, content); setEditing(false); setShowConfirm(false); }}
              style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--amber)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)' }}>
              Salvar mesmo assim
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}

/* ─── Sections ───────────────────────────────────────────────────────────────── */

function FluxosSection({ query, fluxos, onUpdateSteps, onUpdateLeads, onCreateFluxo, onUpdateFluxo, onDeleteFluxo, templates, onCreateTemplate }) {
  const { openAI } = useUI();
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [editingFluxo, setEditingFluxo] = useState(null);

  const filtered = fluxos.filter((f) =>
    !query || f.nome.toLowerCase().includes(query.toLowerCase()) || (f.trigger ?? '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>{filtered.length} fluxo{filtered.length !== 1 ? 's' : ''}</span>
        <PermissionGate module="regua" action="edit">
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setShowNovoModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Plus size={13} /> Novo fluxo
            </button>
            <button
              onClick={() => openAI('Crie um novo fluxo de nurturing B2B com trigger de entrada, 5 touchpoints com canais e mensagens-chave, timing entre cada step e métricas para avaliar o sucesso.')}
              title="Gerar fluxo com IA"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 11px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Bot size={13} /> IA
            </button>
          </div>
        </PermissionGate>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((f) => (
          <FluxoCard
            key={f.id}
            fluxo={f}
            onUpdateSteps={(steps) => onUpdateSteps(f.id, steps)}
            onUpdateLeads={(leads) => onUpdateLeads(f.id, leads)}
            onEdit={setEditingFluxo}
            onDelete={onDeleteFluxo}
            templates={templates}
            onCreateTemplate={onCreateTemplate}
          />
        ))}
      </div>

      {showNovoModal && (
        <NovoFluxoModal onSave={onCreateFluxo} onClose={() => setShowNovoModal(false)} />
      )}
      {editingFluxo && (
        <EditarFluxoModal
          fluxo={editingFluxo}
          onSave={onUpdateFluxo}
          onClose={() => setEditingFluxo(null)}
        />
      )}
    </div>
  );
}

function TemplatesSection({ query, templates, onOpen, onCreateTemplate, fluxos = [] }) {
  const { openAI } = useUI();
  const [channelFilter, setChannelFilter] = useState('todos');
  const [showNovoModal, setShowNovoModal] = useState(false);
  const channels = [
    { id: 'todos', label: 'Todos' }, { id: 'email', label: 'E-mail' },
    { id: 'whatsapp', label: 'WhatsApp' }, { id: 'linkedin', label: 'LinkedIn' }, { id: 'phone', label: 'Ligação' },
  ];
  const filtered = templates.filter((t) => {
    const q = !query || t.nome.toLowerCase().includes(query.toLowerCase()) || t.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
    const ch = channelFilter === 'todos' || t.channel === channelFilter;
    return q && ch;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {channels.map((ch) => (
            <button key={ch.id} onClick={() => setChannelFilter(ch.id)}
              style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s',
                background: channelFilter === ch.id ? 'var(--accent)' : 'transparent',
                borderColor: channelFilter === ch.id ? 'var(--accent)' : 'var(--border)',
                color: channelFilter === ch.id ? '#fff' : 'var(--text3)',
              }}>
              {ch.label}
            </button>
          ))}
        </div>
        <PermissionGate module="regua" action="edit">
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setShowNovoModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Plus size={13} /> Novo template
            </button>
            <button
              onClick={() => openAI('Crie um template de e-mail de prospecção fria B2B. Deve ser curto (máx 150 palavras), ter assunto com alta taxa de abertura, variáveis dinâmicas e CTA claro. Foco em resultados, não em features.')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 11px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Bot size={13} /> IA
            </button>
          </div>
        </PermissionGate>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map((t) => <TemplateCard key={t.id} tpl={t} onOpen={onOpen} />)}
      </div>
      {showNovoModal && (
        <NovoTemplateModal onSave={onCreateTemplate} onClose={() => setShowNovoModal(false)} />
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function ReguaComunicacao() {
  const { empresaId } = useAuth();
  const [activeTab, setActiveTab] = useState('fluxos');
  const [query, setQuery] = useState('');
  const [fluxos, setFluxos] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingRegua, setLoadingRegua] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState(null);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    async function load() {
      const [fluxosRes, leadsRes, tplsRes] = await Promise.all([
        supabase.from('regua_fluxos').select('*').eq('empresa_id', empresaId).order('criado_em', { ascending: true }),
        supabase.from('regua_fluxo_leads').select('*').eq('empresa_id', empresaId),
        supabase.from('regua_templates').select('*').eq('empresa_id', empresaId).order('criado_em', { ascending: true }),
      ]);
      if (cancelled) return;
      let fluxoRows = fluxosRes.data ?? [];
      let leadRows = leadsRes.data ?? [];
      let tplRows = tplsRes.data ?? [];

      if (fluxoRows.length === 0) {
        const seedFluxos = FLUXOS_INIT.map(f => ({ cor: f.color, nome: f.nome, descricao: f.descricao, trigger_texto: f.trigger, status: f.status, steps: f.steps }));
        const { data: ins } = await supabase.from('regua_fluxos').insert(seedFluxos).select();
        if (cancelled) return;
        fluxoRows = ins ?? [];
        const seedLeads = [];
        FLUXOS_INIT.forEach((f, i) => {
          const realId = fluxoRows[i]?.id;
          if (!realId) return;
          (f.leads || []).forEach(l => {
            seedLeads.push({ fluxo_id: realId, step_idx: l.stepIdx, days_in_step: l.daysInStep, status: l.status, company: l.company, contact: l.contact, responsavel: l.responsavel });
          });
        });
        if (seedLeads.length) {
          const { data: insL } = await supabase.from('regua_fluxo_leads').insert(seedLeads).select();
          if (cancelled) return;
          leadRows = insL ?? [];
        }
      }

      if (tplRows.length === 0) {
        const seedTpls = TEMPLATES.map(t => ({ channel: t.channel, nome: t.nome, assunto: t.assunto ?? null, corpo: t.content, preview: t.preview ?? null, tags: t.tags, open_rate: t.openRate ?? null, response_rate: t.responseRate ?? 0, uses: t.uses ?? 0, status: t.status, atualizado_em: parseBRDateR(t.updatedAt) }));
        const { data: insT } = await supabase.from('regua_templates').insert(seedTpls).select();
        if (cancelled) return;
        tplRows = insT ?? [];
      }

      const leadsGrouped = {};
      leadRows.forEach(r => {
        if (!leadsGrouped[r.fluxo_id]) leadsGrouped[r.fluxo_id] = [];
        leadsGrouped[r.fluxo_id].push(fluxoLeadFromRow(r));
      });
      const mappedFluxos = fluxoRows.map(r => ({ ...fluxoFromRow(r), leads: leadsGrouped[r.id] ?? [] }));

      if (!cancelled) {
        setFluxos(mappedFluxos);
        setTemplates(tplRows.map(templateFromRow));
        setLoadingRegua(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [empresaId]);

  async function handleCreateFluxo(form, steps) {
    const { data, error } = await supabase
      .from('regua_fluxos')
      .insert({ cor: form.cor, nome: form.nome, descricao: form.descricao || null, trigger_texto: form.trigger || null, status: 'ativo', steps })
      .select().single();
    if (error) return error.message;
    setFluxos(prev => [...prev, { ...fluxoFromRow(data), leads: [] }]);
    return null;
  }

  async function handleUpdateFluxo(fluxoId, updates) {
    const { data, error } = await supabase
      .from('regua_fluxos').update(updates).eq('id', fluxoId).select().single();
    if (error) return error.message;
    setFluxos(prev => prev.map(f => f.id === fluxoId ? { ...fluxoFromRow(data), leads: f.leads } : f));
    return null;
  }

  async function handleDeleteFluxo(fluxoId) {
    const { count } = await supabase
      .from('regua_fluxo_leads')
      .select('id', { count: 'exact', head: true })
      .eq('fluxo_id', fluxoId);
    if ((count ?? 0) > 0) {
      return `Este fluxo tem ${count} contato${count !== 1 ? 's' : ''} vinculado${count !== 1 ? 's' : ''}. Remova-os antes de excluir.`;
    }
    const { error } = await supabase.from('regua_fluxos').delete().eq('id', fluxoId);
    if (error) return 'Erro ao excluir o fluxo. Tente novamente.';
    setFluxos(prev => prev.filter(f => f.id !== fluxoId));
    return null;
  }

  async function handleUpdateSteps(fluxoId, steps) {
    setFluxos(prev => prev.map(f => f.id === fluxoId ? { ...f, steps } : f));
    await supabase.from('regua_fluxos').update({ steps }).eq('id', fluxoId);
  }

  async function handleUpdateLeads(fluxoId, leads) {
    setFluxos(prev => prev.map(f => f.id === fluxoId ? { ...f, leads } : f));
    await supabase.from('regua_fluxo_leads').delete().eq('fluxo_id', fluxoId);
    if (leads.length > 0) {
      const rows = leads.map(l => ({ fluxo_id: fluxoId, step_idx: l.stepIdx, days_in_step: l.daysInStep, status: l.status ?? 'ativo', company: l.company ?? null, contact: l.contact ?? null, responsavel: l.responsavel ?? null }));
      await supabase.from('regua_fluxo_leads').insert(rows);
    }
  }

  async function handleSaveTemplate(id, content) {
    const { data } = await supabase.from('regua_templates').update({ corpo: content, atualizado_em: new Date().toISOString() }).eq('id', id).select().single();
    if (data) {
      const updated = templateFromRow(data);
      setTemplates(prev => prev.map(t => t.id === id ? updated : t));
      if (activeTemplate?.id === id) setActiveTemplate(updated);
    }
  }

  async function handleCreateTemplate(form) {
    const { data, error } = await supabase
      .from('regua_templates')
      .insert({ channel: form.channel, nome: form.nome, assunto: form.assunto ?? null, corpo: form.corpo ?? null, preview: null, tags: [], open_rate: null, response_rate: 0, uses: 0, status: 'ativo', atualizado_em: new Date().toISOString() })
      .select().single();
    if (error) return { error: error.message };
    const tpl = templateFromRow(data);
    setTemplates(prev => [...prev, tpl]);
    return { tpl };
  }

  if (loadingRegua) return <SkeletonLoader rows={6} />;

  const TABS = [
    { id: 'fluxos',    label: 'Fluxos de Nurturing', count: fluxos.length },
    { id: 'templates', label: 'Templates',            count: templates.length },
  ];

  return (
    <div style={{ padding: '24px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {STAT_CARDS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setQuery(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', background: 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1, transition: 'color .15s',
              }}>
              {tab.label}
              <span style={{ padding: '1px 6px', borderRadius: 20, fontSize: 10, background: activeTab === tab.id ? 'var(--accent)' : 'var(--bg3)', color: activeTab === tab.id ? '#fff' : 'var(--text3)' }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative', marginBottom: 8 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar ${activeTab === 'fluxos' ? 'fluxos' : 'templates'}...`}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 30px 7px 12px', fontSize: 12, color: 'var(--text)', outline: 'none', width: 220, fontFamily: 'var(--font-body)' }}
          />
          {query && (
            <button onClick={() => setQuery('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {activeTab === 'fluxos'
        ? <FluxosSection
            query={query}
            fluxos={fluxos}
            onUpdateSteps={handleUpdateSteps}
            onUpdateLeads={handleUpdateLeads}
            onCreateFluxo={handleCreateFluxo}
            onUpdateFluxo={handleUpdateFluxo}
            onDeleteFluxo={handleDeleteFluxo}
            templates={templates}
            onCreateTemplate={handleCreateTemplate}
          />
        : <TemplatesSection
            query={query}
            templates={templates}
            onOpen={setActiveTemplate}
            onCreateTemplate={handleCreateTemplate}
            fluxos={fluxos}
          />
      }

      {activeTemplate && <TemplateModal tpl={activeTemplate} onSave={handleSaveTemplate} onClose={() => setActiveTemplate(null)} fluxos={fluxos} />}
    </div>
  );
}
