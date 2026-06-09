# Comercial PME

Plataforma web para pequenas e médias empresas brasileiras estruturarem seu departamento comercial e de marketing. Combina conteúdo educacional (guia em 8 capítulos), ferramentas operacionais integradas e assistente IA contextual em todos os módulos.

---

## Stack

- **React 19 + Vite** — UI e build
- **React Router DOM v7** — navegação SPA
- **Tailwind CSS v3 + CSS custom properties** — dark theme
- **Recharts** — gráficos e visualizações
- **@hello-pangea/dnd** — drag-and-drop no kanban
- **lucide-react** — ícones
- **date-fns** — manipulação de datas
- **Context API + localStorage** — estado global e persistência (MVP)
- **Anthropic API** — assistente IA (`claude-sonnet-4-20250514`)

---

## Módulos

| Rota | Página | Descrição |
|---|---|---|
| `/` | Dashboard | Widgets customizáveis, métricas, alertas e gráficos |
| `/guia` | Guia Estratégico | 8 capítulos com checklists, teoria e ações práticas |
| `/crm` | CRM | Pipeline kanban drag-and-drop + banco de clientes |
| `/prospeccao` | Prospecção Ativa | Busca por CNAE + enriquecimento Hunter/Apollo |
| `/regua` | Régua de Comunicação | Fluxos de nurturing e templates de follow-up |
| `/kpis` | KPIs & Metas | Indicadores, metas SMART e benchmarks do setor |
| `/diagnostico` | Diagnóstico | SWOT editável, personas e score de maturidade |
| `/diretorio` | Diretório Interno | SOPs, senhas mascaradas e templates |
| `/redes` | Redes Sociais | Métricas por canal e calendário editorial |
| `/configuracoes` | Configurações | Matriz de permissões por role e por usuário |

---

## Como rodar

```bash
# 1. Instale as dependências
npm install

# 2. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local e adicione sua chave da Anthropic

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:5173` e faça login com um dos usuários mock:

| E-mail | Senha | Role |
|---|---|---|
| `douglas@empresa.com` | `admin` | Administrador |
| `gestor@empresa.com` | `gestor` | Gestor Comercial |
| `joao@empresa.com` | `vendedor` | Vendedor |
| `maria@empresa.com` | `marketing` | Marketing |
| `carlos@empresa.com` | `visualizador` | Visualizador |

---

## Variáveis de ambiente

```env
# Obrigatório para o Assistente IA
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Opcionais — ativam enriquecimento real na Prospecção
VITE_HUNTER_API_KEY=
VITE_APOLLO_API_KEY=
```

Sem a chave da Anthropic, o assistente retorna erro amigável. Sem Hunter/Apollo, a prospecção usa dados mock.

---

## Outros comandos

```bash
npm run build    # build de produção → dist/
npm run preview  # preview do build
npm run lint     # ESLint
```

---

## Estrutura de pastas

```
src/
├── components/
│   ├── Auth/          # LoginPage, ProtectedRoute, PermissionGate
│   ├── CRM/           # LeadModal, ClienteModal, FunisModal
│   ├── Layout/        # Sidebar, Topbar, AIPanel
│   └── UI/            # Card, MetricCard, Badge, Button, ProgressBar…
├── data/              # Dados mock (guia-chapters, dashboard, kpi-benchmarks…)
├── hooks/             # useAI, useLocalStorage, useNotifications
├── pages/             # Uma página por rota
├── services/          # Integrações externas (claude, cnpj, hunter, apollo)
└── store/             # Contexts (auth, crm, index/ui, metas, diretorio, redes…)
```

---

## Deploy

```bash
# Vercel (recomendado)
npm i -g vercel && vercel

# Netlify
npm run build
# Arraste dist/ para netlify.com/drop
```

Configure `VITE_ANTHROPIC_API_KEY` como variável de ambiente no painel de deploy. **Nunca suba `.env.local` para o repositório.**
