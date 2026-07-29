import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Mail, MessageCircle, Phone, Plus, X, ChevronDown, ChevronRight,
  Bot, Send, Pencil, Eye, MousePointerClick, Zap, Clock,
  Users, BarChart2, Check, GripVertical, Trash2, GitBranch,
  AlertTriangle, ArrowRight, TrendingDown, Briefcase, Search,
} from 'lucide-react';
import { useUI } from '../store/index.js';
import { useAI } from '../hooks/useAI.js';
import { useAuth } from '../store/auth.js';
import { useCRM } from '../store/crm.js';
import { supabase } from '../services/supabase.js';
import { addContatoAoFluxo } from '../services/regua.js';
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

const STAT_CARDS_CFG = [
  { key: 'fluxosAtivos',  label: 'Fluxos ativos',     icon: Zap,               color: '--accent'  },
  { key: 'contatos',      label: 'Contatos em fluxo', icon: Users,             color: '--teal'    },
  { key: 'taxaAbertura',  label: 'Taxa de abertura',  icon: Eye,               color: '--green'   },
  { key: 'taxaResposta',  label: 'Taxa de resposta',  icon: MousePointerClick, color: '--purple'  },
];

// Resposta = outcome preenchido e diferente de "sem resposta". Sem outcomes registrados, não há taxa a mostrar.
function computeResponseRate(leads) {
  const comOutcome = leads.filter(l => l.outcome);
  if (comOutcome.length === 0) return null;
  const respondidos = comOutcome.filter(l => l.outcome !== 'no_response');
  return Math.round((respondidos.length / comOutcome.length) * 100);
}

// Etapa com maior queda de alcance em relação à anterior. -1 quando não há dados de alcance ainda.
function computeDropOffStep(steps) {
  let maxDrop = 0;
  let idx = -1;
  for (let i = 1; i < steps.length; i++) {
    const drop = (steps[i - 1].reached || 0) - (steps[i].reached || 0);
    if (drop > maxDrop) { maxDrop = drop; idx = i; }
  }
  return idx;
}

function computeStatCards(fluxos) {
  const todosLeads = fluxos.flatMap(f => f.leads ?? []);
  const responseRate = computeResponseRate(todosLeads);
  return {
    fluxosAtivos: fluxos.filter(f => f.status === 'ativo').length,
    contatos:     todosLeads.length,
    // Sem integração de rastreamento de abertura de e-mail conectada ainda.
    taxaAbertura: null,
    taxaResposta: responseRate,
  };
}

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
function fluxoFromRow(r) {
  return { id: r.id, color: r.cor, nome: r.nome, descricao: r.descricao, trigger: r.trigger_texto, status: r.status, steps: r.steps ?? [], leads: [] };
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
  const responseRate = computeResponseRate(fluxo.leads ?? []);
  const dropOffStep = computeDropOffStep(fluxo.steps);

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Leads ativos',   value: fluxo.leads?.filter(l => l.status === 'ativo').length ?? 0, color: '--accent' },
          { label: 'Taxa de resposta', value: responseRate == null ? '—' : `${responseRate}%`, color: responseRate == null ? '--text3' : responseRate >= 15 ? '--green' : '--amber' },
          { label: 'Maior abandono', value: dropOffStep === -1 ? '—' : `Step ${dropOffStep + 1}`, color: dropOffStep === -1 ? '--text3' : '--red' },
          // Conversão para CRM ainda não é rastreada automaticamente.
          { label: 'Conversão CRM',  value: '—', color: '--text3' },
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
                <CSSBar pct={pct} color={step.reached > 0 && i === dropOffStep ? '--red' : cfg.color} />
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

function FluxoCard({ fluxo, onUpdateSteps, onUpdateLeads, onEdit, onDelete, templates, onCreateTemplate, onAdicionarContato }) {
  const [expanded,          setExpanded]          = useState(false);
  const [subTab,            setSubTab]            = useState('steps');
  const [expandedStepId,    setExpandedStepId]    = useState(null);
  const [addStepPos,        setAddStepPos]        = useState(null);
  const [resultCtx,         setResultCtx]         = useState(null);
  const [deleteMode,        setDeleteMode]        = useState(false);
  const [deleteError,       setDeleteError]       = useState('');
  const [deletePending,     setDeletePending]     = useState(false);
  const [showAdicionarModal, setShowAdicionarModal] = useState(false);

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
  const headerResponseRate = computeResponseRate(fluxo.leads ?? []);

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
              { label: 'Resposta', value: headerResponseRate == null ? '—' : `${headerResponseRate}%`, color: headerResponseRate == null ? '--text3' : headerResponseRate >= 15 ? '--green' : '--amber' },
              { label: 'CRM',      value: '—', color: '--text3' },
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
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <PermissionGate module="regua" action="edit">
                      <button
                        onClick={() => setShowAdicionarModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(56,201,224,0.1)', border: '1px solid rgba(56,201,224,0.25)', color: 'var(--teal)', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)' }}>
                        <Plus size={12} /> Adicionar contato
                      </button>
                    </PermissionGate>
                  </div>
                  <LeadsTable
                    leads={fluxo.leads}
                    steps={fluxo.steps}
                    onRegisterResult={handleRegisterResult}
                    onRemove={handleRemoveLead}
                  />
                  {showAdicionarModal && (
                    <AdicionarContatoModal
                      fluxoId={fluxo.id}
                      fluxoNome={fluxo.nome}
                      fluxoSteps={fluxo.steps}
                      onClose={() => setShowAdicionarModal(false)}
                      onAdded={(rows) => {
                        onAdicionarContato(fluxo.id, rows);
                        setShowAdicionarModal(false);
                      }}
                    />
                  )}
                </>
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

/* ─── AdicionarContatoModal ──────────────────────────────────────────────────── */

function AdicionarContatoModal({ fluxoId, fluxoNome, fluxoSteps, onClose, onAdded }) {
  const { leads, clientes } = useCRM();

  const [wizStep,             setWizStep]             = useState('origem');
  const [origem,              setOrigem]              = useState(null);
  const [selectedLeadIds,     setSelectedLeadIds]     = useState([]);
  const [selectedClienteIds,  setSelectedClienteIds]  = useState([]);
  const [avulsoForm,          setAvulsoForm]          = useState({ contact: '', email: '', company: '' });
  const [avulsoErro,          setAvulsoErro]          = useState('');
  const [query,               setQuery]               = useState('');
  const [adding,              setAdding]              = useState(false);
  const [resultado,           setResultado]           = useState(null);

  function toggleLead(id) {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleCliente(id) {
    setSelectedClienteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleEscolherOrigem(o) {
    setOrigem(o); setQuery(''); setWizStep('contatos');
  }

  async function handleConfirmar() {
    if (!fluxoSteps?.length) {
      setResultado({ adicionados: [], ignorados: [], erros: [{ name: 'Fluxo sem passos', erro: 'Este fluxo não tem passos. Adicione passos antes de incluir contatos.' }] });
      setWizStep('resultado');
      return;
    }

    if (origem === 'avulso') {
      if (!avulsoForm.email.trim()) { setAvulsoErro('O e-mail é obrigatório para contatos avulsos.'); return; }
    }

    setAdding(true);

    let tarefas = [];
    if (origem === 'funil') {
      tarefas = selectedLeadIds.map(id => {
        const l = leads.find(x => x.id === id);
        return { leadId: id, company: l?.company ?? '', contact: l?.contact ?? '', email: l?.email ?? '' };
      });
    } else if (origem === 'cliente') {
      tarefas = selectedClienteIds.map(id => {
        const c = clientes.find(x => x.id === id);
        return { clienteId: id, company: c?.empresaNome ?? '', contact: c?.contato ?? '', email: c?.email ?? '' };
      });
    } else {
      tarefas = [{ company: avulsoForm.company, contact: avulsoForm.contact, email: avulsoForm.email }];
    }

    const adicionados = [];
    const ignorados   = [];
    const erros       = [];

    for (const item of tarefas) {
      const name = item.contact || item.company || item.email || 'Contato';
      const res = await addContatoAoFluxo({
        fluxoId, fluxoSteps, origem, responsavel: '',
        leadId:    item.leadId,
        clienteId: item.clienteId,
        company:   item.company,
        contact:   item.contact,
        email:     item.email,
      });
      if (res.ok) adicionados.push({ name, row: res.row });
      else if (res.motivo === 'duplicata') ignorados.push(name);
      else erros.push({ name, erro: res.error ?? res.motivo });
    }

    if (adicionados.length) onAdded(adicionados.map(a => a.row));
    setResultado({ adicionados, ignorados, erros });
    setAdding(false);
    setWizStep('resultado');
  }

  const leadsVisiveis    = leads.filter(l => !l.convertido && (!query || l.company.toLowerCase().includes(query.toLowerCase()) || (l.contact ?? '').toLowerCase().includes(query.toLowerCase())));
  const clientesVisiveis = clientes.filter(c => !query || (c.empresaNome ?? '').toLowerCase().includes(query.toLowerCase()) || (c.contato ?? '').toLowerCase().includes(query.toLowerCase()));

  const podeContinuar =
    (origem === 'funil'    && selectedLeadIds.length > 0)  ||
    (origem === 'cliente'  && selectedClienteIds.length > 0) ||
    (origem === 'avulso'   && avulsoForm.email.trim() !== '');

  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Adicionar contato</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {fluxoNome}
              {wizStep === 'contatos' && origem && (
                <> · <span style={{ color: 'var(--accent2)' }}>
                  {origem === 'funil' ? 'Do funil (CRM)' : origem === 'cliente' ? 'De clientes' : 'Avulso'}
                </span></>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Passo: escolher origem ── */}
        {wizStep === 'origem' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'funil',   label: 'Do funil (CRM)', desc: 'Leads ativos no funil de vendas', icon: TrendingDown, color: '--accent' },
              { id: 'cliente', label: 'De clientes',    desc: 'Clientes e ex-clientes cadastrados', icon: Briefcase, color: '--teal'   },
              { id: 'avulso',  label: 'Avulso',         desc: 'Adicionar por nome e e-mail', icon: Plus, color: '--amber'     },
            ].map(op => {
              const Icon = op.icon;
              return (
                <button key={op.id} onClick={() => handleEscolherOrigem(op.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = `var(${op.color})`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `color-mix(in srgb, var(${op.color}) 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} style={{ color: `var(${op.color})` }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{op.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{op.desc}</div>
                  </div>
                  <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text3)', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Passo: escolher contatos (funil ou cliente) ── */}
        {wizStep === 'contatos' && (origem === 'funil' || origem === 'cliente') && (
          <>
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={origem === 'funil' ? 'Buscar leads…' : 'Buscar clientes…'}
                  style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px 7px 30px', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {origem === 'funil' && leadsVisiveis.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Nenhum lead encontrado.</div>
              )}
              {origem === 'funil' && leadsVisiveis.map((l, i) => {
                const sel = selectedLeadIds.includes(l.id);
                return (
                  <button key={l.id} onClick={() => toggleLead(l.id)}
                    style={{ width: '100%', textAlign: 'left', padding: '9px 20px', background: sel ? 'rgba(91,110,245,0.08)' : 'transparent', border: 'none', borderBottom: i < leadsVisiveis.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sel ? 'var(--accent)' : 'var(--border2)'}`, background: sel ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .1s' }}>
                      {sel && <Check size={10} style={{ color: '#fff' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{l.company}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{l.contact}{l.email ? ` · ${l.email}` : ''}</div>
                    </div>
                    {l.emRegua && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'rgba(56,201,224,0.1)', color: 'var(--teal)', border: '1px solid rgba(56,201,224,0.2)', flexShrink: 0 }}>
                        já na régua
                      </span>
                    )}
                  </button>
                );
              })}
              {origem === 'cliente' && clientesVisiveis.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Nenhum cliente encontrado.</div>
              )}
              {origem === 'cliente' && clientesVisiveis.map((c, i) => {
                const sel = selectedClienteIds.includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggleCliente(c.id)}
                    style={{ width: '100%', textAlign: 'left', padding: '9px 20px', background: sel ? 'rgba(91,110,245,0.08)' : 'transparent', border: 'none', borderBottom: i < clientesVisiveis.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sel ? 'var(--accent)' : 'var(--border2)'}`, background: sel ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .1s' }}>
                      {sel && <Check size={10} style={{ color: '#fff' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{c.empresaNome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.contato}{c.email ? ` · ${c.email}` : ''}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Passo: avulso ── */}
        {wizStep === 'contatos' && origem === 'avulso' && (
          <div style={{ padding: '20px', flex: 1 }}>
            {[
              { key: 'contact', label: 'Nome', placeholder: 'Nome do contato', required: false },
              { key: 'email',   label: 'E-mail', placeholder: 'email@empresa.com.br', required: true },
              { key: 'company', label: 'Empresa', placeholder: 'Nome da empresa', required: false },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>
                  {f.label}{f.required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
                </label>
                <input
                  value={avulsoForm[f.key]}
                  onChange={e => { setAvulsoForm(p => ({ ...p, [f.key]: e.target.value })); if (f.key === 'email') setAvulsoErro(''); }}
                  placeholder={f.placeholder}
                  style={{ width: '100%', background: 'var(--bg3)', border: `1px solid ${f.key === 'email' && avulsoErro ? 'var(--red)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
              </div>
            ))}
            {avulsoErro && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: -8 }}>{avulsoErro}</div>}
          </div>
        )}

        {/* ── Passo: resultado ── */}
        {wizStep === 'resultado' && resultado && (
          <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: resultado.adicionados.length > 0 ? 'var(--green)' : 'var(--text3)', marginBottom: 4 }}>
                {resultado.adicionados.length} adicionado{resultado.adicionados.length !== 1 ? 's' : ''}
              </div>
              {resultado.ignorados.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 8 }}>
                  {resultado.ignorados.length} já estava{resultado.ignorados.length !== 1 ? 'm' : ''} na régua e fo{resultado.ignorados.length !== 1 ? 'ram' : 'i'} ignorado{resultado.ignorados.length !== 1 ? 's' : ''}:&nbsp;
                  <span style={{ color: 'var(--text2)' }}>{resultado.ignorados.join(', ')}</span>
                </div>
              )}
              {resultado.erros.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>
                  {resultado.erros.length} erro{resultado.erros.length !== 1 ? 's' : ''}:&nbsp;
                  {resultado.erros.map((e, i) => (
                    <span key={i} style={{ color: 'var(--text2)' }}>{e.name} ({e.erro}){i < resultado.erros.length - 1 ? ', ' : ''}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: wizStep === 'contatos' ? 'space-between' : 'flex-end', alignItems: 'center', flexShrink: 0 }}>
          {wizStep === 'contatos' && (
            <button onClick={() => { setWizStep('origem'); setQuery(''); setSelectedLeadIds([]); setSelectedClienteIds([]); setAvulsoErro(''); }}
              style={{ padding: '7px 14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)' }}>
              ← Voltar
            </button>
          )}
          {wizStep === 'resultado' ? (
            <button onClick={onClose}
              style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)' }}>
              Fechar
            </button>
          ) : wizStep === 'contatos' ? (
            <button onClick={handleConfirmar} disabled={!podeContinuar || adding}
              style={{ padding: '7px 16px', borderRadius: 8, background: podeContinuar && !adding ? 'var(--teal)' : 'var(--bg3)', border: 'none', color: podeContinuar && !adding ? '#fff' : 'var(--text3)', cursor: podeContinuar && !adding ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)', transition: 'all .15s' }}>
              {adding ? 'Adicionando…' : (
                origem === 'funil'   ? `Adicionar ${selectedLeadIds.length > 0 ? `${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}` : 'leads'}` :
                origem === 'cliente' ? `Adicionar ${selectedClienteIds.length > 0 ? `${selectedClienteIds.length} cliente${selectedClienteIds.length > 1 ? 's' : ''}` : 'clientes'}` :
                'Confirmar'
              )}
            </button>
          ) : (
            <button onClick={onClose}
              style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)' }}>
              Cancelar
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

/* ─── Sections ───────────────────────────────────────────────────────────────── */

function FluxosSection({ query, fluxos, onUpdateSteps, onUpdateLeads, onCreateFluxo, onUpdateFluxo, onDeleteFluxo, templates, onCreateTemplate, onAdicionarContato }) {
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
            onAdicionarContato={onAdicionarContato}
          />
        ))}
        {filtered.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
            {fluxos.length === 0 ? 'Nenhum fluxo criado ainda. Clique em "Novo fluxo" para começar.' : 'Nenhum fluxo encontrado com essa busca.'}
          </p>
        )}
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
        {filtered.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic', textAlign: 'center', padding: '30px 0', gridColumn: '1 / -1' }}>
            {templates.length === 0 ? 'Nenhum template criado ainda. Clique em "Novo template" para começar.' : 'Nenhum template encontrado com essa busca.'}
          </p>
        )}
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
      const rows = leads.map(l => ({
        fluxo_id:          fluxoId,
        step_idx:          l.stepIdx          ?? 0,
        days_in_step:      l.daysInStep       ?? 0,
        status:            l.status           ?? 'ativo',
        company:           l.company          ?? null,
        contact:           l.contact          ?? null,
        responsavel:       l.responsavel      ?? null,
        lead_id:           l.leadId           ?? null,
        cliente_id:        l.clienteId        ?? null,
        origem:            l.origem           ?? 'avulso',
        email:             l.email            ?? null,
        outcome:           l.outcome          ?? null,
        outcome_notes:     l.outcomeNotes     ?? null,
        last_contact_at:   l.lastContactAt    ?? null,
        next_step_due_at:  l.nextStepDueAt    ?? null,
      }));
      await supabase.from('regua_fluxo_leads').insert(rows);
    }
  }

  function handleLeadAdicionado(fluxoId, newRows) {
    const newLeads = newRows.map(fluxoLeadFromRow);
    setFluxos(prev => prev.map(f => f.id === fluxoId ? { ...f, leads: [...f.leads, ...newLeads] } : f));
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

  const stats = computeStatCards(fluxos);

  return (
    <div style={{ padding: '24px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {STAT_CARDS_CFG.map((s) => {
          const raw = stats[s.key];
          const value = raw == null ? '—' : (s.key === 'taxaAbertura' || s.key === 'taxaResposta') ? `${raw}%` : raw;
          return <StatCard key={s.key} label={s.label} icon={s.icon} color={s.color} value={value} />;
        })}
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
            onAdicionarContato={handleLeadAdicionado}
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
