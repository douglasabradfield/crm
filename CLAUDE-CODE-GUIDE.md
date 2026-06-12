> ⚠️ DOCUMENTO HISTÓRICO — NÃO É INSTRUÇÃO ATUAL
> Este guia descreve a construção ORIGINAL do MVP (React 18, localStorage,
> chave de IA no navegador, dados mockados). O projeto EVOLUIU muito desde então.
> Para o estado e as regras ATUAIS do projeto, use SOMENTE o CLAUDE.md.
> Mudanças desde este guia: migração completa para Supabase (auth + Postgres +
> Storage), multi-tenant com RLS, chave de IA movida para função serverless
> (/api/chat), guia revisado, e mais. Este arquivo serve apenas como memória
> histórica da fase inicial.

# Comercial PME — Guia de Build com Claude Code

---

## 1. Pré-requisitos

```bash
# Confirme Node.js 18+
node -v

# Instale o Claude Code (uma vez só)
npm install -g @anthropic-ai/claude-code

# Acesse com sua conta Pro (já incluso no plano)
claude
```

> **Você já tem o plano Pro** — Claude Code está incluso, não precisa pagar nada extra.
> Após `claude`, autentique pelo browser e pronto.

---

## 2. Criar o projeto

```bash
# Crie a pasta do projeto
mkdir comercial-pme && cd comercial-pme

# Inicie um projeto React com Vite
npm create vite@latest . -- --template react

# Instale dependências base
npm install
npm install react-router-dom @anthropic-ai/sdk lucide-react
npm install recharts date-fns
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 3. Estrutura de pastas

Peça ao Claude Code para criar exatamente esta estrutura:

```
comercial-pme/
├── CLAUDE.md                    ← instruções permanentes para o Claude Code
├── .env.example
├── src/
│   ├── main.jsx
│   ├── App.jsx                  ← router principal
│   ├── index.css                ← design system (variáveis CSS, dark theme)
│   │
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Topbar.jsx
│   │   │   └── AIPanel.jsx      ← painel do assistente (slide-in)
│   │   └── UI/
│   │       ├── Card.jsx
│   │       ├── MetricCard.jsx
│   │       ├── KanbanBoard.jsx
│   │       ├── Badge.jsx
│   │       ├── Button.jsx
│   │       ├── ProgressBar.jsx
│   │       └── Calendar.jsx
│   │
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── GuiaEstrategico.jsx
│   │   ├── CRM.jsx
│   │   ├── ProspeccaoAtiva.jsx
│   │   ├── ReguaComunicacao.jsx
│   │   ├── KPIs.jsx
│   │   ├── Diagnostico.jsx
│   │   ├── DiretorioInterno.jsx
│   │   └── RedesSociais.jsx
│   │
│   ├── hooks/
│   │   ├── useAI.js             ← hook p/ chamadas Claude API
│   │   ├── useLocalStorage.js   ← persistência de dados
│   │   └── useNotifications.js
│   │
│   ├── services/
│   │   ├── claude.js            ← wrapper Anthropic API
│   │   ├── cnpj.js              ← integração API Receita Federal (gratuita)
│   │   ├── hunter.js            ← integração Hunter.io
│   │   └── apollo.js            ← integração Apollo.io
│   │
│   ├── store/
│   │   ├── index.js             ← estado global (Context API ou Zustand)
│   │   ├── crm.js               ← leads, pipeline
│   │   ├── prospeccao.js        ← busca de empresas, enriquecimento
│   │   ├── metas.js             ← KPIs e metas
│   │   ├── diretorio.js         ← processos, senhas, docs
│   │   └── redes.js             ← posts, métricas sociais
│   │
│   └── data/
│       ├── guia-chapters.js     ← conteúdo dos 8 capítulos
│       ├── kpi-benchmarks.js    ← benchmarks por setor
│       └── templates.js         ← scripts, propostas, mensagens
│
└── public/
```

---

## 4. CLAUDE.md — Cole este arquivo na raiz do projeto

> O CLAUDE.md é lido automaticamente pelo Claude Code a cada sessão.
> É o "briefing permanente" que garante consistência em todo o build.

```markdown
# Comercial PME — Instruções para Claude Code

## O que é este projeto
Plataforma web para pequenas e médias empresas brasileiras estruturarem
seu departamento comercial. Combina conteúdo educacional, ferramentas
operacionais e IA assistente.

## Stack técnica
- React 18 + Vite
- React Router DOM para navegação
- Tailwind CSS para estilos (dark theme obrigatório)
- Recharts para gráficos
- Context API para estado global
- localStorage para persistência no MVP
- Anthropic SDK para chamadas de IA (modelo: claude-sonnet-4-20250514)

## Design System
- Dark theme: bg principal #0e0f12, superfícies #16181e e #1e2028
- Accent: #5b6ef5 (azul-índigo)
- Verde: #2dd4a0 | Âmbar: #f0a832 | Vermelho: #f05c5c
- Fonte: DM Sans (corpo) + DM Serif Display (números/display)
- Border radius: 10px cards pequenos, 14px cards grandes
- Borders: 1px solid #2e3040

## Módulos do app (9 páginas)
1. Dashboard — visão geral, pipeline resumido, alertas, gráficos
2. Guia Estratégico — 8 capítulos interativos com checklists e progresso
3. CRM — pipeline kanban (Prospecção → Qualificação → Proposta → Fechamento → Ganho)
4. Prospecção Ativa — busca por CNAE, enriquecimento Hunter/Apollo, scoring
5. Régua de Comunicação — fluxos de nurturing, passos e templates de mensagem
6. KPIs & Metas — métricas com metas, benchmarks de mercado, progresso
7. Diagnóstico — SWOT interativa, personas, score de maturidade (0-100)
8. Diretório Interno — SOPs, senhas mascaradas, templates, fluxogramas
9. Redes Sociais — métricas por canal, calendário editorial, próximos posts

## Assistente IA
- Painel lateral (slide-in) disponível em todas as páginas
- Cada módulo tem contexto próprio injetado no system prompt
- Modelo: claude-sonnet-4-20250514, max_tokens: 800
- Respostas em português BR, tom consultivo, foco em ações práticas
- API key via variável de ambiente VITE_ANTHROPIC_API_KEY

## Regras de desenvolvimento
- SEMPRE dark theme, NUNCA fundo branco
- Componentes reutilizáveis em src/components/UI/
- Dados mockados em src/data/ para o MVP
- Cada serviço externo tem seu próprio arquivo em src/services/
- Erros de API devem ser tratados com mensagem amigável em português
- Senhas no Diretório Interno sempre mascaradas por padrão (••••••••)
- Revelar senha apenas por 3 segundos ao clicar

## Integrações externas (MVP)
- API Receita Federal: https://receitaws.com.br/v1/cnpj/{cnpj} (gratuita)
- Hunter.io: https://api.hunter.io/v2/ (requer API key)
- Apollo.io: https://api.apollo.io/v1/ (requer API key)
- Todas as API keys via .env, NUNCA hardcoded

## Prioridade de build
Fase 1 (MVP): Dashboard + CRM + Assistente IA funcionando
Fase 2: Prospecção Ativa + KPIs + Guia Estratégico
Fase 3: Régua + Diretório + Redes Sociais + integrações externas
```

---

## 5. Arquivo .env

Crie `.env.local` na raiz (nunca commitar no git):

```env
# Anthropic - obrigatório para o assistente IA
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Integrações de prospecção (opcionais no MVP)
VITE_HUNTER_API_KEY=
VITE_APOLLO_API_KEY=

# App
VITE_APP_NAME=Comercial PME
VITE_APP_VERSION=1.0.0
```

Crie também `.env.example` (pode commitar, sem valores):

```env
VITE_ANTHROPIC_API_KEY=
VITE_HUNTER_API_KEY=
VITE_APOLLO_API_KEY=
```

---

## 6. Prompts para o Claude Code — execute nesta ordem

Abra o terminal na pasta do projeto e rode `claude`. Então use os prompts abaixo em sequência:

---

### PROMPT 1 — Design System e Layout base

```
Leia o CLAUDE.md e crie o design system completo do projeto.

Crie:
1. src/index.css com todas as variáveis CSS do design system (dark theme,
   cores, tipografia, border-radius, scrollbar customizada)

2. src/components/Layout/Sidebar.jsx com:
   - Logo "Comercial PME" em DM Serif Display
   - Navegação com 9 itens agrupados em seções (Principal, Comercial,
     Desempenho, Organização)
   - Badge de notificação em CRM e Prospecção
   - Rodapé com botão "Assistente IA" que abre o AIPanel
   - Estado ativo destacado com fundo accent-bg

3. src/components/Layout/Topbar.jsx com:
   - Título e subtítulo dinâmicos da página atual
   - Botão "Perguntar à IA" que abre o AIPanel com contexto da página
   - Botão "Nova ação" primário

4. src/App.jsx com React Router, layout base (sidebar + main),
   e rotas para todas as 9 páginas

Siga rigorosamente as cores e fontes do CLAUDE.md.
```

---

### PROMPT 2 — Assistente IA (AIPanel)

```
Crie o src/hooks/useAI.js e src/components/Layout/AIPanel.jsx.

useAI.js deve:
- Exportar função callClaude(userMessage, pageContext)
- Usar fetch direto para https://api.anthropic.com/v1/messages
- Incluir system prompt base + contexto da página atual
- Retornar {text, loading, error}
- Tratar erros com mensagem amigável em português

AIPanel.jsx deve:
- Slide-in da direita (380px), z-index sobre o conteúdo
- Overlay escurecido no fundo ao abrir
- Header com dot verde pulsando (status online), título e botão fechar
- Lista de mensagens com bolhas distintas (usuário vs IA)
- Animação de "digitando" (3 dots bouncing) enquanto carrega
- Quick chips iniciais: "Gerar mais leads", "Script de prospecção",
  "Como reduzir meu CAC?", "Plano rápido para este mês"
- Input textarea (Enter envia, Shift+Enter quebra linha)
- Botão enviar desabilitado durante carregamento
- Auto-scroll para última mensagem
- Contextos por página: cada módulo injeta dados relevantes no system prompt
  (ex: na página CRM, incluir "12 leads ativos, pipeline R$84k")

O system prompt base deve ser:
"Você é um assistente especializado em estratégia comercial e marketing
para PMEs brasileiras. Dê respostas práticas, diretas e acionáveis.
Use linguagem brasileira informal mas profissional. Máx 200 palavras
por resposta, mas muito úteis. Crie templates e scripts quando pedido."
```

---

### PROMPT 3 — Dashboard

```
Crie src/pages/Dashboard.jsx com todos os dados mockados em src/data/.

A página deve ter:
1. Row de 4 MetricCards: Leads (47, +18%), Conversão (11.2%, +2.1pp),
   CAC (R$87, -12%), Receita pipeline (R$84k, +31%)

2. Grid 3:1 com:
   - Kanban de pipeline resumido (4 colunas: Prospecção, Qualificação,
     Proposta, Fechamento) com 2-3 cards cada, valores em R$
   - Painel direito com: Meta do mês (63% de R$50k com progress bar)
     e Atividades hoje (3 itens com checkbox funcional)

3. Row de 3 cards:
   - Gráfico de barras (leads por canal, 6 meses) usando Recharts
   - Top canais de aquisição com progress bars (Indicação 38%,
     Prospecção 29%, Instagram 21%, Orgânico 12%)
   - Alertas (follow-up vencido em âmbar, meta no caminho em verde,
     reunião amanhã em accent)

Cada card deve ter um botão contextual que abre o AIPanel com prompt
relevante para aquele dado.
```

---

### PROMPT 4 — CRM (Kanban completo)

```
Crie src/pages/CRM.jsx com kanban drag-and-drop completo.

Requisitos:
- 5 colunas: Prospecção, Qualificação, Proposta, Fechamento, Ganho
- Cards com: nome da empresa, contato, tags de setor, valor mensal,
  indicadores de urgência (dias sem contato, prazo de follow-up)
- Barra de busca + filtro por estágio
- Botão "Adicionar lead" abre modal com formulário
- Cada card tem botão "Script IA" que abre AIPanel com prompt
  personalizado para aquela empresa
- Alerta visual (borda âmbar) para leads +7 dias sem resposta
- Coluna "Ganho" com opacidade reduzida (histórico)
- Contadores de leads por coluna
- Usar react-beautiful-dnd ou @hello-pangea/dnd para drag-and-drop

Dados mockados com 8-10 leads distribuídos nas colunas.
```

---

### PROMPT 5 — Prospecção Ativa

```
Crie src/pages/ProspeccaoAtiva.jsx e src/services/cnpj.js,
src/services/hunter.js, src/services/apollo.js.

A página deve ter:
1. Formulário de busca com campos:
   - CNAE (texto com placeholder de exemplo)
   - Estado (select com UFs)
   - Cidade (input)
   - Porte (MEI, ME, EPP, Médio)
   - Capital social mínimo
   - Botão "Buscar empresas"

2. Cards de integrações com status:
   - API Receita Federal (gratuita, sempre ativa)
   - Hunter.io (conectado se VITE_HUNTER_API_KEY definida)
   - Apollo.io (configurar se sem key)
   - WhatsApp Business API (em breve)

3. Tabela de resultados com colunas:
   - Empresa, CNPJ, CNAE, Cidade/UF
   - Email (com dot verde/âmbar/vermelho de verificação)
   - Telefone (com status)
   - Score (Alto/Médio/Baixo)
   - Ações: "Script IA" e "Enriquecer"

cnpj.js: integração com https://receitaws.com.br/v1/cnpj/{cnpj}
hunter.js: mock de busca de email por domínio (real se tiver API key)
apollo.js: mock de enriquecimento (real se tiver API key)

Dados mockados com 4 empresas de exemplo para demonstração.
```

---

### PROMPT 6 — KPIs & Metas + Diagnóstico

```
Crie src/pages/KPIs.jsx e src/pages/Diagnostico.jsx.

KPIs.jsx:
- Row de 4 metrics com progress bar individual e status (atingido/em andamento)
- Tabela de metas do trimestre com colunas: Meta, Atual, Target, Prazo, Status
- Card de benchmarks com comparativo: sua taxa vs mercado, seu CAC vs referência
- Destaque verde se acima da média, âmbar se abaixo
- Botão "IA: Top 3 ações" com prompt contextualizado com os dados reais

Diagnostico.jsx:
- SWOT interativa em grid 2x2 com cores distintas por quadrante
  (verde=forças, âmbar=fraquezas, accent=oportunidades, vermelho=ameaças)
- Cada item da SWOT é editável (click to edit)
- Score de maturidade circular (SVG) de 0-100 com breakdown por dimensão
- Personas mapeadas com avatar de iniciais, descrição e dores principais
- Botão para adicionar nova persona via IA
- Botão "IA: Plano de ação baseado na SWOT"
```

---

### PROMPT 7 — Diretório Interno

```
Crie src/pages/DiretorioInterno.jsx.

Layout de duas colunas (1:3):
- Sidebar esquerda: 5 pastas clicáveis (Processos, Senhas & Acessos,
  Templates, Fluxogramas, Contratos) com contador de itens
- Campo de busca com resultados recentes

Pasta Processos (padrão aberta):
- Lista de SOPs com ícone colorido, nome, meta (responsável, nº passos,
  última atualização), badge de status (Ativo/Revisar)
- Click em cada SOP abre o AIPanel com prompt para detalhar aquele processo

Pasta Senhas & Acessos:
- Aviso de segurança em âmbar (visível apenas para admins)
- Tabela: Plataforma (com logo colorido), Usuário, Senha mascarada, Categoria
- Clique na senha mascara → revela por 3 segundos → volta a mascarar
- Botão "Adicionar" para nova entrada

Pasta Templates:
- Cards de templates com versão, data e status
- Click abre AIPanel para melhorar o template

Botão flutuante "+ Criar com IA" em todas as pastas para criar
novo documento via assistente.
```

---

### PROMPT 8 — Redes Sociais

```
Crie src/pages/RedesSociais.jsx.

Seção 1 — Métricas por rede (grid de 4 cards):
- Instagram, LinkedIn, YouTube, X/Twitter
- Cada card: logo colorido, handle, seguidores (número grande),
  engajamento, posts/mês, alcance, delta percentual (verde ou vermelho)

Seção 2 — Layout 3:1:
- Calendário editorial (maio 2025):
  - Grid 7 colunas, cabeçalho com dias da semana
  - Dias com post marcados com dot colorido (gradiente=IG, azul=LI, vermelho=YT)
  - Dia atual destacado com fundo accent
  - Botão "IA: Gerar calendário" e "Novo post"

- Lista de próximas postagens:
  - Logo da plataforma, texto do post (resumido), tags de status
    (Rascunho/Agendado/Ideia) e formato (Carrossel/Reels/Artigo/Stories)
  - Data e horário de publicação

Painel lateral direito:
- Melhores horários para postar por rede
- Top 2 conteúdos do mês com curtidas e compartilhamentos
- Frequência de posts com progress bar por rede
- Botão "IA: Plano de crescimento" contextualizado com as métricas
```

---

### PROMPT 9 — Guia Estratégico + Régua de Comunicação

```
Crie src/pages/GuiaEstrategico.jsx e src/pages/ReguaComunicacao.jsx,
e o arquivo src/data/guia-chapters.js com o conteúdo completo dos 8 capítulos.

GuiaEstrategico.jsx:
- Layout 1:3 (progresso + lista de capítulos)
- Card de progresso com: percentual, barra, capítulo atual, próxima ação
  recomendada, botão "Pedir ajuda à IA"
- Lista de capítulos com: número/ícone de check, título, subtítulo,
  badge de status (Concluído/Em andamento/Não iniciado)
- Click em capítulo abre o AIPanel com resumo + primeiros passos práticos
- Checklists interativos dentro de cada capítulo (armazenados em localStorage)

guia-chapters.js: array com os 8 capítulos completos, cada um com:
  id, titulo, subtitulo, teoria, checklist[], status inicial

ReguaComunicacao.jsx:
- Sidebar de fluxos ativos (Nurturing leads frios, Onboarding, Reengajamento)
- Cada fluxo mostra: nº de steps, canais, duração, leads ativos, barra de progresso
- Visualização do fluxo selecionado: linha do tempo vertical com cada step
  (número, dia, canal, título, detalhe, taxa de abertura se disponível)
- Botão "Gerar textos com IA" por fluxo
- Botão "+ Criar novo fluxo com IA"
```

---

### PROMPT 10 — Refinamentos finais

```
Com todas as páginas criadas, faça os refinamentos finais:

1. Persistência: implemente src/hooks/useLocalStorage.js e aplique em:
   - Checklists do Guia Estratégico
   - Status das atividades do Dashboard
   - Leads do CRM (adicionar/mover entre colunas)
   - Itens do Diretório Interno

2. Notificações: crie um sistema de toast notifications para:
   - Lead movido de coluna no CRM
   - SOP criado/atualizado no Diretório
   - Post agendado no calendário

3. Responsividade: sidebar recolhível em telas menores (< 1200px)

4. Polimentos visuais:
   - Animação fadeIn ao trocar de página
   - Hover states em todos os elementos clicáveis
   - Loading skeleton nos cards que carregam dados externos
   - Scrollbar customizada (fina, cor var(--border2))

5. README.md completo com: visão geral, stack, como rodar,
   configuração das API keys, estrutura de pastas
```

---

## 7. Como rodar o projeto

```bash
# Instale dependências
npm install

# Crie o .env.local com sua API key da Anthropic
cp .env.example .env.local
# Edite .env.local e adicione: VITE_ANTHROPIC_API_KEY=sk-ant-...

# Rode em desenvolvimento
npm run dev

# Build para produção
npm run build
```

---

## 8. Deploy rápido (gratuito)

```bash
# Opção 1: Vercel (recomendado)
npm install -g vercel
vercel
# Configure as variáveis de ambiente no painel da Vercel

# Opção 2: Netlify
npm run build
# Arraste a pasta dist/ para netlify.com/drop
```

> **Importante no deploy**: configure `VITE_ANTHROPIC_API_KEY` como
> variável de ambiente no painel do Vercel/Netlify.
> Nunca suba o `.env.local` para o repositório.

---

## 9. Próximas evoluções (pós-MVP)

| Feature | Complexidade | Impacto |
|---|---|---|
| Backend Node.js + banco de dados | Alta | Essencial para multi-usuário |
| Auth de usuários (email/senha) | Média | Necessário para vender o app |
| Integração real Hunter.io | Baixa | Alto valor na prospecção |
| Integração real Apollo.io | Baixa | Alto valor na prospecção |
| Importar leads via CSV | Média | Muito pedido por PMEs |
| Notificações por WhatsApp | Alta | Diferencial competitivo |
| App mobile (React Native) | Alta | Alcance maior |
| Modo multi-empresa (agência) | Alta | Modelo de negócio escalável |
