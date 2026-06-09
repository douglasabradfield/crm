import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Plus, Bot, Pencil, Check, X, Trash2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Save, FileText, BarChart2, Users,
  Package, DollarSign, MapPin, Megaphone, History, Layers, GripVertical, Globe,
} from 'lucide-react';
import { useUI } from '../store/index.js';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

/* ─── useLocalStorage ────────────────────────────────────────────────────── */
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch { return initial; }
  });
  const set = useCallback((v) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [value, set];
}

/* ─── useVersionHistory ──────────────────────────────────────────────────── */
function useVersionHistory(storageKey) {
  const [versions, setVersions] = useLocalStorage(storageKey, []);

  const saveVersion = useCallback((data) => {
    const snapshot = JSON.parse(JSON.stringify(data));
    setVersions(prev => {
      if (prev.length > 0 && JSON.stringify(prev[0].data) === JSON.stringify(snapshot)) return prev;
      return [{ id: `vh${Date.now()}`, date: nowISO(), data: snapshot }, ...prev].slice(0, 10);
    });
  }, [setVersions]);

  return { versions, saveVersion };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function nowISO() { return new Date().toISOString(); }

function daysSince(iso) {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getStatus(lastUpdated) {
  if (!lastUpdated) return 'none';
  const d = daysSince(lastUpdated);
  if (d < 30) return 'ok';
  if (d < 90) return 'warn';
  return 'alert';
}

/* ─── Initial data ───────────────────────────────────────────────────────── */
const INITIAL_SWOT = {
  forcas: [
    { id: 'f1', text: 'Produto com alta taxa de retenção (91%)' },
    { id: 'f2', text: 'Equipe comercial experiente e motivada' },
    { id: 'f3', text: 'Marca forte na região — boca a boca representa 38% dos leads' },
    { id: 'f4', text: 'Ticket médio (R$ 4.200) acima da média do mercado' },
  ],
  fraquezas: [
    { id: 'w1', text: 'CAC de R$ 420 acima da referência do setor (R$ 380)' },
    { id: 'w2', text: 'Processo de follow-up inconsistente — 3 leads perdidos este mês' },
    { id: 'w3', text: 'Sem playbook de vendas documentado' },
  ],
  oportunidades: [
    { id: 'o1', text: 'Expansão para segmento de médias empresas (Grupo Construfast)' },
    { id: 'o2', text: 'Integração com WhatsApp Business pode reduzir ciclo de venda em 30%' },
    { id: 'o3', text: 'Demanda crescente por automação comercial em PMEs pós-pandemia' },
  ],
  ameacas: [
    { id: 'a1', text: 'Concorrente lançou plano mais barato — risco de churn em clientes menores' },
    { id: 'a2', text: 'Alta rotatividade em cargos de decisão nos prospects (C-level)' },
  ],
};

const INITIAL_4PS = {
  produto: {
    nome: 'Plataforma Comercial PME',
    descricao: 'Software de gestão comercial para PMEs com CRM, KPIs e assistente IA integrado.',
    diferenciais: 'Combina educação + ferramenta em uma só plataforma. Guia em 8 capítulos + CRM + IA contextual.',
    publicoAlvo: 'MEI e ME brasileiras com equipe de até 5 pessoas no comercial.',
    pontosDeAtencao: 'Onboarding pode ser percebido como complexo para usuários sem experiência com CRM.',
  },
  preco: {
    modelo: 'Assinatura mensal (SaaS). Três planos: Start R$29, Pro R$89, Equipe R$179.',
    faixaPreco: 'R$29 a R$179/mês conforme plano.',
    politicaDesconto: 'Desconto de 20% no plano anual. Sem desconto por volume no MVP.',
    comparativoMercado: 'Abaixo da média de CRMs nacionais (Pipedrive, RD Station) que partem de R$120/mês.',
  },
  praca: {
    canaisVenda: 'Venda 100% digital — landing page + self-service.',
    regioes: 'Brasil inteiro. Foco inicial em SP, MG e RJ.',
    modeloDistribuicao: 'PLG (Product-Led Growth). Trial gratuito → conversão por resultado.',
    presencaDigital: 'Site + Instagram + LinkedIn + Google Ads (planejado).',
  },
  promocao: {
    canaisMarketing: 'Instagram orgânico, LinkedIn, SEO, parcerias com contabilidades.',
    campanhas: 'Lançamento: campanha "Estruture seu comercial em 30 dias".',
    estrategiaConteudo: 'Conteúdo educacional sobre vendas B2B para PMEs. 3 posts/semana.',
    investimentoMensal: 'R$1.500/mês em tráfego pago (fase de validação).',
  },
  pessoas: {
    quemAtende: '',
    perfil: '',
    treinamento: '',
    diferencialHumano: '',
  },
  processos: {
    comoEntrega: '',
    etapas: '',
    padraoQualidade: '',
    gargalos: '',
  },
};

const INITIAL_PERSONAS = [
  {
    id: 'p1',
    nome: 'Carlos, o Gestor Pragmático',
    cargo: 'Diretor Comercial · 42 anos',
    avatar: 'CP',
    color: '--accent2',
    descricao: 'Profissional experiente que busca resultados rápidos e mensuráveis. Tem autonomia para decisão mas precisa justificar o ROI para o board.',
    dores: [
      'Equipe sem processo estruturado de follow-up',
      'Dificuldade em prever receita com precisão',
      'Ciclo de venda longo sem visibilidade de gargalos',
    ],
    decisaoCompra: 'Busca demonstração de ROI claro, cases de sucesso no mesmo setor e prova de que a ferramenta se integra ao processo atual da equipe.',
    objecoes: ['Já uso uma planilha que funciona', 'Não tenho tempo para treinar a equipe'],
    canais: 'LinkedIn, indicação de colegas, eventos de negócios',
  },
  {
    id: 'p2',
    nome: 'Ana, a Fundadora Sobrecarregada',
    cargo: 'CEO & Fundadora · 35 anos',
    avatar: 'AS',
    color: '--purple',
    descricao: 'Empreendedora que acumula papel de vendedora, gestora e estrategista. Quer escalar sem contratar mais pessoas imediatamente.',
    dores: [
      'Não tem tempo para prospectar ativamente',
      'Perde negócios por falta de follow-up no momento certo',
      'Sem visão clara de quais clientes geram mais resultado',
    ],
    decisaoCompra: 'Precisa de solução rápida de configurar, intuitiva e que mostre resultado em até 30 dias. Preço importa muito.',
    objecoes: ['Ferramentas demais para aprender', 'Vou usar só quando a empresa crescer'],
    canais: 'Instagram, grupos de WhatsApp, YouTube',
  },
  {
    id: 'p3',
    nome: 'João, o Vendedor Sênior',
    cargo: 'Executivo de Contas · 28 anos',
    avatar: 'JS',
    color: '--teal',
    descricao: 'Profissional ambicioso com carteira consolidada. Resistente a ferramentas que considera burocracia, mas aberto a tecnologia que de fato ajuda.',
    dores: [
      'Perde tempo preenchendo relatórios manualmente',
      'Quer mais leads quentes e menos prospecção fria',
      'Dificuldade em acessar histórico do cliente rapidamente',
    ],
    decisaoCompra: 'Só adota se perceber que vai ganhar tempo e fechar mais. Precisa de UX simples e acesso rápido às informações chave.',
    objecoes: ['É mais uma ferramenta para preencher', 'Meu gestor não vai cobrar isso de mim'],
    canais: 'Indicação de colegas, YouTube, grupos de vendas',
  },
];

const DIMENSIONS = [
  { id: 'processo',    label: 'Processo de vendas',   score: 7, max: 10 },
  { id: 'ferramentas', label: 'Ferramentas & CRM',    score: 6, max: 10 },
  { id: 'equipe',      label: 'Equipe & capacitação', score: 8, max: 10 },
  { id: 'metricas',    label: 'Métricas & análise',   score: 5, max: 10 },
  { id: 'marketing',   label: 'Alinhamento marketing',score: 6, max: 10 },
  { id: 'retencao',    label: 'Retenção & sucesso',   score: 7, max: 10 },
];

const SWOT_CONFIG = {
  forcas:        { label: 'Forças',        color: 'var(--green)',  bg: 'rgba(45,212,160,0.06)',  border: 'rgba(45,212,160,0.2)',  key: 'S' },
  fraquezas:     { label: 'Fraquezas',     color: 'var(--amber)',  bg: 'rgba(240,168,50,0.06)',  border: 'rgba(240,168,50,0.2)',  key: 'W' },
  oportunidades: { label: 'Oportunidades', color: 'var(--accent2)',bg: 'rgba(91,110,245,0.06)',  border: 'rgba(91,110,245,0.2)',  key: 'O' },
  ameacas:       { label: 'Ameaças',       color: 'var(--red)',    bg: 'rgba(240,92,92,0.06)',   border: 'rgba(240,92,92,0.2)',   key: 'T' },
};

const FOUR_PS_CFG = [
  {
    key: 'produto', label: 'Produto', Icon: Package,
    color: 'var(--accent2)', border: 'rgba(91,110,245,0.2)', bg: 'rgba(91,110,245,0.06)',
    fields: [
      { key: 'nome',            label: 'Nome / serviço',       rows: 1 },
      { key: 'descricao',       label: 'Descrição',            rows: 3 },
      { key: 'diferenciais',    label: 'Diferenciais',         rows: 3 },
      { key: 'publicoAlvo',     label: 'Público-alvo',         rows: 2 },
      { key: 'pontosDeAtencao', label: 'Pontos de atenção',    rows: 2 },
    ],
  },
  {
    key: 'preco', label: 'Preço', Icon: DollarSign,
    color: 'var(--green)', border: 'rgba(45,212,160,0.2)', bg: 'rgba(45,212,160,0.06)',
    fields: [
      { key: 'modelo',             label: 'Modelo de precificação', rows: 2 },
      { key: 'faixaPreco',         label: 'Faixa de preço',         rows: 1 },
      { key: 'politicaDesconto',   label: 'Política de desconto',   rows: 2 },
      { key: 'comparativoMercado', label: 'Comparativo mercado',    rows: 2 },
    ],
  },
  {
    key: 'praca', label: 'Praça', Icon: MapPin,
    color: 'var(--teal)', border: 'rgba(56,201,224,0.2)', bg: 'rgba(56,201,224,0.06)',
    fields: [
      { key: 'canaisVenda',        label: 'Canais de venda',        rows: 2 },
      { key: 'regioes',            label: 'Regiões atendidas',      rows: 1 },
      { key: 'modeloDistribuicao', label: 'Modelo de distribuição', rows: 2 },
      { key: 'presencaDigital',    label: 'Presença digital',       rows: 2 },
    ],
  },
  {
    key: 'promocao', label: 'Promoção', Icon: Megaphone,
    color: 'var(--amber)', border: 'rgba(240,168,50,0.2)', bg: 'rgba(240,168,50,0.06)',
    fields: [
      { key: 'canaisMarketing',    label: 'Canais de marketing',    rows: 2 },
      { key: 'campanhas',          label: 'Campanhas ativas',       rows: 2 },
      { key: 'estrategiaConteudo', label: 'Estratégia de conteúdo', rows: 2 },
      { key: 'investimentoMensal', label: 'Investimento mensal',    rows: 1 },
    ],
  },
  {
    key: 'pessoas', label: 'Pessoas', Icon: Users,
    color: 'var(--purple)', border: 'rgba(176,110,245,0.2)', bg: 'rgba(176,110,245,0.06)',
    descricao: 'Quem executa e atende — especialmente importante para empresas de serviço.',
    fields: [
      { key: 'quemAtende',        label: 'Quem atende o cliente',         rows: 2 },
      { key: 'perfil',            label: 'Perfil ideal da equipe',        rows: 2 },
      { key: 'treinamento',       label: 'Como a equipe é treinada',      rows: 2 },
      { key: 'diferencialHumano', label: 'Diferencial humano do negócio', rows: 2 },
    ],
  },
  {
    key: 'processos', label: 'Processos', Icon: Layers,
    color: 'var(--teal)', border: 'rgba(56,201,224,0.2)', bg: 'rgba(56,201,224,0.06)',
    descricao: 'Como a entrega acontece na prática — o que o cliente experiencia.',
    fields: [
      { key: 'comoEntrega',     label: 'Como o serviço é entregue',        rows: 2 },
      { key: 'etapas',          label: 'Etapas do atendimento ao cliente', rows: 3 },
      { key: 'padraoQualidade', label: 'Como você garante a qualidade',    rows: 2 },
      { key: 'gargalos',        label: 'Principais gargalos hoje',         rows: 2 },
    ],
  },
];

const PERSONA_COLORS = [
  { value: '--accent2', label: 'Azul' },
  { value: '--purple',  label: 'Roxo' },
  { value: '--teal',    label: 'Teal' },
  { value: '--green',   label: 'Verde' },
  { value: '--amber',   label: 'Âmbar' },
  { value: '--red',     label: 'Vermelho' },
];

/* ─── Análise de Concorrentes — dados iniciais ───────────────────────────── */
const CANAIS_OPCOES = [
  'Instagram', 'LinkedIn', 'Facebook', 'YouTube', 'TikTok',
  'Google Ads', 'SEO/Blog', 'E-mail', 'WhatsApp', 'Indicação', 'Eventos', 'Podcast',
];

const FAIXA_PRECO_CFG = [
  { value: 'economico', label: 'Econômico', color: 'var(--green)',  bg: 'rgba(45,212,160,0.12)'  },
  { value: 'medio',     label: 'Médio',     color: 'var(--amber)',  bg: 'rgba(240,168,50,0.12)'  },
  { value: 'premium',   label: 'Premium',   color: 'var(--purple)', bg: 'rgba(176,110,245,0.12)' },
];

const INITIAL_COMPETITORS = [
  {
    id: 'comp1', nome: 'RD Station CRM', site: 'rdstation.com', faixaPreco: 'medio',
    canais: ['LinkedIn', 'SEO/Blog', 'Google Ads', 'E-mail'],
    forcas: ['Marca nacional consolidada', 'Integração com RD Marketing', 'Ampla base de clientes'],
    fraquezas: ['Curva de aprendizado elevada', 'Preço escala rapidamente', 'Interface complexa para PMEs'],
    diferenciais: 'Guia educacional integrado + IA contextual em português — o usuário aprende enquanto usa a ferramenta.',
  },
  {
    id: 'comp2', nome: 'Pipedrive', site: 'pipedrive.com', faixaPreco: 'medio',
    canais: ['Google Ads', 'SEO/Blog', 'LinkedIn', 'Eventos'],
    forcas: ['UX simples e visual', 'Pipeline kanban intuitivo', 'Ecossistema de integrações'],
    fraquezas: ['Sem conteúdo educacional', 'Relatórios básicos no plano inicial', 'Suporte em inglês'],
    diferenciais: 'CRM + educação + IA em uma só plataforma, 100% focada em PMEs brasileiras com preço acessível.',
  },
];

const BLANK_COMPETITOR = {
  nome: '', site: '', faixaPreco: 'medio',
  canais: [], forcas: [''], fraquezas: [''], diferenciais: '',
};

let _competitorId = 500;

/* ─── Funil de Vendas — dados iniciais ──────────────────────────────────── */
const INITIAL_FUNNEL = [
  { id: 'fu1', nome: 'Leads gerados',    volume: 200, conversao: 40 },
  { id: 'fu2', nome: 'Contato feito',    volume: 80,  conversao: 50 },
  { id: 'fu3', nome: 'Proposta enviada', volume: 40,  conversao: 60 },
  { id: 'fu4', nome: 'Negociação',       volume: 24,  conversao: 50 },
  { id: 'fu5', nome: 'Fechamento',       volume: 12,  conversao: 100 },
];

let _funelId = 400;

/* ─── Maturity questionnaire data ────────────────────────────────────────── */
const MATURITY_QUESTIONS = [
  {
    dim: 'processos', label: 'Processos', color: 'var(--accent2)',
    questions: [
      'Você tem um processo de vendas documentado e seguido pela equipe?',
      'Existe um fluxo claro de qualificação de leads (ex: BANT, SPIN)?',
      'Você usa um playbook com scripts e objeções mapeadas?',
      'Há um processo formal de onboarding para novos clientes após a venda?',
    ],
    recs: [
      'Documente o processo comercial em um playbook simples — até 2 páginas já resolvem.',
      'Adote critérios de qualificação BANT (Budget, Authority, Need, Timeline) para cada lead.',
      'Crie templates de mensagens para as 3 etapas mais críticas do seu funil.',
    ],
  },
  {
    dim: 'ferramentas', label: 'Ferramentas', color: 'var(--teal)',
    questions: [
      'Você usa um CRM para registrar e acompanhar todos os leads e oportunidades?',
      'Sua equipe usa ferramentas de automação de e-mail ou de prospecção?',
      'Você tem dashboards com relatórios automáticos de vendas?',
      'Existe integração entre suas ferramentas de marketing e vendas?',
    ],
    recs: [
      'Comece com um CRM simples — o mais importante é centralizar todos os leads em um único lugar.',
      'Configure ao menos um relatório semanal automático: leads, conversão e receita.',
      'Integre o WhatsApp Business ao fluxo de follow-up para reduzir o tempo de resposta.',
    ],
  },
  {
    dim: 'equipe', label: 'Equipe', color: 'var(--green)',
    questions: [
      'Sua equipe comercial recebe treinamentos regulares (ao menos trimestrais)?',
      'Há metas individuais claras com acompanhamento semanal de resultados?',
      'Existe divisão de papéis clara (prospecção, fechamento, pós-venda)?',
      'O processo de entrada de novos vendedores é estruturado e documentado?',
    ],
    recs: [
      'Implemente reuniões semanais de pipeline review — 30 min é suficiente para times pequenos.',
      'Defina metas individuais mensais com check-ins quinzenais, não só no final do mês.',
      'Crie um roteiro de onboarding de 30 dias para novos vendedores com checkpoints semanais.',
    ],
  },
  {
    dim: 'metricas', label: 'Métricas', color: 'var(--amber)',
    questions: [
      'Você acompanha a taxa de conversão em cada etapa do funil de vendas?',
      'Sabe qual é o seu CAC (Custo de Aquisição de Cliente) atual?',
      'Monitora o churn rate e o LTV (Lifetime Value) dos seus clientes?',
      'Faz previsão de receita (forecast) mensal com base em dados do pipeline?',
    ],
    recs: [
      'Defina 4-5 métricas essenciais para o negócio e acompanhe-as toda semana.',
      'Calcule o CAC: investimento total em vendas e marketing ÷ clientes adquiridos no período.',
      'Implemente um forecast simples: valor do deal × probabilidade de fechamento por etapa.',
    ],
  },
  {
    dim: 'comunicacao', label: 'Comunicação', color: 'var(--purple)',
    questions: [
      'Você tem uma régua de comunicação definida para follow-up de leads?',
      'Existe uma estratégia de nutrição para leads que ainda não estão prontos?',
      'Usa templates e scripts padronizados para abordagem e follow-up?',
      'Há um processo de comunicação pós-venda focado em retenção e upsell?',
    ],
    recs: [
      'Defina uma cadência de follow-up padrão: D+0, D+3, D+7, D+14 e D+30.',
      'Crie ao menos 3 templates de mensagens: primeiro contato, follow-up e reativação.',
      'Implemente um check-in mensal com clientes ativos — reduz churn e abre oportunidades de upsell.',
    ],
  },
];

const SCALE_LABELS = ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'];

/* ─── StatusBadge ────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  none:  { label: 'Não iniciado', color: 'var(--text3)', bg: 'rgba(92,96,128,0.12)' },
  ok:    { label: 'Atualizado',   color: 'var(--green)', bg: 'rgba(45,212,160,0.12)' },
  warn:  { label: 'Desatualizado',color: 'var(--amber)', bg: 'rgba(240,168,50,0.12)' },
  alert: { label: 'Vencido',      color: 'var(--red)',   bg: 'rgba(240,92,92,0.12)' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.none;
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 20,
      color: cfg.color, background: cfg.bg, fontWeight: 500,
    }}>
      {cfg.label}
    </span>
  );
}

/* ─── ScoreGauge ─────────────────────────────────────────────────────────── */
function ScoreGauge({ score, max = 100, size = 120 }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / max);
  const color = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: Math.round(size * 0.26), color: 'var(--text)', lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>/ {max}</span>
      </div>
    </div>
  );
}

/* ─── CompilationPanel ───────────────────────────────────────────────────── */
function CompilationPanel({ analyses, score, scoreLabel, scoreColor, onReport }) {
  const alerts = analyses.filter(a => getStatus(a.lastUpdated) === 'alert');

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>Diagnóstico Estratégico</p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
            Visão geral da saúde estratégica da empresa
          </p>
        </div>
        <button
          onClick={onReport}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '8px 14px',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <FileText size={13} /> Gerar relatório completo
        </button>
      </div>

      {alerts.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(240,92,92,0.07)', border: '1px solid rgba(240,92,92,0.2)',
        }}>
          <AlertTriangle size={14} color="var(--red)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--red)' }}>
            {alerts.map(a => a.name).join(' e ')} não {alerts.length > 1 ? 'atualizadas' : 'atualizada'} há mais de 90 dias
          </span>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr) auto',
        gap: 12, alignItems: 'start',
      }}>
        {analyses.map(a => {
          const status = getStatus(a.lastUpdated);
          const days = a.lastUpdated ? daysSince(a.lastUpdated) : null;
          return (
            <div key={a.id} style={{
              background: 'var(--bg3)', borderRadius: 10, padding: 14,
              border: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: a.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <a.Icon size={15} color={a.iconColor} />
                </div>
                <StatusBadge status={status} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{a.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                  {days === null
                    ? 'Nunca atualizado'
                    : days === 0
                    ? 'Atualizado hoje'
                    : `Há ${days} dia${days !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          );
        })}

        <div style={{
          background: 'var(--bg3)', borderRadius: 10, padding: 14,
          border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <ScoreGauge score={score} size={88} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Maturidade</p>
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 20, marginTop: 4,
              display: 'inline-block',
              color: scoreColor,
              background: `color-mix(in srgb, ${scoreColor} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${scoreColor} 30%, transparent)`,
            }}>
              {scoreLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── VersionPanel (shared) ──────────────────────────────────────────────── */
function VersionPanel({ versions, onCompare, compareId, onSave }) {
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Histórico de versões
        </span>
        <button
          onClick={onSave}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 6, padding: '5px 10px', fontSize: 11,
            fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          <Save size={11} /> Salvar versão atual
        </button>
      </div>
      {versions.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
          Nenhuma versão salva ainda
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {versions.map(v => (
            <div key={v.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px', borderRadius: 6,
              background: compareId === v.id ? 'rgba(91,110,245,0.1)' : 'transparent',
              border: `1px solid ${compareId === v.id ? 'rgba(91,110,245,0.3)' : 'transparent'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Clock size={11} color="var(--text3)" />
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v.label}</span>
              </div>
              <button
                onClick={() => onCompare(compareId === v.id ? null : v.id)}
                style={{
                  background: 'none', border: '1px solid var(--border2)',
                  borderRadius: 5, padding: '3px 8px', fontSize: 11,
                  color: compareId === v.id ? 'var(--accent2)' : 'var(--text3)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >
                {compareId === v.id ? 'Ocultar' : 'Comparar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── VersionDropdown ────────────────────────────────────────────────────── */
function VersionDropdown({ versions, currentData, onRestore, renderPreview }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const selected = versions.find(v => v.id === selectedId) || null;

  if (versions.length === 0) return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => { setOpen(v => !v); setSelectedId(null); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: '1px solid var(--border2)',
            borderRadius: 7, padding: '6px 11px', fontSize: 11,
            color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          <History size={12} />
          Versões anteriores
          <span style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 20,
            background: 'rgba(91,110,245,0.15)', color: 'var(--accent2)',
          }}>
            {versions.length}
          </span>
          {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          <div style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 8, overflow: 'hidden',
          }}>
            {versions.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(selectedId === v.id ? null : v.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  background: selectedId === v.id ? 'rgba(91,110,245,0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: i < versions.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
                }}
              >
                <Clock size={11} color="var(--text3)" />
                <span style={{ fontSize: 12, flex: 1, color: selectedId === v.id ? 'var(--accent2)' : 'var(--text2)' }}>
                  {fmtDateTime(v.date)}
                </span>
                {selectedId === v.id && <Check size={11} color="var(--accent2)" />}
              </button>
            ))}
          </div>

          {selected && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{
                  padding: 14, background: 'rgba(91,110,245,0.03)',
                  borderRight: '1px solid var(--border)',
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--accent2)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
                  }}>
                    Versão atual
                  </p>
                  {renderPreview(currentData)}
                </div>
                <div style={{ padding: 14 }}>
                  <p style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--text3)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
                  }}>
                    {fmtDateTime(selected.date)}
                  </p>
                  {renderPreview(selected.data)}
                </div>
              </div>
              <div style={{
                padding: '10px 14px', background: 'var(--bg3)', borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
              }}>
                <button
                  onClick={() => { setSelectedId(null); setOpen(false); }}
                  style={{
                    background: 'none', border: '1px solid var(--border2)',
                    borderRadius: 6, padding: '5px 12px', fontSize: 11,
                    color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { onRestore(selected.data); setSelectedId(null); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    borderRadius: 6, padding: '5px 12px', fontSize: 11,
                    fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  <Save size={11} /> Restaurar esta versão
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── SwotItem ───────────────────────────────────────────────────────────── */
let _swotId = 200;

function SwotItem({ item, color, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  function commit() {
    if (draft.trim()) onSave(item.id, draft.trim());
    setEditing(false);
  }
  function cancel() { setDraft(item.text); setEditing(false); }

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <textarea
          autoFocus value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } if (e.key === 'Escape') cancel(); }}
          rows={2}
          style={{
            flex: 1, background: 'var(--bg4)', border: `1px solid ${color}`,
            borderRadius: 6, padding: '6px 8px', color: 'var(--text)',
            fontSize: 12, fontFamily: 'var(--font-body)', resize: 'none',
            outline: 'none', lineHeight: 1.45,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={commit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', padding: 3, display: 'flex' }}><Check size={13} /></button>
          <button onClick={cancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 3, display: 'flex' }}><X size={13} /></button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '6px 7px', borderRadius: 6, cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.querySelector('.item-actions').style.opacity = '1'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.item-actions').style.opacity = '0'; }}
      onClick={() => setEditing(true)}
    >
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 6 }} />
      <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{item.text}</span>
      {item.fromGuia && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(91,110,245,0.12)', color: 'var(--accent2)', border: '1px solid rgba(91,110,245,0.2)', flexShrink: 0, marginTop: 2 }}>
          📖 Guia
        </span>
      )}
      <div className="item-actions" style={{ display: 'flex', gap: 2, flexShrink: 0, opacity: 0, transition: 'opacity 0.1s' }}>
        <button onClick={e => { e.stopPropagation(); setEditing(true); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }}>
          <Pencil size={10} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(item.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }}>
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}

/* ─── SwotQuadrant ───────────────────────────────────────────────────────── */
function SwotQuadrant({ quadKey, items, onSave, onDelete, onAdd, readOnly = false }) {
  const cfg = SWOT_CONFIG[quadKey];
  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 12, padding: 16,
      display: 'flex', flexDirection: 'column', gap: 10, minHeight: 160,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
            background: `color-mix(in srgb, ${cfg.color} 18%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: cfg.color,
          }}>
            {cfg.key}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
          <span style={{
            fontSize: 10, color: cfg.color,
            background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
            padding: '1px 6px', borderRadius: 20, border: `1px solid ${cfg.border}`,
          }}>
            {items.length}
          </span>
        </div>
        {!readOnly && (
          <button
            onClick={() => onAdd(quadKey)}
            style={{
              background: 'none', border: `1px solid ${cfg.border}`,
              borderRadius: 6, cursor: 'pointer', color: cfg.color,
              padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontFamily: 'var(--font-body)',
            }}
          >
            <Plus size={11} /> Adicionar
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item =>
          readOnly ? (
            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '4px 7px' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color, flexShrink: 0, marginTop: 6 }} />
              <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ) : (
            <SwotItem key={item.id} item={item} color={cfg.color} onSave={onSave} onDelete={onDelete} />
          )
        )}
        {items.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 7px', fontStyle: 'italic' }}>
            Nenhum item
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── SwotSection ────────────────────────────────────────────────────────── */
function SwotSection({ swot, setSwot, lastUpdated, setLastUpdated, versions, setVersions, openAI }) {
  const [showVersions, setShowVersions] = useState(false);
  const [compareId, setCompareId] = useState(null);

  const compareVersion = compareId ? versions.find(v => v.id === compareId) : null;

  function updateSwot(fn) {
    setSwot(fn);
    setLastUpdated(nowISO());
  }

  function saveItem(id, text) {
    updateSwot(prev => {
      const next = {};
      for (const q of Object.keys(prev)) next[q] = prev[q].map(it => it.id === id ? { ...it, text } : it);
      return next;
    });
  }

  function deleteItem(id) {
    updateSwot(prev => {
      const next = {};
      for (const q of Object.keys(prev)) next[q] = prev[q].filter(it => it.id !== id);
      return next;
    });
  }

  function addItem(quadKey) {
    updateSwot(prev => ({
      ...prev,
      [quadKey]: [...prev[quadKey], { id: `sw${_swotId++}`, text: 'Novo item — clique para editar' }],
    }));
  }

  function saveVersion() {
    const v = {
      id: `sv${Date.now()}`,
      label: `Versão ${fmtDateTime(nowISO())}`,
      date: nowISO(),
      data: JSON.parse(JSON.stringify(swot)),
    };
    setVersions(prev => [v, ...prev].slice(0, 20));
  }

  function handleSuggestIA() {
    const fmt = q => swot[q].map(i => `• ${i.text}`).join('\n');
    openAI(
      `Analise minha SWOT atual e sugira 2 novos itens para cada quadrante que ainda não foram mapeados.\n\n` +
      `FORÇAS atuais:\n${fmt('forcas')}\n\nFRAQUEZAS atuais:\n${fmt('fraquezas')}\n\n` +
      `OPORTUNIDADES atuais:\n${fmt('oportunidades')}\n\nAMEAÇAS atuais:\n${fmt('ameacas')}\n\n` +
      `Empresa: PME brasileira de serviços B2B, ticket médio R$4.200, ciclo de venda 28 dias. ` +
      `Seja específico e prático, com itens acionáveis para o comercial.`
    );
  }

  function handlePlanoAcao() {
    const fmt = q => swot[q].map(i => `• ${i.text}`).join('\n');
    openAI(
      `Com base na minha análise SWOT, crie um plano de ação comercial prático para os próximos 90 dias.\n\n` +
      `FORÇAS:\n${fmt('forcas')}\n\nFRAQUEZAS:\n${fmt('fraquezas')}\n\n` +
      `OPORTUNIDADES:\n${fmt('oportunidades')}\n\nAMEAÇAS:\n${fmt('ameacas')}\n\n` +
      `Priorize ações que alavancam forças contra ameaças e aproveitam oportunidades. Formato: lista numerada com responsável sugerido e prazo.`
    );
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Análise SWOT</p>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} /> {fmtDate(lastUpdated)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowVersions(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1px solid var(--border2)',
              borderRadius: 7, padding: '6px 11px', fontSize: 11,
              color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <History size={12} /> Versões ({versions.length})
            {showVersions ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <button
            onClick={handleSuggestIA}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1px solid var(--border2)',
              borderRadius: 7, padding: '6px 11px', fontSize: 11,
              color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <Bot size={12} /> IA: Sugerir itens
          </button>
          <button
            onClick={handlePlanoAcao}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 7, padding: '6px 11px',
              fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <Bot size={12} /> IA: Plano de ação
          </button>
        </div>
      </div>

      {showVersions && (
        <VersionPanel
          versions={versions}
          compareId={compareId}
          onCompare={setCompareId}
          onSave={saveVersion}
        />
      )}

      {compareVersion ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderRadius: 8, background: 'rgba(91,110,245,0.08)',
            border: '1px solid rgba(91,110,245,0.2)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 500 }}>
              Comparando: {compareVersion.label} × Versão atual
            </span>
            <button onClick={() => setCompareId(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 2 }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 500 }}>{compareVersion.label}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.keys(SWOT_CONFIG).map(q => (
                  <SwotQuadrant key={q} quadKey={q} items={compareVersion.data[q] || []} readOnly />
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 500 }}>Versão atual</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.keys(SWOT_CONFIG).map(q => (
                  <SwotQuadrant key={q} quadKey={q} items={swot[q]} readOnly />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {Object.keys(SWOT_CONFIG).map(q => (
            <SwotQuadrant key={q} quadKey={q} items={swot[q]} onSave={saveItem} onDelete={deleteItem} onAdd={addItem} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── FourPsSection ──────────────────────────────────────────────────────── */
function FourPsSection({ fourPs, setFourPs, lastUpdated, setLastUpdated, versions, setVersions, openAI }) {
  const [showVersions, setShowVersions] = useState(false);
  const [compareId, setCompareId] = useState(null);
  const compareVersion = compareId ? versions.find(v => v.id === compareId) : null;

  function updateField(pKey, fieldKey, value) {
    setFourPs(prev => ({ ...prev, [pKey]: { ...prev[pKey], [fieldKey]: value } }));
    setLastUpdated(nowISO());
  }

  function saveVersion() {
    const v = {
      id: `4pv${Date.now()}`,
      label: `Versão ${fmtDateTime(nowISO())}`,
      date: nowISO(),
      data: JSON.parse(JSON.stringify(fourPs)),
    };
    setVersions(prev => [v, ...prev].slice(0, 20));
  }

  function handleAnalyzeIA() {
    const lines = FOUR_PS_CFG.map(p =>
      `${p.label.toUpperCase()}:\n` + p.fields.map(f => `  ${f.label}: ${fourPs[p.key][f.key] || '—'}`).join('\n')
    ).join('\n\n');
    openAI(
      `Analise meu mix de marketing (4Ps) e aponte os maiores gaps e oportunidades:\n\n${lines}\n\n` +
      `Identifique qual P apresenta maior risco e qual tem maior potencial de melhoria. ` +
      `Sugira 3 ações concretas priorizadas para os próximos 60 dias.`
    );
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg4)',
    border: '1px solid var(--border)', borderRadius: 6,
    padding: '7px 10px', color: 'var(--text)',
    fontSize: 12, fontFamily: 'var(--font-body)',
    outline: 'none', resize: 'vertical', lineHeight: 1.5,
    boxSizing: 'border-box',
  };

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>4Ps + Pessoas e Processos</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            Se você vende serviço, Pessoas e Processos costumam ter mais impacto que Praça. Avalie os 6.
          </p>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} /> {fmtDate(lastUpdated)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button
            onClick={() => setShowVersions(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1px solid var(--border2)',
              borderRadius: 7, padding: '6px 11px', fontSize: 11,
              color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <History size={12} /> Versões ({versions.length})
            {showVersions ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <button
            onClick={handleAnalyzeIA}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 7, padding: '6px 11px',
              fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <Bot size={12} /> IA: Analisar mix de marketing
          </button>
        </div>
      </div>

      {showVersions && (
        <VersionPanel versions={versions} compareId={compareId} onCompare={setCompareId} onSave={saveVersion} />
      )}

      {compareVersion ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderRadius: 8, background: 'rgba(91,110,245,0.08)',
            border: '1px solid rgba(91,110,245,0.2)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 500 }}>
              Comparando: {compareVersion.label} × Versão atual
            </span>
            <button onClick={() => setCompareId(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 2 }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[compareVersion.data, fourPs].map((data, idx) => (
              <div key={idx}>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, fontWeight: 500 }}>
                  {idx === 0 ? compareVersion.label : 'Versão atual'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {FOUR_PS_CFG.map(p => (
                    <div key={p.key} style={{
                      background: p.bg, border: `1px solid ${p.border}`,
                      borderRadius: 10, padding: 12,
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: p.color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p.Icon size={12} /> {p.label}
                      </p>
                      {p.fields.map(f => (
                        <div key={f.key} style={{ marginBottom: 6 }}>
                          <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</p>
                          <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{data[p.key]?.[f.key] || '—'}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {FOUR_PS_CFG.map(p => (
            <div key={p.key} style={{
              background: p.bg, border: `1px solid ${p.border}`,
              borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: `color-mix(in srgb, ${p.color} 15%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <p.Icon size={14} color={p.color} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: p.color }}>{p.label}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.fields.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    {f.rows === 1 ? (
                      <input
                        value={fourPs[p.key][f.key] || ''}
                        onChange={e => updateField(p.key, f.key, e.target.value)}
                        style={{ ...inputStyle, padding: '6px 10px' }}
                      />
                    ) : (
                      <textarea
                        rows={f.rows}
                        value={fourPs[p.key][f.key] || ''}
                        onChange={e => updateField(p.key, f.key, e.target.value)}
                        style={inputStyle}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── PersonaModal ───────────────────────────────────────────────────────── */
let _personaId = 100;

const BLANK_PERSONA = {
  nome: '', cargo: '', avatar: '', color: '--accent2',
  descricao: '', dores: [''], decisaoCompra: '', objecoes: [''], canais: '',
};

function PersonaModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    ...BLANK_PERSONA,
    ...(initial || {}),
    dores: initial?.dores?.length ? [...initial.dores] : [''],
    objecoes: initial?.objecoes?.length ? [...initial.objecoes] : [''],
  }));

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  function setListItem(key, idx, val) {
    setForm(prev => {
      const arr = [...prev[key]];
      arr[idx] = val;
      return { ...prev, [key]: arr };
    });
  }

  function addListItem(key) { setForm(prev => ({ ...prev, [key]: [...prev[key], ''] })); }
  function removeListItem(key, idx) {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].length > 1 ? prev[key].filter((_, i) => i !== idx) : [''],
    }));
  }

  function handleSave() {
    if (!form.nome.trim()) return;
    const initials = form.nome.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    onSave({
      ...form,
      id: initial?.id || `per${_personaId++}`,
      avatar: form.avatar || initials,
      dores: form.dores.filter(d => d.trim()),
      objecoes: form.objecoes.filter(o => o.trim()),
    });
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '7px 10px', color: 'var(--text)',
    fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
  };

  function ListField({ label, listKey }) {
    return (
      <div>
        <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>{label}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {form[listKey].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input
                value={item}
                onChange={e => setListItem(listKey, i, e.target.value)}
                placeholder={`Item ${i + 1}`}
                style={inputStyle}
              />
              <button
                onClick={() => removeListItem(listKey, i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '0 4px', display: 'flex', alignItems: 'center' }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <button
            onClick={() => addListItem(listKey)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1px dashed var(--border2)',
              borderRadius: 6, padding: '5px 10px', fontSize: 11,
              color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <Plus size={11} /> Adicionar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(14,15,18,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 14, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
            {initial ? 'Editar persona' : 'Nova persona'}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Nome fictício *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Carlos, o Gestor" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Cargo e idade</label>
              <input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Ex: CEO · 38 anos" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Iniciais do avatar</label>
              <input
                value={form.avatar}
                onChange={e => set('avatar', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="Auto (nome)"
                maxLength={2}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Cor do avatar</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                {PERSONA_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => set('color', c.value)}
                    title={c.label}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                      background: `var(${c.value})`,
                      border: form.color === c.value ? '2px solid var(--text)' : '2px solid transparent',
                      outline: 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Perfil / descrição</label>
            <textarea rows={3} value={form.descricao} onChange={e => set('descricao', e.target.value)}
              placeholder="Quem é essa persona, contexto de trabalho, mentalidade..."
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <ListField label="Principais dores" listKey="dores" />

          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>O que valoriza na decisão de compra</label>
            <textarea rows={2} value={form.decisaoCompra} onChange={e => set('decisaoCompra', e.target.value)}
              placeholder="Ex: ROI claro, facilidade de uso, suporte..."
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <ListField label="Objeções comuns" listKey="objecoes" />

          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Canais preferidos</label>
            <input value={form.canais} onChange={e => set('canais', e.target.value)}
              placeholder="Ex: LinkedIn, indicação de colegas, eventos..." style={inputStyle} />
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          padding: '14px 20px', borderTop: '1px solid var(--border)',
        }}>
          <button onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '8px 16px', fontSize: 12,
              color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
            Cancelar
          </button>
          <button onClick={handleSave}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 16px', fontSize: 12,
              fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
            {initial ? 'Salvar alterações' : 'Criar persona'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PersonaCard ────────────────────────────────────────────────────────── */
function PersonaCard({ persona, onEdit, onDelete }) {
  const color = `var(${persona.color})`;
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative',
    }}
    onMouseEnter={e => e.currentTarget.querySelector('.card-actions').style.opacity = '1'}
    onMouseLeave={e => e.currentTarget.querySelector('.card-actions').style.opacity = '0'}
    >
      <div className="card-actions" style={{
        position: 'absolute', top: 12, right: 12,
        display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s',
      }}>
        <button onClick={() => onEdit(persona)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text3)', padding: 5, display: 'flex' }}>
          <Pencil size={11} />
        </button>
        <button onClick={() => onDelete(persona.id)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text3)', padding: 5, display: 'flex' }}>
          <Trash2 size={11} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          border: `2px solid color-mix(in srgb, ${color} 30%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, color,
        }}>
          {persona.avatar}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{persona.nome}</p>
            {persona.fromGuia && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(91,110,245,0.12)', color: 'var(--accent2)', border: '1px solid rgba(91,110,245,0.2)', flexShrink: 0 }}>
                📖 Guia
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{persona.cargo}</p>
        </div>
      </div>

      {persona.descricao && (
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>{persona.descricao}</p>
      )}

      {persona.dores?.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
            Principais dores
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {persona.dores.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 6 }} />
                <span style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.45 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {persona.decisaoCompra && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
            Decisão de compra
          </p>
          <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.45 }}>{persona.decisaoCompra}</p>
        </div>
      )}

      {persona.canais && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>Canais:</span>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>{persona.canais}</span>
        </div>
      )}
    </div>
  );
}

/* ─── PersonasSection ────────────────────────────────────────────────────── */
function PersonasSection({ personas, setPersonas, lastUpdated, setLastUpdated, openAI }) {
  const [modal, setModal] = useState(null); // null | 'new' | persona object
  const { versions: personaVersions, saveVersion: savePersonaVersion } = useVersionHistory('diag_personas_versions');
  const _personasStr = JSON.stringify(personas);
  const _personasMounted = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!_personasMounted.current) { _personasMounted.current = true; return; }
    savePersonaVersion(personas);
  }, [_personasStr]);

  function savePersona(data) {
    setPersonas(prev => {
      const exists = prev.find(p => p.id === data.id);
      return exists ? prev.map(p => p.id === data.id ? data : p) : [...prev, data];
    });
    setLastUpdated(nowISO());
    setModal(null);
  }

  function deletePersona(id) {
    setPersonas(prev => prev.filter(p => p.id !== id));
    setLastUpdated(nowISO());
  }

  function handleSuggestIA() {
    const names = personas.map(p => `• ${p.nome} (${p.cargo})`).join('\n');
    openAI(
      `Com base nos clientes do meu CRM — PME brasileira B2B, ticket médio R$4.200, ` +
      `segmentos: Software, Saúde e Logística, ciclo de venda 28 dias — sugira uma nova persona ` +
      `compradora ainda não mapeada.\n\nPersonas já existentes:\n${names}\n\n` +
      `Inclua: nome fictício, cargo, idade, perfil, 3 dores, critérios de decisão e objeções típicas.`
    );
  }

  return (
    <>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
              Personas
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400, marginLeft: 8 }}>
                {personas.length} perfis
              </span>
            </p>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} /> {fmtDate(lastUpdated)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button
              onClick={handleSuggestIA}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: '1px solid var(--border2)',
                borderRadius: 7, padding: '6px 11px', fontSize: 11,
                color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <Bot size={12} /> IA: Sugerir persona
            </button>
            <button
              onClick={() => setModal('new')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 7, padding: '6px 11px',
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <Plus size={12} /> Nova persona
            </button>
          </div>
        </div>

        <VersionDropdown
          versions={personaVersions}
          currentData={personas}
          onRestore={(data) => { setPersonas(data); setLastUpdated(nowISO()); }}
          renderPreview={(data) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {data.length === 0
                ? <p style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>Nenhuma persona</p>
                : data.slice(0, 5).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text)' }}>{p.nome}</span>
                    {p.cargo && <span style={{ fontSize: 10, color: 'var(--text3)' }}> · {p.cargo}</span>}
                  </div>
                ))
              }
              {data.length > 5 && <p style={{ fontSize: 10, color: 'var(--text3)' }}>+{data.length - 5} mais</p>}
            </div>
          )}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {personas.map(p => (
            <PersonaCard
              key={p.id}
              persona={p}
              onEdit={setModal}
              onDelete={deletePersona}
            />
          ))}
          {personas.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic', gridColumn: '1 / -1', padding: '20px 0' }}>
              Nenhuma persona mapeada. Clique em "Nova persona" para começar.
            </p>
          )}
        </div>
      </div>

      {modal && (
        <PersonaModal
          initial={modal === 'new' ? null : modal}
          onSave={savePersona}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

/* ─── MaturitySection ────────────────────────────────────────────────────── */
function MaturitySection({ score, scoreLabel, scoreColor }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20,
      display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <ScoreGauge score={score} size={140} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Maturidade Comercial</p>
          <span style={{
            fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, marginTop: 4,
            display: 'inline-block', color: scoreColor,
            background: `color-mix(in srgb, ${scoreColor} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${scoreColor} 30%, transparent)`,
          }}>
            {scoreLabel}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DIMENSIONS.map(d => {
          const pct = (d.score / d.max) * 100;
          const color = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
          return (
            <div key={d.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{d.label}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color }}>{d.score}/{d.max}</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ConcorrenteModal ───────────────────────────────────────────────────── */
function ConcorrenteModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    ...BLANK_COMPETITOR,
    ...(initial || {}),
    forcas: initial?.forcas?.length ? [...initial.forcas] : [''],
    fraquezas: initial?.fraquezas?.length ? [...initial.fraquezas] : [''],
    canais: initial?.canais ? [...initial.canais] : [],
  }));

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  function toggleCanal(canal) {
    setForm(prev => ({
      ...prev,
      canais: prev.canais.includes(canal)
        ? prev.canais.filter(c => c !== canal)
        : [...prev.canais, canal],
    }));
  }

  function setListItem(key, idx, val) {
    setForm(prev => { const a = [...prev[key]]; a[idx] = val; return { ...prev, [key]: a }; });
  }
  function addListItem(key) { setForm(prev => ({ ...prev, [key]: [...prev[key], ''] })); }
  function removeListItem(key, idx) {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].length > 1 ? prev[key].filter((_, i) => i !== idx) : [''],
    }));
  }

  function handleSave() {
    if (!form.nome.trim()) return;
    onSave({
      ...form,
      id: initial?.id || `comp${_competitorId++}`,
      forcas: form.forcas.filter(f => f.trim()),
      fraquezas: form.fraquezas.filter(f => f.trim()),
    });
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '7px 10px', color: 'var(--text)',
    fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
  };

  function ListField({ label, listKey }) {
    return (
      <div>
        <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>{label}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {form[listKey].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input
                value={item}
                onChange={e => setListItem(listKey, i, e.target.value)}
                placeholder={`Item ${i + 1}`}
                style={inputStyle}
              />
              <button
                onClick={() => removeListItem(listKey, i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '0 4px', display: 'flex', alignItems: 'center' }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <button
            onClick={() => addListItem(listKey)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1px dashed var(--border2)',
              borderRadius: 6, padding: '5px 10px', fontSize: 11,
              color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <Plus size={11} /> Adicionar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(14,15,18,0.82)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 14, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
            {initial ? 'Editar concorrente' : 'Novo concorrente'}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Nome *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Pipedrive" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Site</label>
              <input value={form.site} onChange={e => set('site', e.target.value)} placeholder="Ex: pipedrive.com" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 7 }}>Faixa de preço</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {FAIXA_PRECO_CFG.map(fp => (
                <button
                  key={fp.value}
                  onClick={() => set('faixaPreco', fp.value)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: 12,
                    fontWeight: form.faixaPreco === fp.value ? 600 : 400,
                    background: form.faixaPreco === fp.value ? fp.bg : 'var(--bg4)',
                    color: form.faixaPreco === fp.value ? fp.color : 'var(--text3)',
                    border: `1px solid ${form.faixaPreco === fp.value ? fp.color : 'var(--border)'}`,
                    transition: 'all 0.12s',
                  }}
                >
                  {fp.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 7 }}>Canais de marketing</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CANAIS_OPCOES.map(canal => {
                const active = form.canais.includes(canal);
                return (
                  <button
                    key={canal}
                    onClick={() => toggleCanal(canal)}
                    style={{
                      padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                      fontFamily: 'var(--font-body)', fontSize: 11,
                      background: active ? 'rgba(91,110,245,0.15)' : 'var(--bg4)',
                      color: active ? 'var(--accent2)' : 'var(--text3)',
                      border: `1px solid ${active ? 'rgba(91,110,245,0.4)' : 'var(--border)'}`,
                      transition: 'all 0.1s',
                    }}
                  >
                    {canal}
                  </button>
                );
              })}
            </div>
          </div>

          <ListField label="Pontos fortes" listKey="forcas" />
          <ListField label="Pontos fracos" listKey="fraquezas" />

          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>
              Nossos diferenciais vs este concorrente
            </label>
            <textarea
              rows={3}
              value={form.diferenciais}
              onChange={e => set('diferenciais', e.target.value)}
              placeholder="O que nossa empresa oferece que este concorrente não tem..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          padding: '14px 20px', borderTop: '1px solid var(--border)',
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--border2)', borderRadius: 8,
              padding: '8px 16px', fontSize: 12, color: 'var(--text2)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 16px', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            {initial ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ConcorrenteCard ────────────────────────────────────────────────────── */
function ConcorrenteCard({ comp, onEdit, onDelete }) {
  const priceCfg = FAIXA_PRECO_CFG.find(f => f.value === comp.faixaPreco) || FAIXA_PRECO_CFG[1];
  const initials = comp.nome.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  return (
    <div
      style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.querySelector('.card-actions').style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.querySelector('.card-actions').style.opacity = '0'}
    >
      <div className="card-actions" style={{
        position: 'absolute', top: 12, right: 12,
        display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s',
      }}>
        <button
          onClick={() => onEdit(comp)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text3)', padding: 5, display: 'flex' }}
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={() => onDelete(comp.id)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text3)', padding: 5, display: 'flex' }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: 'var(--bg4)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, color: 'var(--text2)',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{comp.nome}</p>
            {comp.fromGuia && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(91,110,245,0.12)', color: 'var(--accent2)', border: '1px solid rgba(91,110,245,0.2)', flexShrink: 0 }}>
                📖 Guia
              </span>
            )}
          </div>
          {comp.site && (
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Globe size={10} /> {comp.site}
            </p>
          )}
        </div>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
          color: priceCfg.color, background: priceCfg.bg,
          border: `1px solid color-mix(in srgb, ${priceCfg.color} 30%, transparent)`,
        }}>
          {priceCfg.label}
        </span>
      </div>

      {comp.forcas?.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Pontos fortes
          </p>
          {comp.forcas.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, marginTop: 6 }} />
              <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.45 }}>{f}</span>
            </div>
          ))}
        </div>
      )}

      {comp.fraquezas?.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Pontos fracos
          </p>
          {comp.fraquezas.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)', flexShrink: 0, marginTop: 6 }} />
              <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.45 }}>{f}</span>
            </div>
          ))}
        </div>
      )}

      {comp.diferenciais && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
            Nosso diferencial
          </p>
          <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{comp.diferenciais}</p>
        </div>
      )}

      {comp.canais?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {comp.canais.map(c => (
            <span key={c} style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 20,
              background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)',
            }}>
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── ConcorrentesSection ────────────────────────────────────────────────── */
function ConcorrentesSection({ openAI }) {
  const [competitors, setCompetitors] = useLocalStorage('diag_competitors', INITIAL_COMPETITORS);
  const [swot] = useLocalStorage('diag_swot', INITIAL_SWOT);
  const [modal, setModal] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const { versions: concVersions, saveVersion: saveConcVersion } = useVersionHistory('diag_competitors_versions');
  const _concStr = JSON.stringify(competitors);
  const _concMounted = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!_concMounted.current) { _concMounted.current = true; return; }
    saveConcVersion(competitors);
  }, [_concStr]);

  function saveCompetitor(data) {
    setCompetitors(prev => {
      const exists = prev.find(c => c.id === data.id);
      return exists ? prev.map(c => c.id === data.id ? data : c) : [...prev, data];
    });
    setModal(null);
  }

  function deleteCompetitor(id) {
    setCompetitors(prev => prev.filter(c => c.id !== id));
  }

  function handleAnalyzeIA() {
    const priceFmt = fp => FAIXA_PRECO_CFG.find(f => f.value === fp)?.label || fp;
    const compFmt = competitors.map(c =>
      `• ${c.nome} (${priceFmt(c.faixaPreco)}) — ${c.site || 'sem site'}\n` +
      `  Forças: ${c.forcas.slice(0, 2).join('; ')}\n` +
      `  Fraquezas: ${c.fraquezas.slice(0, 2).join('; ')}\n` +
      `  Nosso diferencial: ${c.diferenciais || '—'}`
    ).join('\n\n');
    openAI(
      `Analise o posicionamento competitivo da minha empresa no mercado de CRM para PMEs brasileiras.\n\n` +
      `MINHA EMPRESA:\n` +
      `• Produto: Plataforma SaaS (CRM + guia educacional + IA contextual)\n` +
      `• Faixa de preço: Médio (R$29–179/mês)\n` +
      `• Forças: ${swot.forcas.slice(0, 3).map(f => f.text).join('; ')}\n` +
      `• Fraquezas: ${swot.fraquezas.slice(0, 2).map(f => f.text).join('; ')}\n\n` +
      `CONCORRENTES MAPEADOS (${competitors.length}):\n${compFmt}\n\n` +
      `Com base nessa análise responda: (1) Qual é nosso posicionamento mais forte? ` +
      `(2) Que gaps dos concorrentes podemos explorar? (3) Quais ameaças monitorar? ` +
      `(4) 3 ações concretas de posicionamento para os próximos 60 dias.`
    );
  }

  const minha = {
    key: 'minha', nome: 'Minha empresa', faixaPreco: 'medio',
    canais: ['Instagram', 'LinkedIn', 'SEO/Blog'],
    forcas: swot.forcas.slice(0, 3).map(f => f.text),
    fraquezas: swot.fraquezas.slice(0, 2).map(f => f.text),
    diferenciais: null,
  };

  const tableColumns = [minha, ...competitors];

  const tableRows = [
    {
      label: 'Faixa de preço',
      render: (c) => {
        const cfg = FAIXA_PRECO_CFG.find(f => f.value === c.faixaPreco);
        return cfg
          ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, color: cfg.color, background: cfg.bg, border: `1px solid color-mix(in srgb, ${cfg.color} 30%, transparent)` }}>{cfg.label}</span>
          : <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>;
      },
    },
    {
      label: 'Canais',
      render: (c) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {(c.canais || []).slice(0, 4).map(ch => (
            <span key={ch} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)' }}>{ch}</span>
          ))}
          {(c.canais?.length || 0) > 4 && <span style={{ fontSize: 10, color: 'var(--text3)' }}>+{c.canais.length - 4}</span>}
        </div>
      ),
    },
    {
      label: 'Pontos fortes',
      render: (c) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {(c.forcas || []).slice(0, 3).map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, marginTop: 5 }} />
              <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Pontos fracos',
      render: (c) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {(c.fraquezas || []).slice(0, 3).map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)', flexShrink: 0, marginTop: 5 }} />
              <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Nosso diferencial',
      render: (c) => c.diferenciais === null
        ? <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>— (é sua empresa)</span>
        : <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{c.diferenciais || '—'}</span>,
    },
  ];

  return (
    <>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
              Análise de Concorrentes
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400, marginLeft: 8 }}>
                {competitors.length} {competitors.length === 1 ? 'cadastrado' : 'cadastrados'}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowTable(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: '1px solid var(--border2)',
                borderRadius: 7, padding: '6px 11px', fontSize: 11,
                color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <BarChart2 size={12} /> Tabela comparativa
              {showTable ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            <button
              onClick={handleAnalyzeIA}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: '1px solid var(--border2)',
                borderRadius: 7, padding: '6px 11px', fontSize: 11,
                color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <Bot size={12} /> IA: Analisar posicionamento
            </button>
            <button
              onClick={() => setModal('new')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 7, padding: '6px 11px', fontSize: 11,
                fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <Plus size={12} /> Novo concorrente
            </button>
          </div>
        </div>

        <VersionDropdown
          versions={concVersions}
          currentData={competitors}
          onRestore={(data) => setCompetitors(data)}
          renderPreview={(data) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.length === 0
                ? <p style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>Nenhum concorrente</p>
                : data.slice(0, 6).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text)' }}>{c.nome}</span>
                    {c.faixaPreco && (
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                        · {FAIXA_PRECO_CFG.find(f => f.value === c.faixaPreco)?.label || c.faixaPreco}
                      </span>
                    )}
                  </div>
                ))
              }
              {data.length > 6 && <p style={{ fontSize: 10, color: 'var(--text3)' }}>+{data.length - 6} mais</p>}
            </div>
          )}
        />

        {/* Comparative table — collapsible */}
        {showTable && (
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: 'var(--bg3)' }}>
                  <th style={{
                    width: 140, textAlign: 'left', padding: '10px 14px',
                    fontSize: 11, color: 'var(--text3)', fontWeight: 500,
                    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                  }}>
                    Critério
                  </th>
                  {tableColumns.map((c, idx) => (
                    <th key={c.key || c.id} style={{
                      minWidth: 190, textAlign: 'left', padding: '10px 14px',
                      fontSize: 12, fontWeight: 600, borderBottom: '1px solid var(--border)',
                      color: idx === 0 ? 'var(--accent2)' : 'var(--text)',
                      background: idx === 0 ? 'rgba(91,110,245,0.08)' : 'transparent',
                    }}>
                      {c.nome}
                      {idx === 0 && (
                        <span style={{
                          marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 20,
                          background: 'rgba(91,110,245,0.2)', color: 'var(--accent2)',
                        }}>você</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                    <td style={{
                      padding: '10px 14px', fontSize: 11, color: 'var(--text3)',
                      fontWeight: 500, verticalAlign: 'top',
                      borderBottom: ri < tableRows.length - 1 ? '1px solid var(--border)' : 'none',
                      whiteSpace: 'nowrap',
                    }}>
                      {row.label}
                    </td>
                    {tableColumns.map((c, idx) => (
                      <td key={c.key || c.id} style={{
                        padding: '10px 14px', verticalAlign: 'top',
                        borderBottom: ri < tableRows.length - 1 ? '1px solid var(--border)' : 'none',
                        background: idx === 0 ? 'rgba(91,110,245,0.03)' : 'transparent',
                      }}>
                        {row.render(c, idx)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Competitor cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {competitors.map(c => (
            <ConcorrenteCard key={c.id} comp={c} onEdit={setModal} onDelete={deleteCompetitor} />
          ))}
          {competitors.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic', gridColumn: '1 / -1', padding: '20px 0' }}>
              Nenhum concorrente cadastrado. Clique em "+ Novo concorrente" para começar.
            </p>
          )}
        </div>
      </div>

      {modal && (
        <ConcorrenteModal
          initial={modal === 'new' ? null : modal}
          onSave={saveCompetitor}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

/* ─── FunilVendasSection ─────────────────────────────────────────────────── */
function FunilVendasSection({ openAI }) {
  const [stages, setStages] = useLocalStorage('diag_funil', INITIAL_FUNNEL);
  const [editingId, setEditingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const { versions: funilVersions, saveVersion: saveFunilVersion } = useVersionHistory('diag_funil_versions');
  const _funilStr = JSON.stringify(stages);
  const _funilMounted = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!_funilMounted.current) { _funilMounted.current = true; return; }
    saveFunilVersion(stages);
  }, [_funilStr]);

  const maxVolume = Math.max(...stages.map(s => s.volume), 1);

  const bottleneckIdx = (() => {
    let maxDrop = 0;
    let idx = -1;
    for (let i = 1; i < stages.length; i++) {
      const drop = stages[i - 1].volume - stages[i].volume;
      if (drop > maxDrop) { maxDrop = drop; idx = i; }
    }
    return idx;
  })();

  function startEdit(stage) {
    setEditingId(stage.id);
    setDrafts({ nome: stage.nome, volume: String(stage.volume), conversao: String(stage.conversao) });
  }

  function commitEdit(id) {
    setStages(prev => prev.map(s =>
      s.id !== id ? s : {
        ...s,
        nome: drafts.nome.trim() || s.nome,
        volume: Math.max(0, parseInt(drafts.volume) || 0),
        conversao: Math.min(100, Math.max(0, parseInt(drafts.conversao) || 0)),
      }
    ));
    setEditingId(null);
  }

  function addStage() {
    const last = stages[stages.length - 1];
    setStages(prev => [
      ...prev,
      { id: `fu${_funelId++}`, nome: 'Nova etapa', volume: last ? Math.round(last.volume * 0.5) : 50, conversao: 50 },
    ]);
  }

  function deleteStage(id) {
    if (stages.length <= 2) return;
    setStages(prev => prev.filter(s => s.id !== id));
  }

  function onDragEnd(result) {
    if (!result.destination || result.destination.index === result.source.index) return;
    const items = Array.from(stages);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setStages(items);
  }

  function handleCompareCRM() {
    const first = stages[0];
    const last = stages[stages.length - 1];
    const overall = first?.volume > 0 ? Math.round((last?.volume / first.volume) * 100) : 0;
    const fmtStages = stages.map((s, i) => {
      const prev = stages[i - 1];
      const drop = prev ? ` (−${prev.volume - s.volume} leads / ${100 - Math.round(s.volume / prev.volume * 100)}% queda)` : ' (topo)';
      return `${i + 1}. ${s.nome}: ${s.volume} leads · ${s.conversao}% conv.${drop}`;
    }).join('\n');
    openAI(
      `Analise meu funil de vendas e compare com benchmarks para PMEs B2B brasileiras.\n\n` +
      `FUNIL ATUAL (${stages.length} etapas):\n${fmtStages}\n\n` +
      `Entrada: ${first?.volume || 0} leads · Saída: ${last?.volume || 0} fechados · Conversão geral: ${overall}%\n\n` +
      `Identifique: (1) etapas abaixo do benchmark, (2) o principal gargalo com causa provável, ` +
      `(3) 3 ações concretas para melhorar a etapa mais crítica.`
    );
  }

  const totalConv = stages[0]?.volume > 0
    ? Math.round((stages[stages.length - 1]?.volume / stages[0].volume) * 100)
    : 0;

  const inputStyle = {
    background: 'var(--bg4)', border: '1px solid var(--border2)',
    borderRadius: 6, padding: '4px 8px', color: 'var(--text)',
    fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none',
  };

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Funil de Vendas Atual</p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
            {stages.length} etapas · {stages[0]?.volume || 0} leads entrada →{' '}
            {stages[stages.length - 1]?.volume || 0} fechados · {totalConv}% conversão geral
          </p>
        </div>
        <button
          onClick={handleCompareCRM}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 14px', fontSize: 12,
            fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          <Bot size={13} /> IA: Comparar com CRM
        </button>
      </div>

      <VersionDropdown
        versions={funilVersions}
        currentData={stages}
        onRestore={(data) => setStages(data)}
        renderPreview={(data) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>{i + 1}. {s.nome}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{s.volume} leads</span>
              </div>
            ))}
          </div>
        )}
      />

      {/* Funnel visualization */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        {stages.map((s, i) => {
          const pct = Math.round((s.volume / maxVolume) * 100);
          const isBottleneck = i === bottleneckIdx;
          const prev = stages[i - 1];
          const drop = prev ? prev.volume - s.volume : 0;
          const dropPct = prev?.volume > 0 ? Math.round((drop / prev.volume) * 100) : 0;
          const convColor = s.conversao >= 60 ? 'var(--green)' : s.conversao >= 35 ? 'var(--amber)' : 'var(--red)';

          return (
            <div key={s.id} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {i > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0' }}>
                  {isBottleneck ? (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 11, color: 'var(--red)', fontWeight: 500,
                      background: 'rgba(240,92,92,0.1)', border: '1px solid rgba(240,92,92,0.25)',
                      padding: '2px 9px', borderRadius: 20,
                    }}>
                      <AlertTriangle size={11} /> Gargalo — −{drop} leads ({dropPct}% queda)
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      −{drop} leads ({dropPct}%)
                    </span>
                  )}
                </div>
              )}
              <div style={{
                width: `${Math.max(pct, 22)}%`,
                background: isBottleneck ? 'rgba(240,92,92,0.1)' : 'rgba(91,110,245,0.08)',
                border: `1px solid ${isBottleneck ? 'rgba(240,92,92,0.3)' : 'var(--border)'}`,
                borderRadius: 8, padding: '9px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 8, minWidth: 200, transition: 'width 0.4s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    background: isBottleneck ? 'rgba(240,92,92,0.15)' : 'rgba(91,110,245,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600,
                    color: isBottleneck ? 'var(--red)' : 'var(--accent2)',
                  }}>{i + 1}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 500, color: isBottleneck ? 'var(--red)' : 'var(--text)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{s.nome}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 15, color: 'var(--text)' }}>
                    {s.volume}
                  </span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 20, whiteSpace: 'nowrap',
                    color: convColor,
                    background: `color-mix(in srgb, ${convColor} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${convColor} 25%, transparent)`,
                  }}>
                    {s.conversao}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Builder — DnD list */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 11, color: 'var(--text3)', fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Editar etapas
          </span>
          <button
            onClick={addStage}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1px solid var(--border2)',
              borderRadius: 7, padding: '5px 11px', fontSize: 11,
              color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <Plus size={12} /> Adicionar etapa
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="funil-stages">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                {stages.map((s, i) => (
                  <Draggable key={s.id} draggableId={s.id} index={i}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...provided.draggableProps.style,
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: snapshot.isDragging ? 'var(--bg4)' : 'var(--bg3)',
                          border: `1px solid ${snapshot.isDragging ? 'var(--border2)' : 'var(--border)'}`,
                          borderRadius: 8, padding: '8px 10px',
                          boxShadow: snapshot.isDragging ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
                        }}
                      >
                        {/* Drag handle */}
                        <div
                          {...provided.dragHandleProps}
                          style={{ color: 'var(--text3)', display: 'flex', cursor: 'grab', flexShrink: 0, padding: 2 }}
                        >
                          <GripVertical size={13} />
                        </div>

                        {/* Stage number */}
                        <span style={{
                          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                          background: 'var(--bg4)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 10, color: 'var(--text3)', fontWeight: 500,
                        }}>
                          {i + 1}
                        </span>

                        {editingId === s.id ? (
                          <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              autoFocus
                              value={drafts.nome}
                              onChange={e => setDrafts(d => ({ ...d, nome: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitEdit(s.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              placeholder="Nome da etapa"
                              style={{ ...inputStyle, flex: 2, minWidth: 100 }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input
                                type="number" min={0}
                                value={drafts.volume}
                                onChange={e => setDrafts(d => ({ ...d, volume: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') commitEdit(s.id); }}
                                style={{ ...inputStyle, width: 72 }}
                              />
                              <span style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>leads</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input
                                type="number" min={0} max={100}
                                value={drafts.conversao}
                                onChange={e => setDrafts(d => ({ ...d, conversao: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') commitEdit(s.id); }}
                                style={{ ...inputStyle, width: 56 }}
                              />
                              <span style={{ fontSize: 10, color: 'var(--text3)' }}>% conv.</span>
                            </div>
                            <button
                              onClick={() => commitEdit(s.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', padding: 2, display: 'flex' }}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                            onClick={() => startEdit(s)}
                          >
                            <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{s.nome}</span>
                            <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                              {s.volume} leads
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                              {s.conversao}% conv.
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); startEdit(s); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }}
                            >
                              <Pencil size={11} />
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => deleteStage(s.id)}
                          disabled={stages.length <= 2}
                          style={{
                            background: 'none', border: 'none', flexShrink: 0,
                            cursor: stages.length <= 2 ? 'not-allowed' : 'pointer',
                            color: stages.length <= 2 ? 'var(--bg4)' : 'var(--text3)',
                            padding: 2, display: 'flex',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
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
    </div>
  );
}

/* ─── ScoreMaturidadeSection ─────────────────────────────────────────────── */
function ScoreMaturidadeSection() {
  const [scoreHistory, setScoreHistory] = useLocalStorage('diag_maturity_score_history', []);
  const [phase, setPhase] = useState(() => scoreHistory.length > 0 ? 'result' : 'quiz');
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(MATURITY_QUESTIONS.map(d => [d.dim, [null, null, null, null]]))
  );
  const [quizError, setQuizError] = useState(false);

  const lastEntry = scoreHistory[0] || null;

  function getDimScore(dimKey, ans) {
    if (ans.some(a => a === null)) return 0;
    return Math.round((ans.reduce((s, a) => s + a, 0) - 4) / 16 * 100);
  }

  function setAnswer(dim, qIdx, val) {
    setAnswers(prev => ({
      ...prev,
      [dim]: prev[dim].map((a, i) => i === qIdx ? val : a),
    }));
    if (quizError) setQuizError(false);
  }

  function handleSubmit() {
    const allAnswered = MATURITY_QUESTIONS.every(d => answers[d.dim].every(a => a !== null));
    if (!allAnswered) { setQuizError(true); return; }
    setQuizError(false);
    const dims = Object.fromEntries(
      MATURITY_QUESTIONS.map(d => [d.dim, getDimScore(d.dim, answers[d.dim])])
    );
    const total = Math.round(Object.values(dims).reduce((s, v) => s + v, 0) / 5);
    const entry = { id: `ms${Date.now()}`, date: nowISO(), score: total, dims };
    setScoreHistory(prev => [entry, ...prev].slice(0, 20));
    setPhase('result');
  }

  function handleReset() {
    setAnswers(Object.fromEntries(MATURITY_QUESTIONS.map(d => [d.dim, [null, null, null, null]])));
    setQuizError(false);
    setPhase('quiz');
  }

  const answeredCount = MATURITY_QUESTIONS.reduce(
    (s, d) => s + answers[d.dim].filter(a => a !== null).length, 0
  );
  const getScoreLabel = s => s >= 70 ? 'Maduro' : s >= 45 ? 'Em desenvolvimento' : 'Inicial';
  const getScoreColor = s => s >= 70 ? 'var(--green)' : s >= 45 ? 'var(--amber)' : 'var(--red)';

  const radarData = lastEntry
    ? MATURITY_QUESTIONS.map(d => ({ dim: d.label, score: lastEntry.dims[d.dim] }))
    : [];

  const historyData = [...scoreHistory].reverse().map(e => ({
    date: new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    score: e.score,
  }));

  const weakDims = lastEntry
    ? MATURITY_QUESTIONS
        .map(d => ({ ...d, score: lastEntry.dims[d.dim] }))
        .sort((a, b) => a.score - b.score)
        .slice(0, 2)
    : [];

  /* ── Quiz phase ── */
  if (phase === 'quiz') {
    return (
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
              Score de Maturidade Comercial
            </p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
              {answeredCount}/20 perguntas respondidas · escala 1 (nunca) a 5 (sempre)
            </p>
          </div>
          {scoreHistory.length > 0 && (
            <button
              onClick={() => setPhase('result')}
              style={{
                background: 'none', border: '1px solid var(--border2)',
                borderRadius: 8, padding: '7px 13px', fontSize: 12,
                color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Ver último resultado
            </button>
          )}
        </div>

        {MATURITY_QUESTIONS.map(dim => (
          <div key={dim.dim} style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dim.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: dim.color }}>{dim.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                ({answers[dim.dim].filter(a => a !== null).length}/4)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dim.questions.map((q, qi) => {
                const ans = answers[dim.dim][qi];
                const unanswered = quizError && ans === null;
                return (
                  <div key={qi} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: unanswered ? 'rgba(240,92,92,0.05)' : 'var(--bg4)',
                    border: `1px solid ${unanswered ? 'rgba(240,92,92,0.25)' : 'transparent'}`,
                  }}>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.5 }}>{q}</p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text3)', marginRight: 2 }}>Nunca</span>
                      {[1, 2, 3, 4, 5].map(v => (
                        <button
                          key={v}
                          onClick={() => setAnswer(dim.dim, qi, v)}
                          title={SCALE_LABELS[v - 1]}
                          style={{
                            width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                            fontFamily: 'var(--font-body)', fontSize: 12,
                            fontWeight: ans === v ? 600 : 400,
                            background: ans === v
                              ? `color-mix(in srgb, ${dim.color} 20%, transparent)`
                              : 'var(--bg3)',
                            color: ans === v ? dim.color : 'var(--text3)',
                            border: ans === v ? `1px solid ${dim.color}` : '1px solid var(--border)',
                            transition: 'all 0.12s',
                          }}
                        >
                          {v}
                        </button>
                      ))}
                      <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 2 }}>Sempre</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {quizError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(240,92,92,0.07)', border: '1px solid rgba(240,92,92,0.2)',
          }}>
            <AlertTriangle size={14} color="var(--red)" />
            <span style={{ fontSize: 12, color: 'var(--red)' }}>
              Responda as {20 - answeredCount} perguntas restantes antes de concluir.
            </span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          style={{
            alignSelf: 'flex-end',
            background: answeredCount === 20 ? 'var(--accent)' : 'var(--bg4)',
            color: answeredCount === 20 ? '#fff' : 'var(--text3)',
            border: 'none', borderRadius: 8, padding: '9px 20px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-body)', transition: 'background 0.2s',
          }}
        >
          Concluir avaliação ({answeredCount}/20)
        </button>
      </div>
    );
  }

  /* ── Result phase ── */
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
            Score de Maturidade Comercial
          </p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
            Avaliado em {fmtDate(lastEntry?.date)} · {scoreHistory.length}{' '}
            {scoreHistory.length === 1 ? 'avaliação' : 'avaliações'} no histórico
          </p>
        </div>
        <button
          onClick={handleReset}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid var(--border2)',
            borderRadius: 8, padding: '7px 13px', fontSize: 12,
            color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          Refazer questionário
        </button>
      </div>

      {/* Score + Radar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ScoreGauge score={lastEntry?.score || 0} size={140} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Score geral</p>
            <span style={{
              fontSize: 11, padding: '2px 9px', borderRadius: 20, marginTop: 4,
              display: 'inline-block',
              color: getScoreColor(lastEntry?.score || 0),
              background: `color-mix(in srgb, ${getScoreColor(lastEntry?.score || 0)} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${getScoreColor(lastEntry?.score || 0)} 30%, transparent)`,
            }}>
              {getScoreLabel(lastEntry?.score || 0)}
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={radarData} cx="50%" cy="50%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="dim"
              tick={{ fill: 'var(--text2)', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--text3)', fontSize: 9 }}
              tickCount={4}
              angle={90}
            />
            <Radar
              name="Maturidade" dataKey="score"
              stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.18}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-dimension scores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {MATURITY_QUESTIONS.map(d => {
          const s = lastEntry?.dims[d.dim] || 0;
          return (
            <div key={d.dim} style={{
              background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px',
              border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: d.color, fontWeight: 500 }}>{d.label}</span>
              </div>
              <span style={{
                fontFamily: 'DM Serif Display, serif', fontSize: 26,
                color: 'var(--text)', lineHeight: 1,
              }}>
                {s}
              </span>
              <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 99 }}>
                <div style={{
                  height: '100%', width: `${s}%`, background: d.color,
                  borderRadius: 99, transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations for 2 weakest dimensions */}
      {weakDims.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{
            fontSize: 12, fontWeight: 500, color: 'var(--text2)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <AlertTriangle size={13} color="var(--amber)" />
            Prioridades de melhoria — as 2 dimensões mais baixas
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {weakDims.map(d => (
              <div key={d.dim} style={{
                background: `color-mix(in srgb, ${d.color} 5%, var(--bg3))`,
                border: `1px solid color-mix(in srgb, ${d.color} 20%, transparent)`,
                borderRadius: 10, padding: 14,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: d.color }}>{d.label}</span>
                  <span style={{
                    fontSize: 11, padding: '2px 7px', borderRadius: 20,
                    color: getScoreColor(d.score),
                    background: `color-mix(in srgb, ${getScoreColor(d.score)} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${getScoreColor(d.score)} 25%, transparent)`,
                  }}>
                    {d.score}/100
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {d.recs.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        background: `color-mix(in srgb, ${d.color} 15%, transparent)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, color: d.color, marginTop: 1,
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score evolution chart */}
      {scoreHistory.length > 1 && (
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 14,
        }}>
          <p style={{
            fontSize: 11, color: 'var(--text3)', fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12,
          }}>
            Evolução do score
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={historyData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text3)', fontSize: 10 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--text3)', fontSize: 10 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg4)', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 12, color: 'var(--text)',
                }}
                labelStyle={{ color: 'var(--text2)' }}
              />
              <Line
                type="monotone" dataKey="score" name="Score"
                stroke="var(--accent)" strokeWidth={2}
                dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: 'var(--accent2)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ─── Canvas de Proposta de Valor — dados e config ──────────────────────── */
const INITIAL_VPC = {
  tarefas: [
    'Estruturar o processo de vendas da empresa',
    'Acompanhar métricas e resultados do time comercial',
    'Prospectar novos clientes de forma consistente',
  ],
  dores: [
    'Falta de tempo para organizar o processo comercial',
    'Dificuldade em saber quais leads priorizar',
    'Perda de negócios por ausência de follow-up no momento certo',
  ],
  ganhos: [
    'Aumentar a taxa de conversão de leads em menos de 90 dias',
    'Ter previsibilidade de receita mensal',
    'Equipe mais produtiva e autônoma com metas claras',
  ],
  produtos: [
    'Plataforma SaaS com CRM integrado',
    'Guia em 8 capítulos para estruturar o comercial',
    'Assistente IA contextual para vendas B2B',
  ],
  aliviadores: [
    'Configuração simples — menos de 1 hora para começar',
    'Alertas automáticos de follow-up no momento certo',
    'Pipeline visual para priorizar leads com clareza',
  ],
  criadores: [
    'Dashboard de KPIs e forecast em tempo real',
    'Templates prontos de prospecção e follow-up',
    'Régua de comunicação automatizada para nutrição de leads',
  ],
};

const VPC_LEFT_CFG = [
  { key: 'tarefas',  label: 'Tarefas do cliente', color: 'var(--teal)',  subtitle: 'O que o cliente tenta realizar ou resolver' },
  { key: 'dores',    label: 'Dores',               color: 'var(--red)',   subtitle: 'Frustrações, obstáculos e riscos que quer evitar' },
  { key: 'ganhos',   label: 'Ganhos desejados',    color: 'var(--green)', subtitle: 'Resultados e benefícios que o cliente quer alcançar' },
];

const VPC_RIGHT_CFG = [
  { key: 'produtos',    label: 'Produtos / Serviços',  color: 'var(--accent2)', subtitle: 'O que você oferece ao cliente' },
  { key: 'aliviadores', label: 'Aliviadores de dor',   color: 'var(--amber)',   subtitle: 'Como você elimina ou reduz as dores do cliente' },
  { key: 'criadores',   label: 'Criadores de ganho',   color: 'var(--purple)',  subtitle: 'Como você gera benefícios e resultados' },
];

function calcVpcFit(vpc) {
  const all = ['tarefas', 'dores', 'ganhos', 'produtos', 'aliviadores', 'criadores'];
  // 10 pts por seção com ao menos 1 item = máx 60
  let score = all.reduce((s, k) => s + (vpc[k]?.filter(i => i.trim()).length > 0 ? 10 : 0), 0);
  // Cobertura aliviadores vs dores = até 20 pts
  const doresN = vpc.dores?.filter(i => i.trim()).length || 0;
  const aliviN = vpc.aliviadores?.filter(i => i.trim()).length || 0;
  if (doresN > 0 && aliviN > 0) score += Math.round(Math.min(aliviN / doresN, 1) * 20);
  // Cobertura criadores vs ganhos = até 20 pts
  const ganhosN = vpc.ganhos?.filter(i => i.trim()).length || 0;
  const criaN = vpc.criadores?.filter(i => i.trim()).length || 0;
  if (ganhosN > 0 && criaN > 0) score += Math.round(Math.min(criaN / ganhosN, 1) * 20);
  return Math.min(score, 100);
}

/* ─── VpcList ────────────────────────────────────────────────────────────── */
function VpcList({ items, color, onUpdate }) {
  const [editIdx, setEditIdx] = useState(null);
  const [draft, setDraft] = useState('');

  function startEdit(idx) { setEditIdx(idx); setDraft(items[idx]); }

  function commitEdit() {
    if (draft.trim()) {
      onUpdate(items.map((it, i) => i === editIdx ? draft.trim() : it));
    } else {
      onUpdate(items.filter((_, i) => i !== editIdx));
    }
    setEditIdx(null);
  }

  function cancelEdit() {
    if (items[editIdx] === '') onUpdate(items.filter((_, i) => i !== editIdx));
    setEditIdx(null);
  }

  function addItem() {
    const next = [...items, ''];
    onUpdate(next);
    setEditIdx(next.length - 1);
    setDraft('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {items.map((item, i) =>
        editIdx === i ? (
          <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                if (e.key === 'Escape') cancelEdit();
              }}
              rows={2}
              style={{
                flex: 1, background: 'var(--bg4)', border: `1px solid ${color}`,
                borderRadius: 6, padding: '5px 8px', color: 'var(--text)',
                fontSize: 12, fontFamily: 'var(--font-body)', resize: 'none',
                outline: 'none', lineHeight: 1.45,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2 }}>
              <button onClick={commitEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', padding: 3, display: 'flex' }}>
                <Check size={13} />
              </button>
              <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 3, display: 'flex' }}>
                <X size={13} />
              </button>
            </div>
          </div>
        ) : (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 5px', borderRadius: 6, cursor: 'pointer' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.querySelector('.vpc-del').style.opacity = '1';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.querySelector('.vpc-del').style.opacity = '0';
            }}
            onClick={() => startEdit(i)}
          >
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 7 }} />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{item}</span>
            <button
              className="vpc-del"
              onClick={e => { e.stopPropagation(); onUpdate(items.filter((_, j) => j !== i)); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex', opacity: 0, transition: 'opacity 0.1s', flexShrink: 0 }}
            >
              <Trash2 size={10} />
            </button>
          </div>
        )
      )}
      <button
        onClick={addItem}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, marginTop: 3,
          background: 'none', border: 'none', cursor: 'pointer',
          color: color, fontFamily: 'var(--font-body)', fontSize: 11,
          padding: '3px 5px', opacity: 0.7, transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
      >
        <Plus size={11} /> Adicionar
      </button>
    </div>
  );
}

/* ─── CanvasPropostaValorSection ─────────────────────────────────────────── */
function CanvasPropostaValorSection({ openAI }) {
  const [vpc, setVpc] = useLocalStorage('diag_vpc', INITIAL_VPC);
  const { versions: vpcVersions, saveVersion: saveVpcVersion } = useVersionHistory('diag_vpc_versions');
  const _vpcStr = JSON.stringify(vpc);
  const _vpcMounted = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!_vpcMounted.current) { _vpcMounted.current = true; return; }
    saveVpcVersion(vpc);
  }, [_vpcStr]);

  const fit = calcVpcFit(vpc);
  const fitColor = fit >= 70 ? 'var(--green)' : fit >= 40 ? 'var(--amber)' : 'var(--red)';
  const fitLabel = fit >= 70 ? 'Excelente fit' : fit >= 40 ? 'Fit parcial' : 'Fit fraco';

  function updateSection(key, items) {
    setVpc(prev => ({ ...prev, [key]: items }));
  }

  function handleAvaliarFit() {
    const fmt = arr => arr.filter(i => i.trim()).map(i => `• ${i}`).join('\n') || '• (sem itens)';
    openAI(
      `Avalie o fit da minha Proposta de Valor com o Segmento de Clientes.\n\n` +
      `SEGMENTO DE CLIENTES:\n` +
      `Tarefas:\n${fmt(vpc.tarefas)}\n\n` +
      `Dores:\n${fmt(vpc.dores)}\n\n` +
      `Ganhos desejados:\n${fmt(vpc.ganhos)}\n\n` +
      `PROPOSTA DE VALOR:\n` +
      `Produtos/Serviços:\n${fmt(vpc.produtos)}\n\n` +
      `Aliviadores de dor:\n${fmt(vpc.aliviadores)}\n\n` +
      `Criadores de ganho:\n${fmt(vpc.criadores)}\n\n` +
      `Analise: (1) Qual o grau de fit atual (0-10) e por quê? ` +
      `(2) Quais dores NÃO estão sendo endereçadas pelos aliviadores? ` +
      `(3) Quais ganhos NÃO estão sendo gerados pelos criadores? ` +
      `(4) 3 ajustes concretos e prioritários para melhorar o fit.`
    );
  }

  const renderSide = (cfgList) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {cfgList.map(cfg => (
        <div key={cfg.key} style={{
          background: `color-mix(in srgb, ${cfg.color} 5%, var(--bg3))`,
          border: `1px solid color-mix(in srgb, ${cfg.color} 20%, transparent)`,
          borderRadius: 10, padding: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text3)', paddingLeft: 12, marginBottom: 10 }}>{cfg.subtitle}</p>
          <VpcList
            items={vpc[cfg.key] || []}
            color={cfg.color}
            onUpdate={(items) => updateSection(cfg.key, items)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Canvas de Proposta de Valor</p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
            Segmento de clientes × proposta de valor — fit atual: {fit}/100
          </p>
        </div>
        <button
          onClick={handleAvaliarFit}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 14px', fontSize: 12,
            fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          <Bot size={13} /> IA: Avaliar fit
        </button>
      </div>

      <VersionDropdown
        versions={vpcVersions}
        currentData={vpc}
        onRestore={(data) => setVpc(data)}
        renderPreview={(data) => (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {['tarefas', 'dores', 'ganhos', 'produtos', 'aliviadores', 'criadores'].map(key => (
              <div key={key}>
                <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'capitalize' }}>{key}: </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>
                  {(data[key] || []).filter(i => i.trim()).length} itens
                </span>
              </div>
            ))}
          </div>
        )}
      />

      {/* Column labels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr' }}>
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: '10px 0 0 10px', borderRight: 'none', padding: '8px 16px',
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Segmento de Clientes
          </p>
        </div>
        <div style={{
          background: 'var(--bg3)',
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>← fit →</span>
        </div>
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: '0 10px 10px 0', borderLeft: 'none', padding: '8px 16px', textAlign: 'right',
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Proposta de Valor
          </p>
        </div>
      </div>

      {/* 3-column canvas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', alignItems: 'stretch' }}>
        {/* Left */}
        {renderSide(VPC_LEFT_CFG)}

        {/* Center — Fit gauge */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '16px 12px', gap: 10,
        }}>
          <div style={{ width: 1, flex: 1, minHeight: 20, background: `color-mix(in srgb, ${fitColor} 35%, var(--border))` }} />
          <ScoreGauge score={fit} size={96} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              FIT
            </p>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 20, display: 'inline-block',
              color: fitColor,
              background: `color-mix(in srgb, ${fitColor} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${fitColor} 30%, transparent)`,
            }}>
              {fitLabel}
            </span>
          </div>
          <div style={{ width: 1, flex: 1, minHeight: 20, background: `color-mix(in srgb, ${fitColor} 35%, var(--border))` }} />
        </div>

        {/* Right */}
        {renderSide(VPC_RIGHT_CFG)}
      </div>
    </div>
  );
}

/* ─── EntrevistaModal ─────────────────────────────────────────────────────── */
let _entrevistaId = 2000;

function EntrevistaModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    id:          initial?.id          || null,
    clienteNome: initial?.clienteNome || '',
    data:        initial?.data        || new Date().toISOString().split('T')[0],
    cargo:       initial?.cargo       || '',
    respostas: {
      porque:      initial?.respostas?.porque      || '',
      melhor:      initial?.respostas?.melhor       || '',
      indicaria:   initial?.respostas?.indicaria    ?? false,
      observacoes: initial?.respostas?.observacoes  || '',
    },
  }));

  const iS = {
    width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '7px 10px', color: 'var(--text)',
    fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
  };
  const taS = { ...iS, resize: 'vertical', lineHeight: 1.55 };
  const lbl = { fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 };

  const set    = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setRes = (k, v) => setForm(p => ({ ...p, respostas: { ...p.respostas, [k]: v } }));

  function handleSave() {
    if (!form.clienteNome.trim()) return;
    onSave({ ...form, id: form.id || `ent${_entrevistaId++}` });
  }

  const canSave = form.clienteNome.trim().length > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,15,18,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0 }}>
            {initial ? 'Editar entrevista' : 'Nova entrevista de cliente'}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={15} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Nome do cliente *</label>
              <input value={form.clienteNome} onChange={e => set('clienteNome', e.target.value)} placeholder="Ex: Maria Silva" style={iS} />
            </div>
            <div>
              <label style={lbl}>Data da entrevista</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} style={iS} />
            </div>
          </div>
          <div>
            <label style={lbl}>Cargo / função (opcional)</label>
            <input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Ex: CEO, Gerente, Sócio..." style={iS} />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', margin: 0 }}>Respostas da entrevista</p>
            <div>
              <label style={lbl}>Por que escolheu nossa empresa?</label>
              <textarea value={form.respostas.porque} onChange={e => setRes('porque', e.target.value)} rows={3} style={taS} placeholder="O que o cliente disse..." />
            </div>
            <div>
              <label style={lbl}>O que poderia ser melhor?</label>
              <textarea value={form.respostas.melhor} onChange={e => setRes('melhor', e.target.value)} rows={3} style={taS} placeholder="Feedbacks e sugestões do cliente..." />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
              <input type="checkbox" checked={form.respostas.indicaria} onChange={e => setRes('indicaria', e.target.checked)} style={{ accentColor: 'var(--green)', cursor: 'pointer' }} />
              Indicaria para alguém?
            </label>
            <div>
              <label style={lbl}>Outras observações (opcional)</label>
              <textarea value={form.respostas.observacoes} onChange={e => setRes('observacoes', e.target.value)} rows={2} style={taS} placeholder="Qualquer detalhe relevante..." />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 7, padding: '7px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={!canSave} style={{ background: canSave ? 'var(--accent)' : 'var(--bg4)', color: canSave ? '#fff' : 'var(--text3)', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: canSave ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}>
            {initial ? 'Salvar alterações' : 'Adicionar entrevista'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── EntrevistaCard ──────────────────────────────────────────────────────── */
function EntrevistaCard({ entrevista, onEdit, onDelete }) {
  const excerpt = (entrevista.respostas?.porque || '').slice(0, 60) +
    ((entrevista.respostas?.porque || '').length > 60 ? '…' : '');
  const dateStr = entrevista.data
    ? new Date(entrevista.data + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';

  return (
    <div
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 15px', display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}
      onMouseEnter={e => e.currentTarget.querySelector('.ent-actions').style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.querySelector('.ent-actions').style.opacity = '0'}
    >
      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(56,201,224,0.1)', border: '1px solid rgba(56,201,224,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>💬</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{entrevista.clienteNome}</span>
          {entrevista.cargo && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{entrevista.cargo}</span>}
          {entrevista.respostas?.indicaria && (
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(45,212,160,0.12)', color: 'var(--green)', border: '1px solid rgba(45,212,160,0.25)' }}>✓ Indicaria</span>
          )}
        </div>
        {dateStr && (
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} /> {dateStr}
          </p>
        )}
        {excerpt && (
          <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>"{excerpt}"</p>
        )}
      </div>
      <div className="ent-actions" style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4, opacity: 0, transition: 'opacity .15s' }}>
        <button onClick={() => onEdit(entrevista)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text3)', padding: 5, display: 'flex' }}><Pencil size={11} /></button>
        <button onClick={() => onDelete(entrevista.id)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text3)', padding: 5, display: 'flex' }}><Trash2 size={11} /></button>
      </div>
    </div>
  );
}

/* ─── EntrevistasSection ──────────────────────────────────────────────────── */
function EntrevistasSection({ openAI }) {
  const [entrevistas, setEntrevistas] = useLocalStorage('diag_entrevistas', []);
  const [modal, setModal] = useState(null);

  function saveEntrevista(data) {
    setEntrevistas(prev => {
      const exists = prev.find(e => e.id === data.id);
      return exists ? prev.map(e => e.id === data.id ? data : e) : [...prev, data];
    });
    setModal(null);
  }

  function handleAnalyzeIA() {
    const n = entrevistas.length;
    if (n === 0) {
      openAI('Como conduzir entrevistas de clientes para identificar padrões de satisfação e pontos de melhoria no meu negócio?');
      return;
    }
    const fmt = entrevistas.map((e, i) =>
      `Entrevista ${i + 1} — ${e.clienteNome}${e.cargo ? ` (${e.cargo})` : ''}:\n` +
      `• Por que nos escolheu: ${e.respostas?.porque || '—'}\n` +
      `• O que poderia melhorar: ${e.respostas?.melhor || '—'}\n` +
      `• Indicaria: ${e.respostas?.indicaria ? 'Sim' : 'Não'}` +
      (e.respostas?.observacoes ? `\n• Observações: ${e.respostas.observacoes}` : ''),
    ).join('\n\n');
    openAI(
      `Com base nas ${n} entrevistas de clientes registradas, quais são os 3 principais padrões de satisfação e os 3 principais pontos de melhoria?\n\n${fmt}`,
    );
  }

  return (
    <>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0 }}>
            Entrevistas de Clientes
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400, marginLeft: 8 }}>
              {entrevistas.length} {entrevistas.length === 1 ? 'registrada' : 'registradas'}
            </span>
          </p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button onClick={handleAnalyzeIA} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--border2)', borderRadius: 7, padding: '6px 11px', fontSize: 11, color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Bot size={12} /> IA: Analisar padrões
            </button>
            <button onClick={() => setModal('new')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 11px', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Plus size={12} /> Nova entrevista
            </button>
          </div>
        </div>

        {entrevistas.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>Nenhuma entrevista registrada ainda.</p>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>Entreviste 3 clientes reais — é a base mais sólida para qualquer diagnóstico.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entrevistas.map(e => (
              <EntrevistaCard key={e.id} entrevista={e} onEdit={setModal} onDelete={id => setEntrevistas(prev => prev.filter(e => e.id !== id))} />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <EntrevistaModal
          initial={modal === 'new' ? null : modal}
          onSave={saveEntrevista}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

/* ─── Diagnostico (main) ─────────────────────────────────────────────────── */
export default function Diagnostico() {
  const { openAI } = useUI();

  const [swot, setSwot] = useLocalStorage('diag_swot', INITIAL_SWOT);
  const [swotUpdated, setSwotUpdated] = useLocalStorage('diag_swot_updated', null);
  const [swotVersions, setSwotVersions] = useLocalStorage('diag_swot_versions', []);

  const [fourPs, setFourPs] = useLocalStorage('diag_4ps', INITIAL_4PS);
  const [fourPsUpdated, setFourPsUpdated] = useLocalStorage('diag_4ps_updated', null);
  const [fourPsVersions, setFourPsVersions] = useLocalStorage('diag_4ps_versions', []);

  // One-time migration: add pessoas/processos to existing saved data that only had 4 fields.
  useEffect(() => {
    if (!fourPs.pessoas || !fourPs.processos) {
      setFourPs(prev => ({ ...INITIAL_4PS, ...prev }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [personas, setPersonas] = useLocalStorage('diag_personas', INITIAL_PERSONAS);
  const [personasUpdated, setPersonasUpdated] = useLocalStorage('diag_personas_updated', null);

  const totalScore = Math.round(DIMENSIONS.reduce((s, d) => s + d.score, 0) / DIMENSIONS.length * 10);
  const scoreLabel = totalScore >= 70 ? 'Maduro' : totalScore >= 45 ? 'Em desenvolvimento' : 'Inicial';
  const scoreColor = totalScore >= 70 ? 'var(--green)' : totalScore >= 45 ? 'var(--amber)' : 'var(--red)';

  const analyses = [
    {
      id: 'swot',
      name: 'Análise SWOT',
      Icon: Layers,
      iconColor: 'var(--green)',
      iconBg: 'rgba(45,212,160,0.1)',
      lastUpdated: swotUpdated,
    },
    {
      id: '4ps',
      name: '4Ps do Marketing',
      Icon: BarChart2,
      iconColor: 'var(--accent2)',
      iconBg: 'rgba(91,110,245,0.1)',
      lastUpdated: fourPsUpdated,
    },
    {
      id: 'personas',
      name: 'Personas',
      Icon: Users,
      iconColor: 'var(--purple)',
      iconBg: 'rgba(176,110,245,0.1)',
      lastUpdated: personasUpdated,
    },
  ];

  function handleReport() {
    const swotFmt = q => swot[q].map(i => `• ${i.text}`).join('\n');
    const psFmt = FOUR_PS_CFG.map(p =>
      `${p.label}: ` + p.fields.map(f => `${f.label}: ${fourPs[p.key][f.key] || '—'}`).join(' | ')
    ).join('\n');
    openAI(
      `Gere um relatório executivo de diagnóstico estratégico completo da empresa com base nos dados abaixo.\n\n` +
      `SWOT:\n` +
      `Forças: ${swotFmt('forcas')}\nFraquezas: ${swotFmt('fraquezas')}\n` +
      `Oportunidades: ${swotFmt('oportunidades')}\nAmeaças: ${swotFmt('ameacas')}\n\n` +
      `4Ps:\n${psFmt}\n\n` +
      `Personas mapeadas: ${personas.map(p => p.nome).join(', ')}\n\n` +
      `Score de maturidade: ${totalScore}/100 (${scoreLabel})\n\n` +
      `Estruture o relatório em: Síntese, Diagnóstico SWOT, Análise de Marketing, Público-alvo, Prioridades estratégicas (top 5 ações para os próximos 90 dias).`
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <CompilationPanel
        analyses={analyses}
        score={totalScore}
        scoreLabel={scoreLabel}
        scoreColor={scoreColor}
        onReport={handleReport}
      />

      <SwotSection
        swot={swot}
        setSwot={setSwot}
        lastUpdated={swotUpdated}
        setLastUpdated={setSwotUpdated}
        versions={swotVersions}
        setVersions={setSwotVersions}
        openAI={openAI}
      />

      <FourPsSection
        fourPs={fourPs}
        setFourPs={setFourPs}
        lastUpdated={fourPsUpdated}
        setLastUpdated={setFourPsUpdated}
        versions={fourPsVersions}
        setVersions={setFourPsVersions}
        openAI={openAI}
      />

      <MaturitySection score={totalScore} scoreLabel={scoreLabel} scoreColor={scoreColor} />

      <ScoreMaturidadeSection />

      <FunilVendasSection openAI={openAI} />

      <ConcorrentesSection openAI={openAI} />

      <CanvasPropostaValorSection openAI={openAI} />

      <PersonasSection
        personas={personas}
        setPersonas={setPersonas}
        lastUpdated={personasUpdated}
        setLastUpdated={setPersonasUpdated}
        openAI={openAI}
      />

      <EntrevistasSection openAI={openAI} />
    </div>
  );
}
