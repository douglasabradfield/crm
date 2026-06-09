# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto
Plataforma web para pequenas e médias empresas brasileiras estruturarem
seu departamento comercial. Combina conteúdo educacional (guia em 8 capítulos),
ferramentas operacionais (CRM, prospecção, régua, KPIs) e IA assistente contextual.

## Estado atual
O app está funcional. Todas as 11 páginas estão construídas, autenticação via Supabase implementada, sistema de permissões por papel (role), todos os stores de estado separados. A persistência é via localStorage para dados operacionais e Supabase para autenticação de usuários.

## Comandos

```bash
npm run dev       # inicia o servidor de desenvolvimento (Vite HMR)
npm run build     # build de produção para dist/
npm run preview   # preview do build de produção
npm run lint      # ESLint em todo o projeto
```

## Stack técnica
- React 19 + Vite
- React Router DOM v7
- Tailwind CSS v3 (dark theme obrigatório)
- Recharts para gráficos
- lucide-react para ícones
- date-fns para datas
- @hello-pangea/dnd para drag-and-drop (kanban do CRM)
- @supabase/supabase-js para autenticação
- Context API para estado global
- localStorage para persistência de dados no MVP
- Anthropic API via fetch direto — modelo `claude-sonnet-4-6`, `max_tokens: 800`

## Design System — seguir rigorosamente

### Cores (CSS custom properties em index.css)
```
--bg:       #0e0f12   (fundo principal)
--bg2:      #16181e   (sidebar, topbar, cards)
--bg3:      #1e2028   (superfícies internas, hover)
--bg4:      #252830   (inputs, elementos aninhados)
--border:   #2e3040   (bordas padrão)
--border2:  #3a3d52   (bordas de destaque/hover)
--text:     #e8eaf0   (texto principal)
--text2:    #9498b0   (texto secundário)
--text3:    #5c6080   (texto muted/labels)
--accent:   #5b6ef5   (azul-índigo, cor primária)
--accent2:  #7c8ff7   (accent mais claro)
--green:    #2dd4a0   (sucesso, positivo)
--amber:    #f0a832   (aviso, neutro)
--red:      #f05c5c   (erro, negativo)
--purple:   #b06ef5
--teal:     #38c9e0
```

### Tipografia
- Corpo: `'DM Sans'` (Google Fonts) — weights 400 e 500 apenas
- Display/números: `'DM Serif Display'` — para métricas grandes e logo
- Tamanhos: 11px (labels), 12-13px (corpo), 14px (base), 16px (títulos)

### Componentes
- Border radius: 8px (botões/inputs), 10px (cards pequenos), 14px (cards grandes)
- Borders: `1px solid var(--border)`
- Cards: `background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; padding: 20px`
- Botão primário: `background: var(--accent); color: #fff; border-radius: 8px`
- Botão ghost: `background: transparent; border: 1px solid var(--border2); color: var(--text2)`
- Badges/tags: `padding: 2px 9px; border-radius: 20px; font-size: 11px`

## Módulos do app (11 páginas)

| Rota | Página | Descrição |
|------|--------|-----------|
| / | Dashboard | Métricas, pipeline resumido, alertas, gráficos |
| /guia | GuiaEstrategico | 8 capítulos com checklists e progresso salvo |
| /crm | CRM | Pipeline kanban drag-and-drop |
| /prospeccao | ProspeccaoAtiva | Busca CNAE + enriquecimento Hunter/Apollo |
| /regua | ReguaComunicacao | Fluxos de nurturing e templates de mensagem |
| /kpis | KPIs | Métricas, metas, benchmarks do setor |
| /diagnostico | Diagnostico | SWOT editável, personas, score de maturidade |
| /diretorio | DiretorioInterno | SOPs, senhas mascaradas, templates |
| /redes | RedesSociais | Métricas por rede + calendário editorial |
| /configuracoes | Configuracoes | Permissões e usuários |
| /tickets | Tickets | Atendimento interno e externo |

## Arquitetura de estado

Os contextos são separados por domínio — cada um em seu próprio arquivo:

| Arquivo | Contexto | Hook |
|---------|----------|------|
| `src/store/index.js` | ThemeContext, UIContext | `useTheme()`, `useUI()` |
| `src/store/auth.js` | AuthContext | `useAuth()` |
| `src/store/crm.js` | CRMContext | `useCRM()` |
| `src/store/diretorio.js` | DiretorioContext | `useDiretorio()` |
| `src/store/metas.js` | MetasContext | `useMetas()` |
| `src/store/prospeccao.js` | ProspeccaoContext | `useProspeccao()` |
| `src/store/redes.js` | RedesContext | `useRedes()` |

O `UIContext` expõe `openAI(prompt?)` e `closeAI()` para abrir o painel de IA de qualquer componente.

## Autenticação e permissões

- `src/store/auth.js` gerencia sessão Supabase (`supabase.auth`) e perfil do usuário da tabela `perfis` (campos: `empresa_id`, `nome`, `email`, `papel`)
- Papéis disponíveis: `superadmin`, outros definidos em `src/data/permissions.js`
- `src/components/Auth/ProtectedRoute.jsx` — bloqueia rotas por módulo
- `src/components/Auth/PermissionGate.jsx` — oculta elementos por permissão granular (`module`, `action`)
- Overrides de permissão por usuário e papel ficam em localStorage (`crm_user_overrides`, `crm_role_overrides`)

## Assistente IA (AIPanel.jsx)

- Slide-in pela direita, largura 380px
- Disparado via `openAI(prompt?)` do `UIContext`
- Contexto da página ativa é injetado como string em `PAGE_AI_CONTEXT` em `App.jsx`
- Enter envia, Shift+Enter quebra linha

System prompt base:
```
Você é um assistente especializado em estratégia comercial e marketing
para PMEs brasileiras. Dê respostas práticas, diretas e acionáveis.
Use linguagem brasileira informal mas profissional. Máx 200 palavras
por resposta, mas muito úteis. Crie templates e scripts quando pedido.
Quando criar mensagens de prospecção ou follow-up, formate claramente.
```

## Integrações externas (src/services/)

### Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
Usado apenas para autenticação. Tabela `perfis` vinculada ao `auth.users`.

### API Receita Federal (gratuita)
```
GET https://receitaws.com.br/v1/cnpj/{cnpj}
```

### Hunter.io (`VITE_HUNTER_API_KEY`)
```
GET https://api.hunter.io/v2/domain-search?domain={domain}&api_key={key}
```

### Apollo.io (`VITE_APOLLO_API_KEY`)
```
POST https://api.apollo.io/v1/people/search
Headers: x-api-key: {key}
```

### Anthropic API (`VITE_ANTHROPIC_API_KEY`)
```
POST https://api.anthropic.com/v1/messages
Headers: x-api-key: {key}, anthropic-version: 2023-06-01
```

## Regras de desenvolvimento

1. SEMPRE dark theme — nunca usar fundo branco ou cinza claro
2. Componentes de UI reutilizáveis em `src/components/UI/`
3. Dados mockados em `src/data/` para todo o MVP (sem backend ainda, exceto auth)
4. Cada integração externa tem arquivo próprio em `src/services/`
5. API keys via `import.meta.env.VITE_*`
6. Erros de API: mensagem amigável em português
7. Senhas no Diretório: mascaradas (`••••••••`) por padrão, revelar 3s ao clicar
8. Loading states: skeleton ou spinner em toda chamada assíncrona
9. Animação fadeIn ao trocar de página (CSS keyframes simples, classe `page-enter`)
10. Todos os números monetários: `toLocaleString('pt-BR')` com prefixo R$
