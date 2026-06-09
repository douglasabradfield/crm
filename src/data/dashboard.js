// Mock data for Dashboard page

// ── Legacy exports (kept for backward compat) ─────────────────────────────────

export const metrics = [
  { id: 'leads',     label: 'Leads Ativos',       value: '47',       change: '+18%',   positive: true  },
  { id: 'conversao', label: 'Taxa de Conversão',   value: '11,2%',    change: '+2,1pp', positive: true  },
  { id: 'cac',       label: 'CAC Médio',           value: 'R$ 87',    change: '-12%',   positive: true  },
  { id: 'pipeline',  label: 'Receita Pipeline',    value: 'R$ 84k',   change: '+31%',   positive: true  },
];

export const pipelineCols = [
  { id: 'prospeccao',   label: 'Prospecção',   colorVar: '--teal'   },
  { id: 'qualificacao', label: 'Qualificação', colorVar: '--accent' },
  { id: 'proposta',     label: 'Proposta',     colorVar: '--amber'  },
  { id: 'fechamento',   label: 'Fechamento',   colorVar: '--green'  },
];

export const pipelineCards = [
  { id: 1, name: 'Tech Solutions Ltda', value: 12000, col: 'prospeccao',   days: 3  },
  { id: 2, name: 'Grupo Varela',        value: 8500,  col: 'prospeccao',   days: 7  },
  { id: 3, name: 'DataPrime SA',        value: 22000, col: 'qualificacao', days: 5  },
  { id: 4, name: 'Nexus Digital',       value: 15000, col: 'qualificacao', days: 2  },
  { id: 5, name: 'Inovare ME',          value: 9800,  col: 'qualificacao', days: 8  },
  { id: 6, name: 'Alpha Ventures',      value: 35000, col: 'proposta',     days: 1  },
  { id: 7, name: 'Beta Corp',           value: 9800,  col: 'proposta',     days: 9  },
  { id: 8, name: 'Omega Sistemas',      value: 28000, col: 'fechamento',   days: 4  },
  { id: 9, name: 'BetaCorp Logística',  value: 18000, col: 'fechamento',   days: 12 },
];

export const metaMes = { atual: 31500, total: 50000 };

export const atividadesHoje = [
  { id: 1, text: 'Follow-up com Tech Solutions',  done: false, time: '10:00' },
  { id: 2, text: 'Demo para DataPrime SA',         done: true,  time: '14:30' },
  { id: 3, text: 'Proposta para Alpha Ventures',   done: false, time: '17:00' },
];

export const leadsHistorico = [
  { mes: 'Jan', leads: 28 },
  { mes: 'Fev', leads: 35 },
  { mes: 'Mar', leads: 31 },
  { mes: 'Abr', leads: 42 },
  { mes: 'Mai', leads: 38 },
  { mes: 'Jun', leads: 47 },
];

export const canaisAquisicao = [
  { label: 'Indicação',        pct: 38, colorVar: '--accent' },
  { label: 'Prospecção Ativa', pct: 29, colorVar: '--green'  },
  { label: 'Instagram',        pct: 21, colorVar: '--purple' },
  { label: 'Orgânico',         pct: 12, colorVar: '--amber'  },
];

export const alertasDash = [
  { id: 1, type: 'warning', msg: 'Follow-up vencido: Tech Solutions (7 dias sem contato)' },
  { id: 2, type: 'success', msg: 'Conversão 11,2% — acima da meta de 10% pelo 2º mês consecutivo' },
  { id: 3, type: 'accent',  msg: 'Reunião amanhã: Demo para Nexus Digital às 15h' },
];

// ── Extended widget library ────────────────────────────────────────────────────

export const allWidgets = [
  // Comercial
  {
    id: 'metric_leads', label: 'Leads Gerados', category: 'comercial', cols: 1,
    value: '47', change: '+18%', positive: true,
    def: 'Total de novos leads gerados no período selecionado.',
    formula: 'Contagem de leads com data de criação dentro do período',
    example: 'Se você criou 47 leads este mês, esse é o seu número de leads gerados.',
  },
  {
    id: 'metric_conversao', label: 'Taxa de Conversão', category: 'comercial', cols: 1,
    value: '11,2%', change: '+2,1pp', positive: true,
    def: 'Percentual de leads que se tornaram clientes pagantes.',
    formula: 'Clientes convertidos ÷ Total de leads × 100',
    example: 'Se você teve 45 leads e fechou 5, sua taxa de conversão é 11,1%.',
  },
  {
    id: 'metric_cac', label: 'CAC Médio', category: 'comercial', cols: 1,
    value: 'R$ 87', change: '-12%', positive: true,
    def: 'Custo médio para adquirir um novo cliente no período.',
    formula: 'Total gasto em marketing e vendas ÷ Clientes adquiridos',
    example: 'Se você gastou R$ 870 em marketing e adquiriu 10 clientes, seu CAC é R$ 87.',
  },
  {
    id: 'metric_pipeline', label: 'Receita Pipeline', category: 'comercial', cols: 1,
    value: 'R$ 84k', change: '+31%', positive: true,
    def: 'Soma de todas as oportunidades abertas no CRM (leads ativos).',
    formula: 'Σ valor de todos os leads com status diferente de Perdido/Fechado',
    example: 'Se você tem 9 oportunidades com valores variados, o pipeline total é R$ 84.500.',
  },
  {
    id: 'metric_ticket', label: 'Ticket Médio', category: 'comercial', cols: 1,
    value: 'R$ 1.480', change: '+8%', positive: true,
    def: 'Valor médio de cada venda fechada no período.',
    formula: 'Receita total do período ÷ Número de vendas fechadas',
    example: 'Se você fechou 5 vendas totalizando R$ 7.400, o ticket médio é R$ 1.480.',
  },
  {
    id: 'metric_propostas', label: 'Propostas Enviadas', category: 'comercial', cols: 1,
    value: '12', change: '+4', positive: true,
    def: 'Número de propostas comerciais enviadas no período.',
    formula: 'Contagem de leads que avançaram para a etapa "Proposta" no período',
    example: 'Se você enviou 12 propostas este mês, esse é o número registrado.',
  },
  {
    id: 'metric_fechamento', label: 'Taxa de Fechamento', category: 'comercial', cols: 1,
    value: '8,3%', change: '-0,5pp', positive: false,
    def: 'Percentual de propostas enviadas que resultaram em venda.',
    formula: 'Vendas fechadas ÷ Propostas enviadas × 100',
    example: 'Se você enviou 12 propostas e fechou 1, sua taxa de fechamento é 8,3%.',
  },
  // Clientes
  {
    id: 'metric_clientes', label: 'Clientes Ativos', category: 'clientes', cols: 1,
    value: '34', change: '+3', positive: true,
    def: 'Total de clientes com status "Ativo" cadastrados na plataforma.',
    formula: 'Contagem de clientes com status = Ativo',
    example: 'Se você tem 34 clientes com contrato ativo, esse é o número exibido.',
  },
  {
    id: 'metric_churn', label: 'Churn', category: 'clientes', cols: 1,
    value: '4,2%', change: '+0,8pp', positive: false,
    def: 'Percentual de clientes que cancelaram ou foram perdidos no período.',
    formula: 'Clientes cancelados ÷ Total de clientes no início do período × 100',
    example: 'Se você tinha 48 clientes e perdeu 2, seu churn mensal é 4,2%.',
  },
  {
    id: 'metric_nps', label: 'NPS Médio', category: 'clientes', cols: 1,
    value: '72', change: '+5', positive: true,
    def: 'Net Promoter Score médio dos clientes — mede lealdade e satisfação.',
    formula: '% Promotores (nota 9-10) − % Detratores (nota 0-6)',
    example: 'Se 80% são promotores e 8% são detratores, seu NPS é 72.',
  },
  {
    id: 'metric_ltv', label: 'LTV Médio', category: 'clientes', cols: 1,
    value: 'R$ 8.900', change: '+14%', positive: true,
    def: 'Valor médio total gerado por um cliente ao longo de todo o relacionamento.',
    formula: 'Ticket médio × Frequência de compra mensal × Meses de retenção médio',
    example: 'Se o ticket é R$ 1.480, compra 1x/mês e fica 6 meses, o LTV é R$ 8.880.',
  },
  // Atividades
  {
    id: 'metric_tarefas', label: 'Tarefas Concluídas', category: 'atividades_metricas', cols: 1,
    value: '18', change: '+6', positive: true,
    def: 'Número de tarefas marcadas como concluídas no período.',
    formula: 'Contagem de tarefas com status = Concluída e data dentro do período',
    example: 'Se você concluiu 18 tarefas esta semana, esse é o número exibido.',
  },
  {
    id: 'metric_followups', label: 'Follow-ups Pendentes', category: 'atividades_metricas', cols: 1,
    value: '7', change: '+2', positive: false,
    def: 'Follow-ups agendados que ainda não foram realizados.',
    formula: 'Contagem de tarefas do tipo follow-up com status ≠ Concluída',
    example: 'Se você tem 7 follow-ups na fila, esse é o número exibido.',
  },
  // Redes sociais
  {
    id: 'metric_alcance', label: 'Alcance Total', category: 'redes_metricas', cols: 1,
    value: '12.400', change: '+22%', positive: true,
    def: 'Pessoas únicas alcançadas em todas as redes sociais conectadas.',
    formula: 'Soma do alcance orgânico + pago em todas as redes no período',
    example: 'Instagram 7.200 + LinkedIn 3.100 + Facebook 2.100 = 12.400.',
  },
  {
    id: 'metric_engajamento', label: 'Engajamento Médio', category: 'redes_metricas', cols: 1,
    value: '3,8%', change: '+0,4pp', positive: true,
    def: 'Taxa média de engajamento por post em todas as redes.',
    formula: '(Curtidas + Comentários + Compartilhamentos) ÷ Alcance × 100',
    example: 'Se seus posts recebem 470 interações para 12.400 de alcance, o engajamento é 3,8%.',
  },
  {
    id: 'metric_posts', label: 'Posts Publicados', category: 'redes_metricas', cols: 1,
    value: '14', change: '+2', positive: true,
    def: 'Total de posts publicados em todas as redes no período.',
    formula: 'Contagem de posts com status = Publicado e data dentro do período',
    example: 'Se você publicou 14 posts este mês, esse é o número exibido.',
  },
  // Composite widgets
  { id: 'alertas',       label: 'Alertas e Follow-ups',       category: 'widgets', cols: 2 },
  { id: 'atividades',    label: 'Atividades do Dia',          category: 'widgets', cols: 2 },
  { id: 'grafico_leads', label: 'Gráfico de Leads por Canal', category: 'widgets', cols: 2 },
  { id: 'top_clientes',  label: 'Top Clientes por Valor',     category: 'widgets', cols: 2 },
  { id: 'pipeline_mini', label: 'Pipeline Resumido',          category: 'widgets', cols: 4 },
  { id: 'okrs',          label: 'OKRs em Andamento',          category: 'widgets', cols: 4 },
];

// ── Additional mock data ───────────────────────────────────────────────────────

export const topClientes = [
  { id: 1, nome: 'Alpha Ventures',     valor: 85000, pedidos: 3, prioridade: 'A' },
  { id: 2, nome: 'Omega Sistemas',     valor: 72000, pedidos: 5, prioridade: 'A' },
  { id: 3, nome: 'DataPrime SA',       valor: 55000, pedidos: 4, prioridade: 'A' },
  { id: 4, nome: 'Nexus Digital',      valor: 43000, pedidos: 2, prioridade: 'B' },
  { id: 5, nome: 'Tech Solutions Ltda', valor: 38000, pedidos: 6, prioridade: 'B' },
];

export const okrsData = [
  {
    id: 1,
    objetivo: 'Dobrar a receita recorrente até o fim do trimestre',
    krs: [
      { id: 1, desc: 'Fechar 15 novos clientes', atual: 8,    meta: 15   },
      { id: 2, desc: 'Ticket médio → R$ 2.000',  atual: 1480, meta: 2000 },
      { id: 3, desc: 'Reduzir churn para < 3%',  atual: 4.2,  meta: 3    },
    ],
  },
  {
    id: 2,
    objetivo: 'Estruturar processo comercial completo',
    krs: [
      { id: 1, desc: 'Publicar 5 SOPs no Diretório',    atual: 3, meta: 5 },
      { id: 2, desc: 'Treinar equipe em objeções (2×)',  atual: 1, meta: 2 },
    ],
  },
];
