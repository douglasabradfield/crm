export const MODULES = [
  { id: 'dashboard',   label: 'Dashboard' },
  { id: 'guia',        label: 'Guia Estratégico' },
  { id: 'crm',         label: 'CRM' },
  { id: 'prospeccao',  label: 'Prospecção Ativa' },
  { id: 'regua',       label: 'Régua de Comunicação' },
  { id: 'kpis',        label: 'KPIs & Metas' },
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'diretorio',   label: 'Diretório Interno' },
  { id: 'redes',       label: 'Redes Sociais' },
  { id: 'configuracoes', label: 'Configurações' },
  { id: 'tickets',      label: 'Tickets' },
  { id: 'ia',          label: 'Assistente IA' },
];

// Actions: view, edit, delete, export
export const DEFAULT_PERMISSIONS = {
  superadmin: {
    dashboard:    { view: true, edit: true, delete: true, export: true },
    guia:         { view: true, edit: true, delete: true, export: true },
    crm:          { view: true, edit: true, delete: true, export: true },
    prospeccao:   { view: true, edit: true, delete: true, export: true },
    regua:        { view: true, edit: true, delete: true, export: true },
    kpis:         { view: true, edit: true, delete: true, export: true },
    diagnostico:  { view: true, edit: true, delete: true, export: true },
    diretorio:    { view: true, edit: true, delete: true, export: true },
    redes:        { view: true, edit: true, delete: true, export: true },
    configuracoes:{ view: true, edit: true, delete: true, export: true },
    tickets:      { view: true, edit: true, delete: true, export: true },
    ia:           { view: true, edit: true, delete: true, export: true },
  },
  admin: {
    dashboard:    { view: true,  edit: true,  delete: true,  export: true  },
    guia:         { view: true,  edit: true,  delete: true,  export: true  },
    crm:          { view: true,  edit: true,  delete: true,  export: true  },
    prospeccao:   { view: true,  edit: true,  delete: true,  export: true  },
    regua:        { view: true,  edit: true,  delete: true,  export: true  },
    kpis:         { view: true,  edit: true,  delete: true,  export: true  },
    diagnostico:  { view: true,  edit: true,  delete: true,  export: true  },
    diretorio:    { view: true,  edit: true,  delete: true,  export: true  },
    redes:        { view: true,  edit: true,  delete: true,  export: true  },
    configuracoes:{ view: true,  edit: true,  delete: true,  export: true  },
    tickets:      { view: true,  edit: true,  delete: true,  export: true  },
    ia:           { view: true,  edit: true,  delete: true,  export: true  },
  },
  gestor: {
    dashboard:    { view: true,  edit: true,  delete: false, export: true  },
    guia:         { view: true,  edit: true,  delete: false, export: true  },
    crm:          { view: true,  edit: true,  delete: true,  export: true  },
    prospeccao:   { view: true,  edit: true,  delete: false, export: true  },
    regua:        { view: true,  edit: true,  delete: false, export: true  },
    kpis:         { view: true,  edit: true,  delete: false, export: true  },
    diagnostico:  { view: true,  edit: true,  delete: false, export: true  },
    diretorio:    { view: true,  edit: true,  delete: false, export: true  },
    redes:        { view: true,  edit: true,  delete: false, export: true  },
    configuracoes:{ view: false, edit: false, delete: false, export: false },
    tickets:      { view: true,  edit: true,  delete: true,  export: true  },
    ia:           { view: true,  edit: true,  delete: false, export: false },
  },
  vendedor: {
    dashboard:    { view: true,  edit: false, delete: false, export: false },
    guia:         { view: true,  edit: false, delete: false, export: false },
    crm:          { view: true,  edit: true,  delete: false, export: false },
    prospeccao:   { view: true,  edit: true,  delete: false, export: false },
    regua:        { view: true,  edit: false, delete: false, export: false },
    kpis:         { view: true,  edit: false, delete: false, export: false },
    diagnostico:  { view: false, edit: false, delete: false, export: false },
    diretorio:    { view: true,  edit: false, delete: false, export: false },
    redes:        { view: false, edit: false, delete: false, export: false },
    configuracoes:{ view: false, edit: false, delete: false, export: false },
    tickets:      { view: true,  edit: true,  delete: false, export: false },
    ia:           { view: true,  edit: false, delete: false, export: false },
  },
  marketing: {
    dashboard:    { view: true,  edit: false, delete: false, export: true  },
    guia:         { view: true,  edit: false, delete: false, export: false },
    crm:          { view: true,  edit: false, delete: false, export: true  },
    prospeccao:   { view: true,  edit: true,  delete: false, export: true  },
    regua:        { view: true,  edit: true,  delete: false, export: true  },
    kpis:         { view: true,  edit: false, delete: false, export: true  },
    diagnostico:  { view: true,  edit: false, delete: false, export: false },
    diretorio:    { view: true,  edit: false, delete: false, export: false },
    redes:        { view: true,  edit: true,  delete: false, export: true  },
    configuracoes:{ view: false, edit: false, delete: false, export: false },
    tickets:      { view: true,  edit: false, delete: false, export: false },
    ia:           { view: true,  edit: false, delete: false, export: false },
  },
  visualizador: {
    dashboard:    { view: true,  edit: false, delete: false, export: false },
    guia:         { view: true,  edit: false, delete: false, export: false },
    crm:          { view: true,  edit: false, delete: false, export: false },
    prospeccao:   { view: false, edit: false, delete: false, export: false },
    regua:        { view: false, edit: false, delete: false, export: false },
    kpis:         { view: true,  edit: false, delete: false, export: false },
    diagnostico:  { view: true,  edit: false, delete: false, export: false },
    diretorio:    { view: false, edit: false, delete: false, export: false },
    redes:        { view: true,  edit: false, delete: false, export: false },
    configuracoes:{ view: false, edit: false, delete: false, export: false },
    tickets:      { view: true,  edit: false, delete: false, export: false },
    ia:           { view: false, edit: false, delete: false, export: false },
  },
  // Cliente da agência (multi-empresa · etapa 4): acesso SOMENTE-LEITURA ao
  // módulo Redes Sociais da própria empresa. Sem nenhuma permissão em qualquer
  // outro módulo, sem edit/delete/export em nada — inclusive em redes.
  // Entra por magic link e cai direto em /redes (ver primeiraRotaPermitida).
  cliente: {
    dashboard:    { view: false, edit: false, delete: false, export: false },
    guia:         { view: false, edit: false, delete: false, export: false },
    crm:          { view: false, edit: false, delete: false, export: false },
    prospeccao:   { view: false, edit: false, delete: false, export: false },
    regua:        { view: false, edit: false, delete: false, export: false },
    kpis:         { view: false, edit: false, delete: false, export: false },
    diagnostico:  { view: false, edit: false, delete: false, export: false },
    diretorio:    { view: false, edit: false, delete: false, export: false },
    redes:        { view: true,  edit: false, delete: false, export: false },
    configuracoes:{ view: false, edit: false, delete: false, export: false },
    tickets:      { view: false, edit: false, delete: false, export: false },
    ia:           { view: false, edit: false, delete: false, export: false },
  },
};

// Rota inicial por permissão. App.jsx manda todo login para "/" (Painel); quem
// não enxerga o Painel — um 'cliente', por exemplo — seria jogado na tela de
// "acesso não autorizado". Aqui devolvemos o primeiro módulo navegável que o
// papel realmente vê (para o cliente, /redes).
const MODULE_HOME_ROUTE = [
  ['dashboard',   '/'],
  ['guia',        '/guia'],
  ['crm',         '/crm'],
  ['prospeccao',  '/prospeccao'],
  ['regua',       '/regua'],
  ['kpis',        '/kpis'],
  ['diagnostico', '/diagnostico'],
  ['diretorio',   '/diretorio'],
  ['redes',       '/redes'],
  ['tickets',     '/tickets'],
];

export function primeiraRotaPermitida(hasPermission) {
  const encontrada = MODULE_HOME_ROUTE.find(([mod]) => hasPermission(mod, 'view'));
  return encontrada ? encontrada[1] : '/redes';
}
