# PRD — Comercial PME
## Product Requirements Document v1.0
> Documento estratégico do produto. Complementa o CLAUDE.md (instruções técnicas).
> Atualizado em: maio/2026 | Autor: Douglas

---

## 1. Visão Geral do Produto

**O que é:**
Plataforma web para pequenas e médias empresas brasileiras estruturarem seu departamento comercial e de marketing. Combina conteúdo educacional prático (guia em 8 capítulos), ferramentas operacionais integradas e assistente IA contextual em todos os módulos.

**Problema que resolve:**
PMEs crescem de forma desorganizada — vendas sem funil, comunicação inconsistente, processos na cabeça do dono, ferramentas espalhadas em 5 apps diferentes. O Comercial PME centraliza tudo e ensina enquanto o empresário faz.

**Diferencial central:**
> Todas as funcionalidades liberadas para todos os planos. O que muda é o quanto a IA trabalha por você e quantos usuários a conta suporta.

**Público-alvo primário:** MEI e ME brasileiras — donos que fazem tudo sozinhos ou com equipe pequena, sem tempo para estudar e implementar.

**Público-alvo secundário:** PMEs mais estruturadas com equipe comercial e de marketing.

---

## 2. Níveis de Acesso

### 2.1 Três níveis hierárquicos

| Nível | Quem | Acesso |
|---|---|---|
| **Super Admin** | Douglas (criador) | Tudo + painel da plataforma + editor de conteúdo |
| **Admin** | Dono de cada empresa cliente | Gestão da empresa + permissões de usuários |
| **Usuário** | Equipe da empresa | Conforme permissões definidas pelo Admin |

### 2.2 Permissões por módulo

Sistema de duas camadas:
1. **Permissão padrão por role** — define o acesso base de cada perfil
2. **Override por usuário** — Admin pode customizar individualmente, sobrescrevendo o padrão

Resolução: `override do usuário (se existir) ?? permissão da role ?? false`

Roles disponíveis: Admin · Gestor Comercial · Vendedor/SDR · Marketing · Visualizador

Módulos controlados: dashboard · guia · crm · prospeccao · regua · kpis · diagnostico · diretorio · diretorio_senhas · redes · configuracoes

Ações por módulo: view · edit · delete · export

---

## 3. Planos e Precificação

### 3.1 Estrutura de planos

| | **Start** | **Pro** | **Equipe** |
|---|---|---|---|
| **Para quem** | MEI / solo | ME / pequena equipe | PME estruturada |
| **Usuários** | 1 | até 5 | até 15 |
| **Ações de IA/mês** | 150 | 800 | 2.500 |
| **API aberta** | ✗ | ✓ | ✓ |
| **Preço lançamento** | R$ 29/mês | R$ 89/mês | R$ 179/mês |
| **Preço pós-validação** | R$ 39/mês | R$ 109/mês | R$ 219/mês |

Todos os planos incluem todos os módulos sem restrição de funcionalidade.

### 3.2 O que conta como "ação de IA"
Cada interação com o assistente — gerar texto, pedir análise, criar script, resumir documento, sugerir próximo passo. Uma conversa com 3 trocas = 3 ações.

### 3.3 Controle de uso
- Barra de progresso em Configurações → Uso de IA
- Alerta ao atingir 80% do limite
- IA bloqueada ao atingir 100% — disponível comprar créditos ou aguardar renovação
- Reset automático todo dia 1º do mês

### 3.4 Pacotes de créditos extras
- +200 ações → R$ 19
- +600 ações → R$ 49
- +1.500 ações → R$ 99

### 3.5 Modelo econômico
- Usar modelo leve (Haiku) para ações simples: gerar post, script curto, resposta rápida
- Usar modelo avançado (Sonnet) para análises complexas: diagnóstico, relatório mensal, benchmark
- Meta: custo de IA < 20% da receita por usuário

---

## 4. Módulos do Produto

---

### 4.1 Guia Estratégico
**Posição:** primeiro item do sidebar — ponto de partida de tudo

**Conceito:** conteúdo educacional em 8 capítulos que ensina o empresário a estruturar o comercial enquanto já alimenta o sistema com dados reais.

**Capítulos:**
0. Introdução — Por Que Estruturar Agora?
1. Diagnóstico Inicial
2. Planejamento Geral
3. Equipe e Papéis (Marketing)
4. Equipe e Papéis (Vendas)
5. Comunicação e Marca
6. Ferramentas e Operação
7. Medição e Ajustes
8. Integração e Crescimento

**Regras de negócio:**
- Cada tarefa do checklist que tem ferramenta correspondente no sistema ganha botão de ação direto
- Exemplos: "Faça sua SWOT" → abre Diagnóstico na SWOT | "Defina metas" → abre KPIs
- Progresso salvo por usuário no localStorage (futuro: banco de dados)
- Cada dado preenchido via guia alimenta o contexto da IA automaticamente

**Três camadas por tarefa:**
- O quê — descrição curta
- Por quê — contexto do valor
- Como — passo a passo ou link direto para a ferramenta

**Editor de conteúdo (Super Admin):**
- Douglas edita capítulos, tarefas e dicas sem mexer no código
- Página exclusiva no painel de Super Admin

---

### 4.2 Dashboard
**Conceito:** painel totalmente customizável — cada empresa escolhe o que quer ver.

**Biblioteca de métricas disponíveis:**

*Comercial:* leads gerados · taxa de conversão · CAC · ticket médio · receita pipeline · ciclo de vendas médio · propostas enviadas · taxa de fechamento

*Clientes:* clientes ativos · churn · NPS médio · LTV · reativações

*Atividades:* tarefas concluídas · follow-ups pendentes · reuniões realizadas

*Redes sociais:* alcance total · engajamento médio · posts publicados

*Financeiro:* receita recorrente · receita nova

**Widgets disponíveis além de métricas:**
- Alertas e follow-ups vencidos
- Atividades do dia (checklist)
- Gráfico de leads por canal
- Próximos eventos/reuniões
- Top clientes por valor
- Pipeline resumido (opcional)
- OKRs em andamento

**Filtro de tempo global:** Hoje · Esta semana · Este mês · Trimestre · Semestre · Ano · Total · Personalizado

**Comparativo automático** com período anterior em cada métrica.

**Ícone de interrogação** em cada métrica: tooltip com definição + como é calculada + link "Saiba mais" para glossário completo.

**Modo de edição:** botão "Personalizar dashboard" — usuário reordena, adiciona e remove widgets. Configuração salva por usuário.

---

### 4.3 CRM
**Conceito:** pipeline flexível e banco de clientes — o mais complexo e personalizável do sistema.

#### Pipeline (Leads/Oportunidades)

**Múltiplos funis:**
- Admin cria quantos funis precisar (limite: 10)
- Cada funil tem nome próprio e etapas customizáveis (limite: 10 etapas)
- Etapas têm: nome, cor, campos obrigatórios, meta de tempo máximo
- Dropdown no topo para alternar entre funis

**Campos:**
- Padrão (não editáveis, usados em métricas): nome, CNPJ, contato, email, telefone, valor, estágio, datas, origem, responsável
- Personalizados (criados pelo admin): texto, número, moeda, data, checkbox, select, multi-select, URL
- Campos numéricos/moeda entram em relatórios com: soma, média, maior, menor, contagem

**Campos obrigatórios por etapa:**
- Admin define o que é obrigatório para avançar de etapa
- Sistema bloqueia avanço e lista campos faltantes

**Modal do Lead — abas:**
- Visão Geral — campos padrão + personalizados
- Atividades — timeline cronológica completa
- Tarefas — criar tarefas vinculadas com responsável, prazo e prioridade
- Emails/Mensagens — registro de comunicações
- Documentos — anexos vinculados ao lead

**Botão "Converter em Cliente"** na coluna Ganho — chama `converterLeadEmCliente()`.

#### Clientes

**Campos do cliente:**
- Status: Ativo · Inativo · Ex-cliente
- Dados: empresa, CNPJ, contato, segmento, porte, tags, prioridade (A/B/C)
- Pedidos: data, descrição, valor, status, forma de pagamento, recorrente
- Histórico: timeline de contatos, pedidos, tickets e anotações
- Último contato e próximo contato

**Tarefas automáticas por evento:**
- Ao converter lead → "Fazer reunião de kickoff em 3 dias"
- Ao completar onboarding → "Agendar check-in de 30 dias"
- Admin configura gatilhos e tarefas automáticas

**Aba NPS por cliente:**
- Histórico de pontuações com data e comentário
- Lembrete automático configurável (ex: a cada 90 dias)
- Alerta no Dashboard quando NPS vencer
- Gráfico de evolução do NPS ao longo do tempo

**Relatórios exportáveis:**
- Filtros: funil, etapa, responsável, período, campos personalizados
- Agrupamentos: por responsável, etapa, origem, segmento
- Exportar: CSV e PDF
- Salvar relatórios favoritos

---

### 4.4 Prospecção Ativa

**Fluxo correto:**
```
Prospecção Ativa → Régua de Comunicação → CRM (quando demonstrar interesse)
```

**Busca de empresas:**
- Campos: CNAE, Estado, Cidade, Porte (MEI/ME/EPP/Médio), Capital social mínimo
- Integração API Receita Federal (gratuita) — dados de CNPJ, sócios, endereço
- Integração Hunter.io — busca e verificação de emails
- Integração Apollo.io — enriquecimento completo com telefones

**Status de cada empresa prospectada:**
Nova · Em régua · Respondeu · No CRM · Descartada

**Encaminhamento em lote:**
- Checkbox para selecionar múltiplas empresas
- Barra de ações: "Adicionar à Régua" ou "Adicionar ao CRM"
- Ao ir direto para CRM: aviso sobre inflação de métricas com opção de confirmar ou redirecionar para Régua

**Histórico por empresa:**
- Data de descoberta, fonte, fluxos de régua, tentativas de contato, status atual

---

### 4.5 Régua de Comunicação

**Tipos de step:**

| Canal | Tipo | Como funciona |
|---|---|---|
| Email | Automático | Disparo via integração (Resend/Mailchimp/RD Station) |
| WhatsApp | Manual | Gera tarefa com prazo para o usuário |
| Ligação | Manual | Gera tarefa com prazo para o usuário |

**Steps de email:**
- Integrações: Resend (gratuito até 3k/mês) · Mailchimp (gratuito até 1k/mês) · RD Station
- Aviso de custo adicional exibido na interface
- Editor de conteúdo com geração via IA
- Condição de avanço configurável

**Steps manuais (WhatsApp e Ligação):**
- Cria tarefa automática para o responsável com prazo definido no step
- Tarefa aparece no Dashboard do responsável
- Alerta vermelho se prazo vencer sem conclusão
- Registro obrigatório ao concluir: o que foi discutido, resultado (sem resposta · interesse · pediu retorno · não tem interesse)
- IA sugere próximo passo com base no resultado registrado

**Lógica de avanço condicional:**
- Avançar automaticamente após X dias
- Aguardar ação manual
- Bifurcação por resultado — caminhos diferentes por tipo de resposta

---

### 4.6 KPIs & Metas

**KPIs personalizáveis:**
- Admin cria KPIs com nome, tipo (número/moeda/percentual/tempo), cálculo (manual ou automático), meta, prazo e frequência
- KPIs automáticos puxam dados do sistema: leads, conversão, CAC, ticket médio, NPS, churn, posts publicados

**Filtro de tempo:** Hoje · Esta semana · Este mês · Trimestre · Semestre · Ano · Personalizado

**Comparativo automático** com período anterior.

**Aba OKRs & Projetos:**
- Objetivo (qualitativo) + até 4 Resultados-Chave (quantitativos com prazo)
- Iniciativas/Projetos vinculados com: título, descrição, responsável, prazo, status, checklist de subtarefas, prioridade
- Ciclos: Mensal · Trimestral · Semestral · Anual
- Histórico de ciclos anteriores para comparação

**Benchmark do setor:**
- IA busca dados de mercado quando solicitado
- Aviso obrigatório: *"Estimativa baseada em fontes públicas. Valores aproximados — use como referência, não como verdade absoluta."*
- Usuário preenche contexto: setor, porte, modelo de negócio, região
- Botão "Atualizar benchmark" — consome ações de IA

---

### 4.7 Diagnóstico

**Conceito:** repositório vivo da saúde estratégica — cada análise salva com data, histórico comparável ao longo do tempo.

**Análises disponíveis:**

**SWOT** — 4 quadrantes editáveis, histórico de versões, IA sugere itens com base nos dados do sistema

**4Ps do Marketing** — Produto, Preço, Praça, Promoção com campos estruturados. IA aponta maior gap e oportunidade

**Personas** — nome fictício, cargo, dores, decisão de compra, objeções, canais. Vinculada ao CRM

**Funil de Vendas Atual** — etapas, volumes estimados, taxas de conversão. IA compara com dados reais do CRM

**Análise de Concorrentes** — cadastro com pontos fortes/fracos, diferenciais, faixa de preço. Comparativo lado a lado

**Score de Maturidade Comercial** — questionário automático, score 0-100, breakdown por dimensão (Processos, Ferramentas, Equipe, Métricas, Comunicação), histórico de evolução

**Canvas de Proposta de Valor** — segmento de clientes vs proposta de valor, IA avalia o fit

**Compilação geral no topo:**
- Última atualização de cada análise
- Score de maturidade atual
- Alertas de análises desatualizadas (ex: "SWOT não atualizada há 90 dias")
- Botão "Gerar relatório de diagnóstico completo" → exporta em PDF

**Integração com o sistema:**
- SWOT e 4Ps alimentam contexto da IA em todos os módulos
- Personas alimentam CRM e Régua
- Score aparece no Dashboard como widget opcional

---

### 4.8 Diretório Interno

**Conceito:** repositório central de processos, documentos, senhas e recursos da empresa.

**Estrutura de pastas:**
- Pastas padrão: Processos · Senhas & Acessos · Templates · Fluxogramas · Contratos
- Admin pode criar, renomear, reordenar e excluir pastas
- Subpastas até 3 níveis de profundidade
- Reordenação via drag-and-drop
- Pasta "Recursos do Guia" pré-criada com atalhos para ferramentas dos capítulos

**Tipos de arquivo suportados:**
- Imagens: JPG, PNG, GIF, SVG, WEBP (com thumbnail e visualização ampliada)
- Documentos: PDF, DOCX, XLSX, PPTX
- Editor de texto interno com suporte a imagens inline (prints, fluxogramas)

**Modal de documento:**
- Layout: 60% conteúdo + 40% Assistente IA
- Abas: Visão Geral · Conteúdo/Passos · Histórico de versões
- IA contextualizada com o conteúdo do documento aberto
- Quick chips por tipo: SOP → "Melhorar processo" | Template → "Tornar mais persuasivo"

**Senhas & Acessos:**
- Mascaradas por padrão (••••••••)
- Revelar ao clicar → visível por 3 segundos → volta a mascarar
- Acesso restrito por permissão (diretorio_senhas)

**Permissões por pasta:**
- Visível para todos · Apenas para roles específicas · Apenas para usuários específicos

---

### 4.9 Redes Sociais

**Integrações em tempo real via OAuth:**

| Rede | API | Viabilidade |
|---|---|---|
| Instagram | Meta Business API | Alta — gratuita |
| Facebook | Meta Business API | Alta — mesma API |
| LinkedIn | LinkedIn Marketing API | Alta — gratuita |
| YouTube | YouTube Data API | Alta — gratuita |
| TikTok | TikTok Business API | Média — mais restrita |
| X/Twitter | X API v2 | Baixa — plano pago |

Dados atualizados a cada 24h ou ao clicar "Atualizar agora".

**Métricas consolidadas no topo:**
- Seguidores totais (soma de todas as redes)
- Engajamento médio (ponderado)
- Posts publicados no período
- Redes ativas

**Filtro de tempo:** Últimos 7 dias · Este mês · Mês anterior · Trimestre · Semestre · Ano · Personalizado

**Comparativo automático** com período anterior e mesmo período do ano anterior.

**Calendário editorial:**
- Criar post manual: título, legenda, rede(s), data/hora, formato, status, upload de imagem/vídeo
- Criar post via IA — as duas opções sempre disponíveis
- Clicar em post existente: editar, mudar status, ver métricas se publicado, duplicar
- Visualizações: Mensal · Semanal · Lista

**Relatório mensal automático:**
- Gerado no último dia do mês
- Conteúdo: crescimento por rede, posts vs meta, top 3 posts, piores 3, engajamento médio, melhor dia/horário, recomendações da IA
- Exportável em PDF
- Notificação no Dashboard quando disponível
- Opção de receber por email

---

### 4.10 Atendimento & Tickets

**Conceito:** módulo de chamados internos e externos com controle completo.

**Tipos de ticket:**
- **Externo** — aberto por clientes (suporte, dúvidas, problemas). Vinculado ao cliente no CRM
- **Interno** — demandas internas (financeiro, TI, administrativo, processos)

**Campos do ticket:**
- Título, descrição, tipo (externo/interno), categoria, cliente vinculado (se externo)
- Responsável, prioridade (Baixa/Média/Alta), status, prazo estimado
- Histórico de comentários e atualizações

**Status:** Aberto · Em andamento · Aguardando cliente · Concluído

**Fluxo externo:**
- Cliente abre via formulário público com link único por empresa
- Equipe recebe na fila, atribui responsável, muda status
- Ticket aparece na timeline do cliente no CRM

**IA no módulo:**
- Sugerir resposta inicial
- Classificar automaticamente (tipo, categoria, prioridade)
- Resumir histórico de ticket longo

**Integração com Diretório:**
- Tickets internos podem apontar para SOPs do Diretório

---

### 4.11 Configurações

**Abas disponíveis:**

**Empresa** — nome, CNPJ, logo, segmento, porte, fuso horário, moeda padrão

**Minha Conta** — nome, foto, cargo, email, senha, preferências de notificação, tema

**Usuários & Permissões** — tabela editável de permissões por role + overrides por usuário + convites por email

**Plano & Financeiro** — plano atual, data de renovação, histórico de faturas, forma de pagamento, upgrade/downgrade, cancelamento com exportação de dados

**Uso de IA** — créditos consumidos, histórico por módulo, barra de progresso, compra de créditos extras, configuração do assistente (tom, contexto fixo da empresa, idioma)

**Integrações** — todas as integrações por categoria com status e botão conectar/desconectar

**Notificações** — configurar por evento e por canal (app/email) + horário de silêncio

**Dados & Privacidade** — exportar dados, logs de acesso, histórico de auditoria, excluir conta

**Aparência** — tema Dark/Light/Automático, cor de destaque customizável (cor da marca)

**API** — (Pro e Equipe) gerar e revogar API Keys, documentação, logs de uso, rate limits

---

### 4.12 API Aberta

**Disponível em:** planos Pro e Equipe

**Autenticação:** Bearer Token (API Key gerada nas Configurações)

**Endpoints principais:**

| Recurso | Métodos |
|---|---|
| Leads | GET, POST, PUT, DELETE |
| Clientes | GET, POST, PUT |
| Tarefas | GET, POST, PUT |
| KPIs | GET, POST |
| Contatos | GET, POST |
| Webhooks | Configurar gatilhos |

**Webhooks disponíveis:**
- lead.criado · lead.etapa_alterada · lead.convertido
- cliente.criado · cliente.atualizado · nps.registrado
- ticket.criado · ticket.status_alterado
- meta.atingida

**Rate limiting por plano:**
- Pro: 1.000 requisições/dia
- Equipe: 5.000 requisições/dia

**Documentação pública:** `docs.comercialpme.com.br`

**Casos de uso:**
- ERP puxa clientes do CRM automaticamente
- E-commerce envia pedidos para módulo de clientes
- Sistema financeiro atualiza status de pagamentos
- Zapier/Make conectam com centenas de outras ferramentas

---

### 4.13 Painel Super Admin (Douglas)

**Acesso exclusivo** do login de criador — nível acima de qualquer Admin de empresa.

**Seções:**

**Editor de Conteúdo** — editar capítulos, tarefas, dicas e textos do Guia sem tocar no código

**Gestão de Empresas** — ver todas as contas cadastradas, plano, usuários ativos, última atividade, uso de IA

**Métricas da Plataforma:**
- DAU/MAU (usuários ativos diários/mensais)
- Módulos mais usados
- Taxa de conclusão do Guia
- Engajamento com IA por módulo
- Receita por plano (MRR)
- Churn da plataforma

**Feedbacks** — visualizar feedbacks enviados pelos usuários dentro do app

**Tickets de Suporte** — atender chamados de clientes diretamente

**Comunicação** — canal direto com clientes pela plataforma

---

## 5. Assistente IA — Comportamento Global

**Princípio:** IA contextual disponível em todos os módulos, com conhecimento do estado atual de cada página.

**Contexto injetado automaticamente por módulo:**
- Dashboard: métricas atuais do período selecionado
- CRM: leads por estágio, alertas de follow-up, pipeline total
- Prospecção: CNAE buscado, empresas encontradas, integrações ativas
- KPIs: valores atuais vs metas, o que está acima/abaixo
- Diagnóstico: SWOT, personas e score de maturidade cadastrados
- Redes: métricas de engajamento por plataforma
- Diretório: conteúdo do documento aberto

**Contexto fixo da empresa** (configurável em Configurações → Uso de IA):
- Campo de texto livre que sempre é injetado no system prompt
- Ex: "Somos uma consultoria B2B de agronegócio no interior de SP com 3 vendedores"

**Contagem de ações:** cada mensagem enviada ao assistente = 1 ação consumida

**Modelos:**
- Haiku → ações simples (gerar post, script curto, resposta rápida)
- Sonnet → análises complexas (diagnóstico, relatório, benchmark)

---

## 6. Fluxo Principal do Produto

```
1. Usuário se cadastra → escolhe plano
2. Onboarding guiado → preenche contexto da empresa
3. Guia Estratégico → capítulo por capítulo, tarefas abrem ferramentas direto
4. Diagnóstico alimentado → SWOT, personas, 4Ps
5. CRM configurado → funis, etapas, campos personalizados
6. Prospecção ativa → busca por CNAE → Régua → CRM quando interesse
7. KPIs e metas definidos → Dashboard personalizado
8. Redes sociais conectadas → calendário editorial
9. Diretório preenchido → processos, senhas, templates
10. IA contextual em todo momento → quanto mais dados, mais útil
```

---

## 7. Roadmap de Fases

**Fase 1 — MVP funcional** *(atual)*
- Layout + Design System
- Autenticação e permissões
- Dashboard com dados mockados
- CRM com kanban
- Assistente IA funcionando

**Fase 2 — Conteúdo e métricas**
- Guia Estratégico com conteúdo real
- KPIs & Metas
- Diagnóstico (SWOT + personas + score)

**Fase 3 — Prospecção e comunicação**
- Prospecção Ativa com API Receita Federal
- Integrações Hunter.io e Apollo.io
- Régua de Comunicação com steps manuais e automáticos

**Fase 4 — Organização**
- Diretório Interno com upload de arquivos
- Redes Sociais com OAuth e calendário editorial

**Fase 5 — Persistência real**
- Backend Node.js + banco de dados (Supabase ou PostgreSQL)
- Autenticação real (substituir mock)
- Multi-tenancy (isolamento de dados por empresa)

**Fase 6 — Monetização e escala**
- Sistema de planos e cobrança (Stripe)
- Controle de créditos de IA por plano
- API aberta com documentação
- Painel Super Admin
- Módulo de Tickets
- Relatório mensal automático de Redes Sociais

**Fase 7 — Integrações avançadas**
- OAuth com Instagram, Facebook, LinkedIn, YouTube
- Integração com Resend/Mailchimp para régua de email
- WhatsApp Business API (Nível 1: click-to-chat + registro de contatos)
- Webhooks da API aberta

---

## 8. Decisões Técnicas Registradas

| Decisão | Escolha | Motivo |
|---|---|---|
| Frontend | React 18 + Vite | Performance + ecossistema |
| Estilo | Tailwind CSS + variáveis CSS | Flexibilidade + tema dark/light |
| Estado | Context API + localStorage (MVP) | Simplicidade no MVP |
| Estado (produção) | Supabase ou PostgreSQL | Multi-tenancy + real-time |
| IA | Anthropic API (Haiku + Sonnet) | Qualidade + custo controlável |
| Auth MVP | Mock com localStorage | Velocidade de desenvolvimento |
| Auth produção | JWT + refresh tokens | Segurança |
| Deploy | Vercel | Simplicidade + CDN |
| Pagamentos | Stripe | Padrão de mercado |
| Email transacional | Resend | Gratuito até 3k/mês |
| API docs | Docusaurus ou Mintlify | Fácil manutenção |

---

## 9. Glossário de Termos

| Termo | Definição |
|---|---|
| Ação de IA | Cada interação do usuário com o assistente (1 mensagem = 1 ação) |
| Lead | Empresa/pessoa em processo de prospecção no pipeline |
| Cliente | Lead convertido — já fechou negócio |
| Funil | Sequência de etapas que um lead percorre até virar cliente |
| SOP | Standard Operating Procedure — processo documentado passo a passo |
| NPS | Net Promoter Score — métrica de satisfação do cliente (0-10) |
| CAC | Custo de Aquisição de Cliente |
| LTV | Lifetime Value — valor total que um cliente gera ao longo do tempo |
| Régua | Sequência automatizada de comunicações para nutrir leads |
| OKR | Objectives and Key Results — framework de metas |
| Benchmark | Comparativo com médias do mercado/setor |
| Override | Permissão customizada por usuário que sobrescreve o padrão da role |
| Tenant | Cada empresa cliente isolada no sistema (multi-tenancy) |
