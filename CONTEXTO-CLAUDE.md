# Contexto do Projeto — Comercial PME
*(Colar no início de novas conversas com o Claude.ai)*

## O que é
App SaaS React + Vite + Supabase para MEIs e PMEs brasileiras 
estruturarem o departamento comercial. Combina Guia Estratégico 
(educacional), módulos operacionais (CRM, Diagnóstico, etc.) e 
IA contextual. Consultoria "Raiz Comercial" é o braço de serviços.

## Stack
React 19, Vite, Tailwind CSS, Supabase (auth + Postgres + RLS + 
Storage), Vercel (serverless + deploy), API Anthropic via /api/chat.
Repo: github.com/douglasabradfield/crm
Local: C:\Users\dougl\OneDrive\Desktop\crm

## Workflow
Estratégia/prompts aqui no Claude.ai → execução no Claude Code 
(VS Code). Prompts autocontidos, um por tarefa, sempre terminam com 
git add -A && git commit && git push. /clear antes de cada tarefa 
nova no Code.

## Estado atual (junho 2026)

### ✅ Concluído
- Autenticação real (Supabase Auth), multi-tenant com RLS por empresa
- Migração completa para Supabase: CRM, Diagnóstico (7 seções), 
  KPIs & Metas, Diretório (pastas + documentos + arquivos via 
  Storage + senhas), Régua de Comunicação, Redes Sociais (calendário 
  com datas reais), Tickets (Chamados), Guia (progresso + anotações)
- Chave Anthropic protegida em função serverless /api/chat
- Convite de equipe por link (Caminho B): tabela convites + função 
  serverless api/aceitar-convite.js + tela /convite/:codigo + 
  lista de pendentes em Configurações
- Guia Estratégico revisado (9 capítulos, PT-first, sem jargão)
- Menu renomeado: Dashboard→Painel, Tickets→Chamados, 
  KPIs & Metas→Metas e Indicadores
- Componente Termo + glossario.js (tooltips de termos técnicos)
- "Checklist" → "Tarefas" na interface
- Missão/visão/valores readicionados ao Capítulo 0 com layers
- vercel.json com rewrite SPA (corrige 404 no F5)
- CLAUDE.md atualizado com arquitetura e padrões atuais

### 🔄 Em andamento
- Ponte Guia → Módulos: religar os formulários especiais do guia 
  (SwotForm, PersonaForm, FunilForm, FourPsForm, CompetitorForm, 
  GoalsForm, KPIsDefForm) ao Supabase em vez do localStorage. 
  Padrão definido: dado vive no módulo (banco), guia lê e escreve 
  no mesmo lugar. Substituir com versão no histórico antes. 
  Raio (⚡) auto-concluído lê do banco.
  SWOT é o próximo (prompt já montado, não executado ainda).
  Depois: personas, funil, 4Ps, concorrentes, metas/KPIs, 
  documentos do Diretório.

### 📋 Lista de pendências (ordem de prioridade)

PRÉ-BETA (essenciais):
1. ✅ Convite de equipe — FEITO
2. 🔄 Ponte Guia → Módulos — EM ANDAMENTO (ver acima)
3. Prospecção Ativa + Capítulo 9 do Guia — fazer tudo junto: 
   migrar módulo, criar capítulo, conectar Prospecção→Régua→CRM 
   sem duplicar (leads "pré-qualificados" referenciados pela tabela 
   leads do CRM com campo de origem/estágio)
4. Stripe + créditos de IA por plano (Start/Pro/Equipe) + 
   roteamento Haiku/Sonnet — pode ser beta gratuito inicialmente
5. Auditoria de integrações: testar OAuth de redes sociais, 
   marcar "em breve" o que não funcionar; mover chaves Hunter/Apollo 
   pro servidor

SEGURANÇA (antes de usuários reais):
6. Criptografia das senhas do Diretório (hoje texto puro, com aviso)

PÓS-BETA:
7. Marca — nome ainda não resolvido; APP_NAME constante no código
8. Histórico de versões do Diagnóstico no banco (hoje em localStorage)
9. Tickets no histórico do cliente (ClienteModal no CRM)
10. Formulário público de chamado (cliente abre sem login)
11. API pública (pra contadores/parceiros)
12. Espalhar componente Termo nas demais telas
13. Revisão final dos textos do guia (Douglas vai compilar)
14. Prospecção→Régua→CRM: revisitar modelagem de leads 
    quando Prospecção for feita

## Decisões técnicas importantes
- empresa_id NUNCA vai no INSERT — banco preenche via 
  default public.empresa_do_usuario(). Exceção: upsert com onConflict.
- Campos jsonb chegam parseados do Supabase — nunca JSON.parse.
- Toda tabela tem RLS. Verificar sempre com "vestir o chapéu" 
  (set_config + set local role authenticated) se algo der 403.
- Convite: empresa_id e papel vêm SEMPRE do banco, nunca do body.
- Prospecção Ativa está ESCONDIDA do menu (hidden) — lançar junto 
  com Capítulo 9.
- Histórico de versões (useVersionHistory) ainda em localStorage — 
  pendente migrar pro banco.
- Tooltip Termo: renderizado via Portal, posicionamento dinâmico 
  (não corta nas bordas).

## Padrões de código (ver CLAUDE.md para detalhes)
- fromRow/toRow por entidade (snake_case ↔ camelCase)
- Fetch com flag cancelled
- Escrita só atualiza estado local após sucesso no banco
- Seed-on-empty com mocks *_INIT
- SkeletonLoader durante loading
- Modais via React Portal (fixed inset-0 z-50, max-h-90vh)

## Regras de produto
- Público MEI/PME, nunca startup
- PT-first: sigla/inglês entre parênteses na 1ª menção
- Sem jargão guru/startup
- Dark theme obrigatório
- Números: toLocaleString('pt-BR') com R$
- Testar com npm run dev (funções /api precisam de vercel dev)