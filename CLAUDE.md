# CLAUDE.md

Guia para o Claude Code ao trabalhar neste repositório.

## O que é este projeto
Plataforma web para MEIs e PMEs brasileiras estruturarem seu departamento 
comercial. Combina conteúdo educacional (Guia Estratégico), ferramentas 
operacionais (CRM, Diagnóstico, KPIs, Diretório, Régua, Redes, Tickets) e 
IA assistente contextual. Público: donos de pequenos negócios, NÃO startups.

## Estado atual (IMPORTANTE — manter atualizado)
App funcional, multi-tenant, rodando em produção na Vercel.
- Autenticação: Supabase Auth (login real).
- Dados: migrados para Supabase (Postgres + RLS + Storage). 
  localStorage NÃO é mais a fonte de dados operacionais.
- Migrados para Supabase: CRM (leads, clientes, funis), Diagnóstico 
  (7 seções), KPIs & Metas, Diretório (pastas, documentos, arquivos via 
  Storage, senhas), Régua de Comunicação, Redes Sociais (calendário), Tickets.
- Pendente de migração: Prospecção Ativa (junto com novo Capítulo 9 do guia) 
  e progresso/anotações do Guia.
- IA: via função serverless /api/chat (chave no SERVIDOR, nunca no navegador).

## Comandos
```bash
npm run dev       # servidor de desenvolvimento (Vite) — usar para testar
npm run build     # build de produção
npm run preview   # preview do build
npm run lint      # ESLint
# vercel dev      # SÓ quando precisar testar a IA (função /api/chat)
```

## Stack técnica
- React 19 + Vite, React Router DOM v7
- Tailwind CSS v3 (dark theme obrigatório)
- Recharts (gráficos), lucide-react (ícones), date-fns (datas)
- @hello-pangea/dnd (kanban do CRM)
- @supabase/supabase-js (auth + dados + storage)
- Context API para estado global
- IA: API Anthropic via /api/chat (serverless Vercel), modelo claude-sonnet

## REGRAS DE ARQUITETURA (sempre seguir)

### Multi-tenant por empresa
- Todo dado pertence a uma empresa (tabela `empresas`). Cada usuário tem 
  perfil (tabela `perfis`) com `empresa_id`.
- useAuth (src/store/auth.js) expõe: user (id, role, empresa_id), empresaId, loading.
- Toda tabela de dados tem `empresa_id` com `default public.empresa_do_usuario()` 
  e RLS filtrando por empresa.
- NUNCA enviar empresa_id em INSERT — o banco preenche via default.
  Exceção: em UPSERT com onConflict, empresa_id vai no objeto.

### Padrão de migração / acesso a dados
- Funções fromRow/toRow por entidade (snake_case ↔ camelCase).
- Campos jsonb chegam/saem como arrays/objetos já parseados — NÃO usar JSON.parse.
- Fetch ao montar, só quando empresaId disponível, com flag `cancelled`.
- Escrita: chama Supabase → só atualiza estado local se SEM erro.
- Seed-on-empty: se a tabela vier vazia, popular com mocks (*_INIT) uma vez.
- Loading + <SkeletonLoader> durante carregamento.

### Modais
- Sempre via React Portal (createPortal no document.body).
- Overlay fixed inset-0 z-50 bg-black/50 centralizado; painel max-h-[90vh] 
  overflow-y-auto.

## Design System — seguir rigorosamente

### Cores (CSS custom properties em index.css)
--bg:#0e0f12  --bg2:#16181e  --bg3:#1e2028  --bg4:#252830

--border:#2e3040  --border2:#3a3d52

--text:#e8eaf0  --text2:#9498b0  --text3:#5c6080

--accent:#5b6ef5  --accent2:#7c8ff7

--green:#2dd4a0  --amber:#f0a832  --red:#f05c5c  --purple:#b06ef5  --teal:#38c9e0

### Tipografia
- Corpo: 'DM Sans' (weights 400, 500). Display/números: 'DM Serif Display'.
- Tamanhos: 11px (labels), 12-13px (corpo), 14px (base), 16px (títulos).

### Componentes
- Radius: 8px (botões/inputs), 10px (cards pequenos), 14px (cards grandes)
- Cards: bg var(--bg2), border 1px var(--border), radius 14px, padding 20px
- Botão primário: bg var(--accent), cor #fff, radius 8px
- Badges: padding 2px 9px, radius 20px, font 11px

## Módulos (rotas)
/ Dashboard · /guia GuiaEstrategico · /crm CRM · /prospeccao ProspeccaoAtiva · 
/regua ReguaComunicacao · /kpis KPIs · /diagnostico Diagnostico · 
/diretorio DiretorioInterno · /redes RedesSociais · /configuracoes 
Configuracoes · /tickets Tickets

## Estado (stores por domínio)
src/store/index.js (ThemeContext, UIContext) · auth.js (useAuth) · 
crm.js (useCRM) · diretorio.js · metas.js · prospeccao.js · redes.js
UIContext expõe openAI(prompt?) e closeAI() para abrir o painel de IA.

## Permissões
- Papéis: superadmin, admin, gestor, vendedor, marketing, visualizador 
  (definidos em src/data/permissions.js).
- ProtectedRoute.jsx (bloqueia rotas), PermissionGate.jsx (oculta elementos 
  por module+action).

## Assistente IA (AIPanel.jsx)
- Slide-in pela direita (380px), disparado via openAI(prompt?).
- Contexto da página injetado em PAGE_AI_CONTEXT (App.jsx).
- Chamada via /api/chat (NÃO chamar api.anthropic.com direto do navegador).

## Regras de produto e linguagem
- Português primeiro. Termo em inglês/sigla: explicar entre parênteses na 
  primeira menção (ex: "acompanhamento (follow-up)", "CRM (gestão de clientes)").
- Evitar jargão de startup: nada de "product/market fit", "Q1/Q2/Q3/Q4" 
  (usar "1º/2º/3º/4º trimestre"), "headcount", "churn" sem tradução.
- Tom pé no chão, sem promessas de "guru".

## Regras de desenvolvimento
1. SEMPRE dark theme.
2. Componentes reutilizáveis em src/components/UI/.
3. Cada integração externa em src/services/.
4. Erros de API: mensagem amigável em português.
5. Senhas no Diretório: mascaradas, revelar 3s ao clicar (criptografia pendente).
6. Loading states em toda chamada assíncrona.
7. Números monetários: toLocaleString('pt-BR') com R$.
8. Testar com npm run dev (local), não no site publicado.
9. Sempre terminar tarefas com: git add -A && git commit -m "..." && git push.

## Segurança — pendências conhecidas
- Senhas do Diretório em texto puro (criptografia pendente antes do beta).
- Chaves Hunter.io e Apollo.io ainda no navegador (mover para servidor, 
  como foi feito com a Anthropic).