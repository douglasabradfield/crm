import { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, CheckCircle2, Circle, ChevronDown, Bot, Trophy,
  Target, Zap, Users, TrendingUp, BarChart2, Megaphone,
  LayoutDashboard, Star, Clock, ArrowRight, Lightbulb, List,
  Pencil, X, Plus, GripVertical, Trash2, RotateCcw, Shield, Save,
  Send, MapPin, Search,
} from 'lucide-react';
import { useUI } from '../store/index.js';
import { useAuth } from '../store/auth.js';
import { useCRM } from '../store/crm.js';
import { GUIA_CHAPTERS } from '../data/guia-chapters.js';
import { supabase } from '../services/supabase.js';
import { saveGuiaDoc, fetchGuiaDocTaskIds } from '../services/diretorio.js';
import SkeletonLoader from '../components/UI/SkeletonLoader.jsx';

/* ─── Guia edit context (avoids prop-drilling 4 levels deep) ─────────────────── */
const GuiaCtx = createContext(null);

/* ─── Visual config per chapter ──────────────────────────────────────────────── */
const CAP_META = {
  c0: {
    icon: BookOpen, color: '--accent', tempo: '30 min', acoes: 5,
    dica: 'Não pule esta etapa. Entender onde você está agora torna todo o guia mais relevante para o seu caso específico.',
    aiPrompt: 'Quais são os sinais mais comuns de que uma PME está crescendo sem estrutura comercial? Como identificar os pontos de travamento em negócios que faturam entre R$200k e R$2M por ano?',
  },
  c1: {
    icon: Target, color: '--teal', tempo: '90 min', acoes: 6,
    dica: 'Faça a SWOT com dados, não com opinião. O que clientes reclamam? O que concorrentes fazem melhor? Isso vale mais do que o que você acha.',
    aiPrompt: 'Me ajude a fazer um diagnóstico comercial rápido. Quais perguntas devo responder para preencher cada quadrante da SWOT com dados reais, incluindo como identificar as personas principais da minha empresa?',
  },
  c2: {
    icon: LayoutDashboard, color: '--purple', tempo: '60 min', acoes: 5,
    dica: 'Meta sem prazo é sonho. Prazo sem meta é correria. Um plano de 90 dias bem executado vale mais do que um plano de 5 anos muito detalhado.',
    aiPrompt: 'Crie 3 metas SMART para o departamento comercial de uma PME B2B de serviços que fatura R$1,5M ao ano e quer crescer 30% nos próximos 12 meses. Inclua o que medir, como medir e o prazo.',
  },
  c3: {
    icon: Megaphone, color: '--amber', tempo: '45 min', acoes: 5,
    dica: 'Antes de contratar, crie o template. Quando a pessoa entrar, ela terá um padrão claro — e você saberá rapidamente se está entregando bem.',
    aiPrompt: 'Como montar uma equipe mínima de marketing para uma PME B2B sem estourar o orçamento? O que terceirizar para freelancers e o que manter interno? Dê valores de referência atuais do mercado.',
  },
  c4: {
    icon: Users, color: '--green', tempo: '60 min', acoes: 6,
    dica: 'Quando todo mundo vende um pouco, ninguém vende direito. Mesmo com uma pessoa só no comercial, defina papéis claros por horário ou dia da semana.',
    aiPrompt: 'Como estruturar o processo de vendas B2B dividindo as funções de SDR, closer e CS? Dê exemplos práticos de como uma pessoa pode acumular dois papéis sem perder eficiência e foco.',
  },
  c5: {
    icon: Star, color: '--red', tempo: '45 min', acoes: 5,
    dica: 'Consistência de marca não é sobre ser perfeito — é sobre ser reconhecível. Três adjetivos de tom de voz bem definidos evitam 90% dos problemas de comunicação inconsistente.',
    aiPrompt: 'Me ajude a criar o posicionamento de marca de uma empresa B2B de serviços para PMEs. Gere a frase de posicionamento, defina 3 adjetivos de tom de voz e sugira os 2 canais prioritários para o público.',
  },
  c6: {
    icon: Zap, color: '--teal', tempo: '60 min', acoes: 6,
    dica: 'A melhor ferramenta é a que o time usa de verdade. Comece com ferramentas gratuitas, valide o processo e só então migre para opções pagas.',
    aiPrompt: 'Sugira um stack de ferramentas gratuitas ou de baixo custo para uma PME de serviços B2B estruturar a operação de marketing e vendas. Inclua CRM, gestão de conteúdo, automação e análise.',
  },
  c7: {
    icon: TrendingUp, color: '--amber', tempo: '60 min', acoes: 6,
    dica: 'Cinco KPIs que o time acompanha toda semana valem mais que 30 em um dashboard que ninguém lê. Comece pelo mínimo e expanda quando fizer sentido.',
    aiPrompt: 'Quais são os 5 KPIs mais importantes para um departamento comercial de PME? Para cada um, explique como calcular, qual é a meta de referência do mercado e o que fazer quando está abaixo da meta.',
  },
  c8: {
    icon: BarChart2, color: '--accent', tempo: '45 min', acoes: 6,
    dica: 'Crescimento sustentável começa quando marketing, vendas e comunicação compartilham as mesmas metas e a mesma linguagem. Alinhe antes de escalar.',
    aiPrompt: 'Como criar alinhamento entre marketing, vendas e comunicação em uma PME em crescimento? Sugira a estrutura de uma reunião semanal tripartite de 30 minutos e como medir se o alinhamento está funcionando.',
  },
  'c-icp': {
    icon: Target, color: '--teal', tempo: '60 min', acoes: 3,
    dica: 'Quem você não quer atender é tão importante quanto quem você quer. Um ICP bem definido elimina desperdício de tempo em leads que nunca vão fechar.',
    aiPrompt: 'Me ajude a definir o Perfil de Cliente Ideal (ICP) para uma PME B2B de serviços. Quais critérios firmográficos e comportamentais devo usar? Como identificar o decisor e qual dor principal meu produto resolve melhor?',
  },
  'c-prospeccao': {
    icon: Search, color: '--green', tempo: '60 min', acoes: 3,
    dica: 'Prospecção consistente é mais valiosa do que prospecção intensa. Reserve blocos fixos na agenda — 30 minutos por dia valem mais que 4 horas uma vez por mês.',
    aiPrompt: 'Como montar uma cadência de prospecção ativa B2B para uma PME de serviços? Inclua roteiro de primeiro contato, sequência de follow-ups e como qualificar rapidamente um lead antes de investir mais tempo.',
  },
};

/* ─── Task action buttons ────────────────────────────────────────────────────── */
const TASK_ACTIONS = {
  'c1-1': { label: 'Abrir SWOT',       to: '/diagnostico' },
  'c1-2': { label: 'Criar persona',    to: '/diagnostico' },
  'c1-3': { label: 'Ver funil',        to: '/crm'         },
  'c1-4': { label: 'Abrir 4Ps',        to: '/diagnostico' },
  'c1-6': { label: 'Ver concorrentes', to: '/diagnostico' },
  'c2-1': { label: 'Configurar metas', to: '/kpis'        },
  'c2-2': { label: 'Ver KPIs',         to: '/kpis'        },
  'c3-5': { label: 'Abrir Diretório',  to: '/diretorio'   },
  'c6-4': { label: 'Ir para CRM',      to: '/crm'         },
  'c7-1': { label: 'Ir para KPIs',     to: '/kpis'        },
  'c-icp-2': { label: 'Abrir CRM',    to: '/crm'         },
  'c-prospeccao-2': { label: 'Rever meu ICP', to: '/diagnostico' },
};

/* ─── Auto-detect item IDs ───────────────────────────────────────────────────── */
// Tarefas cujo estado é sempre derivado do banco — nunca gravado como marcação manual (ver buildAutoChecked).
const AUTO_DETECT_IDS = new Set(['c1-1', 'c1-2', 'c1-3', 'c1-4', 'c1-6', 'c2-1', 'c2-2', 'c3-5', 'c4-1', 'c5-4', 'c6-4', 'c7-1', 'c-icp-3']);

// Texto do tooltip do ícone de raio — explica qual dado real dispara a detecção automática.
const AUTO_DETECT_DESC = {
  'c1-1':     'Marcada automaticamente quando sua SWOT tiver itens cadastrados no Diagnóstico.',
  'c1-2':     'Marcada automaticamente quando houver personas cadastradas no Diagnóstico.',
  'c1-3':     'Marcada automaticamente quando houver um funil de vendas ou leads cadastrados no CRM.',
  'c1-4':     'Marcada automaticamente quando os 4Ps (ou 6Ps) estiverem preenchidos no Diagnóstico.',
  'c1-6':     'Marcada automaticamente quando houver concorrentes cadastrados no Diagnóstico.',
  'c2-1':     'Marcada automaticamente quando houver metas ou KPIs cadastrados.',
  'c2-2':     'Marcada automaticamente quando o orçamento de marketing estiver definido.',
  'c3-5':     'Marcada automaticamente quando o organograma de marketing estiver salvo no Diretório.',
  'c4-1':     'Marcada automaticamente quando houver um funil de vendas ou leads cadastrados no CRM.',
  'c5-4':     'Marcada automaticamente quando o guia de marca estiver salvo no Diretório.',
  'c6-4':     'Marcada automaticamente quando houver leads cadastrados no CRM.',
  'c7-1':     'Marcada automaticamente quando houver pelo menos 3 KPIs cadastrados.',
  'c-icp-3':  'Marcada automaticamente quando o Perfil de Cliente Ideal (ICP) estiver preenchido.',
};

/* ─── Three layers per task ──────────────────────────────────────────────────── */
const TASK_LAYERS = {
  /* ── Introdução ── */
  'c0-missao': {
    porque: 'A missão é a base de tudo. Sem saber por que sua empresa existe, as decisões de venda, comunicação e contratação ficam sem direção. É a primeira coisa que dá clareza ao negócio.',
    como: '1. Responda em uma frase: por que sua empresa existe, além de gerar dinheiro?\n2. Pense no problema que você resolve para o cliente.\n3. Evite texto corporativo — escreva como você explicaria para um amigo.',
  },
  'c0-visao': {
    porque: 'A visão é o destino. Ela orienta para onde crescer e ajuda a decidir o que priorizar hoje para chegar lá em alguns anos.',
    como: '1. Imagine sua empresa daqui a 3 anos: tamanho, reconhecimento, tipo de cliente.\n2. Escreva uma frase que descreva esse futuro de forma concreta.\n3. Deve ser ambiciosa, mas possível.',
  },
  'c0-valores': {
    porque: 'Os valores guiam as decisões do dia a dia e o comportamento da equipe — especialmente quando você não está presente para decidir. São o filtro de como a empresa age.',
    como: '1. Liste de 3 a 5 princípios inegociáveis do seu negócio.\n2. Pense em situações reais: como você espera que sua equipe trate um cliente difícil?\n3. Use palavras ou frases curtas (ex: honestidade, agilidade, respeito ao tempo do cliente).',
  },
  'c0-1': {
    porque: 'Sem saber qual é o gargalo principal, você investe nas soluções erradas. A maioria das PMEs perde meses em múltiplas frentes antes de focar no problema real.',
    como: '1. Liste os 3 maiores problemas do seu comercial hoje.\n2. Pergunte para 2 clientes: "O que poderia ser melhor?"\n3. Identifique onde perde mais negócios: atração, conversão ou retenção?',
  },
  'c0-2': {
    porque: 'Uma meta bem definida organiza todas as decisões seguintes. Com ela, você sabe quando priorizar o quê — e quando dizer não.',
    como: '1. Escolha UMA métrica: receita, leads ou novos clientes.\n2. Adicione um número: "+20%", "+10 clientes", "R$50k".\n3. Defina o prazo: "até 30 de setembro".\n4. Escreva em um lugar visível da empresa.',
  },
  'c0-3': {
    porque: 'Marketing sem orçamento definido leva a decisões ad hoc que consomem mais do que planejado. Saber o teto libera criatividade dentro de limites reais.',
    como: '1. Calcule 5% e 10% do faturamento médio mensal.\n2. Decida: freelancers (mais flexível) ou CLT (mais dedicado).\n3. Reserve pelo menos 3 meses de budget antes de começar qualquer ação.',
  },
  'c0-4': {
    porque: 'Provavelmente alguém da equipe já tem habilidades comerciais não usadas. Ativar isso custa zero e cria senso de ownership imediato.',
    como: '1. Faça uma lista de toda a equipe.\n2. Para cada pessoa: "Poderia ajudar com _____ X horas por semana".\n3. Defina quem vai coordenar o comercial — pode ser você por enquanto.',
  },
  'c0-5': {
    porque: 'A razão número 1 pela qual PMEs não evoluem o comercial é falta de tempo intencional. Uma hora semanal bloqueada é suficiente para completar este guia em 2 meses.',
    como: '1. Abra agora a sua agenda.\n2. Bloqueie um horário fixo toda semana (ex: segunda às 9h).\n3. Nomeie o bloco "Guia Comercial" e marque como prioridade A — não cancele.',
  },

  /* ── Cap 1 ── */
  'c1-1': {
    porque: 'Decisões baseadas em opiniões costumam errar por ignorar evidências objetivas. A SWOT força você a olhar o negócio com dados — não com esperança.',
    como: '1. Acesse o módulo Diagnóstico → aba SWOT.\n2. Liste 3 itens reais em cada quadrante usando dados concretos.\n3. Priorize 1 oportunidade e 1 ameaça para trabalhar no próximo trimestre.',
  },
  'c1-2': {
    porque: 'Marketing para "todo mundo" não converte ninguém. Com personas claras, cada mensagem, canal e oferta fica apontada para quem realmente compra.',
    como: '1. Acesse Diagnóstico → aba Personas.\n2. Para cada persona: nome fictício, cargo, dor principal, como decide a compra.\n3. Valide com pelo menos 1 cliente real antes de finalizar.',
  },
  'c1-3': {
    porque: 'Sem mapear o funil, você trata sintomas e não causas. Saber onde os leads somem revela o gargalo real da operação comercial.',
    como: '1. Acesse o CRM → Pipeline.\n2. Identifique as etapas informais do seu processo atual (interesse → proposta → fechamento).\n3. Configure as etapas no kanban e posicione os leads atuais corretamente.',
  },
  'c1-4': {
    porque: 'Os 4Ps revelam qual alavanca tem mais impacto imediato. Na maioria das PMEs, o gap está em Promoção ou Praça — não no Produto.',
    como: '1. Para cada P, anote o estado atual e o estado ideal.\n2. Identifique qual P tem a maior diferença entre atual e ideal.\n3. Trate esse P como prioridade nos próximos 30 dias.',
  },
  'c1-5': {
    porque: 'Clientes sabem por que compraram de você — mas raramente você pergunta. Esse feedback afina o posicionamento e revela padrões de conversão que você não veria de outra forma.',
    como: '1. Escolha 3 clientes satisfeitos.\n2. Mensagem: "Tenho 10 minutos para uma conversa rápida sobre sua experiência?"\n3. Perguntas-chave: Por que escolheu a gente? O que poderia ser melhor? Indicaria para alguém?',
  },
  'c1-6': {
    porque: 'Você não concorre no vácuo. Saber o que concorrentes oferecem revela onde você pode se diferenciar sem guerra de preço.',
    como: '1. Para cada concorrente: pesquise site, preços públicos, redes sociais e avaliações no Google.\n2. Identifique 1 coisa que eles fazem melhor e 1 que você faz melhor.\n3. Use essa análise para refinar sua proposta de valor.',
  },

  /* ── Cap 2 ── */
  'c2-1': {
    porque: 'Sem metas claras, toda semana é improvisação. Metas SMART criam accountability e permitem ajustes baseados em dados, não em feeling.',
    como: '1. Acesse KPIs & Metas → Configure suas metas.\n2. Para cada meta: número + prazo + responsável.\n3. Coloque as metas visíveis para toda a equipe — não apenas no sistema.',
  },
  'c2-2': {
    porque: 'Sem orçamento definido, marketing é sempre o primeiro gasto cortado na crise. Definir % do faturamento cria previsibilidade e disciplina financeira.',
    como: '1. Calcule 7% do faturamento médio dos últimos 3 meses.\n2. Divida: 40% conteúdo, 40% mídia paga, 20% ferramentas.\n3. Trate como custo fixo — não como gasto variável.',
  },
  'c2-3': {
    porque: 'Quem planeja por semana fica apagando incêndio. Um cronograma de 90 dias permite alocar recursos com antecedência e sair do modo reativo.',
    como: '1. Liste as 10 ações mais importantes do próximo trimestre.\n2. Distribua nos meses (máx 3-4 ações por mês).\n3. Atribua responsável e data-limite para cada uma.\n4. Revise a cada 2 semanas.',
  },
  'c2-4': {
    porque: 'Escalar antes de ter PMF é jogar gasolina em um motor que não funciona direito. Cada real em marketing amplifica o que já existe — bom ou ruim.',
    como: '1. Envie para 5 clientes ativos: "Se nossa solução deixasse de existir, o que você faria?"\n2. Se a maioria diz que seria muito complicado, você tem PMF.\n3. Colete 2 ou 3 depoimentos em texto ou vídeo agora.',
  },
  'c2-5': {
    porque: 'Sem data agendada, a revisão vira intenção — e intenção não muda o negócio. Uma data fixa cria compromisso com o processo de melhoria contínua.',
    como: '1. Abra a agenda agora.\n2. Evento recorrente a cada 90 dias: "Revisão Trimestral Comercial".\n3. Pauta fixa: o que funcionou, o que não funcionou, o que muda no próximo trimestre.',
  },

  /* ── Cap 3 ── */
  'c3-1': {
    porque: 'Sem papéis definidos, as tarefas ficam com quem "tem tempo" — que nunca é ninguém. Clareza de papel é o primeiro passo para accountability em equipes pequenas.',
    como: '1. Liste todas as tarefas de marketing que precisam ser feitas.\n2. Agrupe em: estratégia, produção de conteúdo e distribuição/análise.\n3. Decida: cada função será interna, freelancer ou acumulada?',
  },
  'c3-2': {
    porque: 'Tentar fazer tudo internamente limita a velocidade de crescimento. Um freelancer certo, bem briefado, pode triplicar a produção com custo controlado.',
    como: '1. Escreva o briefing: o que a pessoa vai fazer, frequência, critério de sucesso.\n2. Poste no Workana, 99Freelas ou LinkedIn.\n3. Entreviste 3 candidatos — peça um teste pago pequeno antes de contratar.',
  },
  'c3-3': {
    porque: 'Templates eliminam retrabalho e garantem consistência. Cada conteúdo produzido fica 3x mais rápido quando existe um modelo claro para seguir.',
    como: '1. Crie template de post de feed: gancho + desenvolvimento + CTA.\n2. Crie template de story: 3 slides — problema + solução + prova social.\n3. Crie template de e-mail de nurturing: assunto + personalização + valor + CTA.',
  },
  'c3-4': {
    porque: 'Sem métricas, você gerencia pela impressão — e isso leva a conflitos e decisões erradas. Cada papel precisa de um número-chave que mostre se está funcionando.',
    como: '1. Para cada função: defina 1 métrica de resultado (ex: conversão) e 1 de atividade (ex: posts/semana).\n2. Configure no painel de KPIs.\n3. Revise mensalmente com a pessoa responsável.',
  },
  'c3-5': {
    porque: 'Mesmo com 2 pessoas, o organograma define quem decide o quê e evita sobreposições. Freelancers com papel claro entregam muito melhor do que os com papel vago.',
    como: '1. Crie um documento "Organograma de Marketing" no Diretório Interno.\n2. Liste cada função com: responsável, entregas, frequência e a quem reporta.\n3. Compartilhe com todos os envolvidos antes de qualquer nova contratação.',
  },

  /* ── Cap 4 ── */
  'c4-1': {
    porque: 'Sem o funil mapeado, cada vendedor inventa o próprio processo. Isso cria resultados imprevisíveis e impossíveis de replicar ou escalar.',
    como: '1. Acesse o CRM → Pipeline.\n2. Liste cada etapa real do processo (prospecção → qualificação → proposta → negociação → fechamento).\n3. Configure as etapas e defina o critério de avanço de cada uma.',
  },
  'c4-2': {
    porque: 'Confundir prospecção com fechamento cria o vendedor que está sempre tentando fechar — mas nunca alimenta o topo do funil. A divisão clara resolve isso.',
    como: '1. Decida: quem (ou você em que horário) faz prospecção ativa e quem faz apresentações?\n2. Bloqueie os horários de cada função na agenda.\n3. Crie scripts separados para cada etapa do processo.',
  },
  'c4-3': {
    porque: 'Follow-up manual é esquecido. Automação garante que nenhum lead fique sem contato — aumentando a conversão sem aumentar o trabalho.',
    como: '1. Escolha a ferramenta: WhatsApp Business ou e-mail (Mailchimp free).\n2. Configure 3 mensagens: D+1 após primeiro contato, D+7 sem resposta, D+30 lead frio.\n3. Teste você mesmo antes de ativar para o time.',
  },
  'c4-4': {
    porque: 'BANT em 5 perguntas economiza horas em reuniões com leads que nunca vão fechar. Qualificar bem é respeitar o tempo de todos.',
    como: '1. Escreva as 5 perguntas BANT adaptadas para o seu negócio: budget, autoridade, necessidade, prazo.\n2. Coloque no script de pré-venda.\n3. Treine qualquer pessoa que faça contato inicial com leads.',
  },
  'c4-5': {
    porque: 'Sem comissão clara por escrito, o time de vendas fica desmotivado ou negocia informal. A política precisa existir antes da primeira venda para evitar conflitos.',
    como: '1. Defina: base fixa + % sobre faturamento (bruto ou líquido).\n2. Estabeleça quando paga: D+30 do fechamento ou após recebimento.\n3. Documente no Diretório e faça todo vendedor assinar.',
  },
  'c4-6': {
    porque: 'O cliente mais fácil de vender é o que já comprou. Um check-in em D+7 reduz churn e cria a relação que gera indicações — a fonte mais barata de novos leads.',
    como: '1. Crie tarefa no CRM para cada novo cliente: "Check-in D+7".\n2. Script: "Tudo certo com a entrega? Alguma dúvida ou como posso ajudar?"\n3. Repita em D+30 e D+90 com perguntas sobre resultados obtidos.',
  },

  /* ── Cap 5 ── */
  'c5-1': {
    porque: 'Sem posicionamento claro, cada vendedor explica o produto de um jeito diferente — e o cliente não sabe por que escolher você. Uma frase clara alinha todo o comercial.',
    como: '1. Complete: "Somos a única [categoria] que [benefício único] para [público específico]".\n2. Teste com 3 pessoas: entendem na primeira leitura?\n3. Use em todas as bio de redes sociais, assinatura de e-mail e site.',
  },
  'c5-2': {
    porque: 'Tom de voz é o que faz a marca ser reconhecível mesmo sem o logo. Três adjetivos são o filtro mais simples e eficaz para qualquer conteúdo produzido.',
    como: '1. Escolha 3 adjetivos que descrevem como você quer soar (ex: direto, empático, especialista).\n2. Para cada adjetivo: 1 exemplo dentro do tom e 1 fora.\n3. Compartilhe com todos que produzem conteúdo.',
  },
  'c5-3': {
    porque: 'Tentar estar em todo lugar com pouco recurso resulta em presença ruim em tudo. Dois canais com consistência convertem muito mais do que cinco irregulares.',
    como: '1. Liste onde seu cliente ideal realmente passa o tempo (pesquise, não adivinhe).\n2. Escolha os 2 canais com melhor ROI para o seu público.\n3. Archive ou desative os canais sem postagem consistente nos últimos 60 dias.',
  },
  'c5-4': {
    porque: 'Toda vez que alguém novo entra, você repete os mesmos briefings de identidade visual. Um guia de 1 página elimina isso de uma vez por todas.',
    como: '1. Use o Canva para criar 1 página: logo (versões), cores (hex), fontes, tom de voz, exemplos correto e incorreto.\n2. Salve em PDF no Diretório Interno.\n3. Envie para todos que produzem conteúdo.',
  },
  'c5-5': {
    porque: 'Consistência constrói audiência. Algoritmos e públicos respondem melhor a publicação constante, mesmo que menos frequente — irregularidade destrói engajamento.',
    como: '1. Decida o mínimo sustentável sem depender de inspiração (ex: 3x/semana no Instagram).\n2. Bloqueie tempo de produção na agenda.\n3. Crie um buffer de 2 semanas de conteúdo aprovado antes de publicar.',
  },

  /* ── Cap 6 ── */
  'c6-1': {
    porque: 'Sem estrutura de pastas organizada, arquivos se perdem e versões se multiplicam. Um Drive bem organizado é a base de qualquer operação em crescimento.',
    como: '1. Crie pastas: Marketing / Vendas / Clientes / Financeiro / Equipe.\n2. Mova todos os arquivos soltos para as pastas corretas.\n3. Compartilhe com a equipe e defina permissões de edição por área.',
  },
  'c6-2': {
    porque: 'WhatsApp Business separa vida pessoal do profissional e tem recursos críticos: catálogo, respostas rápidas e estatísticas básicas que o app pessoal não tem.',
    como: '1. Baixe o app com um número dedicado ao negócio.\n2. Preencha o perfil: foto, descrição, endereço, horário de atendimento.\n3. Configure mensagem de ausência e boas-vindas.\n4. Adicione catálogo de produtos ou serviços.',
  },
  'c6-3': {
    porque: 'Calendário editorial na cabeça de uma pessoa vira gargalo. Quando está em ferramenta compartilhada, qualquer membro da equipe pode colaborar sem depender de ninguém.',
    como: '1. Crie um board no Trello: Ideias / Em produção / Aprovação / Publicado.\n2. Mova todas as ideias de conteúdo para o Trello imediatamente.\n3. Planeje as próximas 4 semanas com antecedência.',
  },
  'c6-4': {
    porque: 'CRM não é luxo — é a memória da empresa. Sem ele, quando o vendedor sai, a relação com os leads vai junto. Com CRM, o processo continua independente de quem executa.',
    como: '1. Acesse o CRM neste sistema.\n2. Cadastre todos os leads e clientes atuais (mesmo que estejam em planilha).\n3. Configure as etapas do pipeline conforme o seu processo real de vendas.',
  },
  'c6-5': {
    porque: 'Sem rotina, as tarefas mais importantes sempre perdem para as urgentes. Uma rotina fixa separa operações de crescimento de operações de apagar incêndio.',
    como: '1. Bloqueie na agenda: 30 min/dia para CRM + 1h/dia para conteúdo + 2h/semana para análise.\n2. Crie checklist diário de 5 tarefas fixas do comercial.\n3. Revise o checklist toda semana e elimine o que não funciona.',
  },
  'c6-6': {
    porque: 'Automações fazem o trabalho repetitivo funcionar enquanto você dorme. Uma automação bem configurada pode economizar 30 min por dia — o equivalente a uma semana de trabalho por ano.',
    como: '1. Crie conta gratuita no Zapier (zapier.com).\n2. Comece com: "formulário do site → cria lead no CRM → notifica vendedor".\n3. Teste 3 vezes antes de ativar em produção.',
  },

  /* ── Cap 7 ── */
  'c7-1': {
    porque: 'KPI que todo mundo conhece mas ninguém acompanha não serve. Cinco indicadores monitorados toda semana são mais poderosos do que 30 em um relatório mensal.',
    como: '1. Acesse KPIs & Metas neste sistema.\n2. Configure 5 KPIs da tabela: leads, fechamento, CAC, churn e NPS.\n3. Defina meta e prazo para cada.\n4. Atribua um responsável por monitorar cada indicador.',
  },
  'c7-2': {
    porque: 'Sem Analytics, você não sabe de onde vem o tráfego, o que os visitantes fazem nem onde saem. É impossível otimizar o que não se mede.',
    como: '1. Acesse analytics.google.com e crie a propriedade GA4.\n2. Instale o código no site (via GTM ou direto no HTML).\n3. Aguarde 48h para dados aparecerem.\n4. Configure 1 conversão: formulário preenchido ou clique no WhatsApp.',
  },
  'c7-3': {
    porque: 'Relatório mensal cria o hábito de olhar para trás antes de decidir o próximo mês. Sem esse ritual, as mesmas decisões ruins se repetem por falta de evidência.',
    como: '1. Crie uma planilha: KPI / Meta / Realizado / Variação / Plano de ação.\n2. Preencha no 1º dia de cada mês com os dados do mês anterior.\n3. Compartilhe com sócios e equipe antes de qualquer reunião mensal.',
  },
  'c7-4': {
    porque: 'CAC elevado sem perceber é um dos maiores matadores de caixa em PMEs. Comparar CAC com LTV revela se o modelo de negócio é escalável ou está queimando dinheiro.',
    como: '1. Some gastos de marketing e vendas do último mês (salários + ferramentas + mídia).\n2. Divida pelo número de novos clientes do período.\n3. Compare: se CAC > LTV/3, você precisa reduzir custo de aquisição urgente.',
  },
  'c7-5': {
    porque: 'LTV é o quanto um cliente vale durante toda a relação — não apenas na primeira compra. Alto LTV permite CACs mais altos e vencer concorrentes que não olham esse número.',
    como: '1. Fórmula: ticket médio × compras por mês × meses de retenção.\n2. Calcule para seus 10 melhores clientes.\n3. Verifique: LTV ÷ CAC ≥ 3? Se não, o problema é retenção ou custo de aquisição.',
  },
  'c7-6': {
    porque: 'Tratar todos os KPIs ruins ao mesmo tempo dispersa energia e gera pouco resultado. Identificar o gargalo principal e focar nele por 30 dias é mais eficaz.',
    como: '1. Abra o relatório de KPIs — qual está mais longe da meta?\n2. Escreva a hipótese de causa em 1 frase.\n3. Defina 1 experimento de 30 dias para testar.\n4. Documente antes e depois para aprender com o resultado.',
  },

  /* ── Cap c-icp ── */
  'c-icp-1': {
    porque: 'A maioria das pequenas empresas perde vendas não por falta de interessados, mas por não acompanhar quem demonstrou interesse. Um lead anotado é uma venda possível; um lead esquecido é dinheiro que foi embora sem você perceber.',
    como: 'Pense nos últimos contatos que você recebeu esta semana — mensagens, ligações, indicações. Cada um deles era um lead. A partir de agora, todo contato novo entra no seu funil em vez de ficar solto. Não precisa de ferramenta nova: precisa de hábito.',
  },
  'c-icp-2': {
    porque: 'Sem uma porta de entrada definida, os contatos se espalham e você perde a noção de quantas oportunidades tem em aberto. Uma etapa inicial clara é o que transforma uma pilha de mensagens numa lista de oportunidades organizada.',
    como: 'Abra seu CRM e verifique se existe uma primeira etapa para novos contatos (algo como \'Lead\', \'Novo contato\' ou \'Primeiro contato\'). Se não tiver, crie. Todo lead novo começa por aí. Ainda não tem seu funil definido? Não se preocupe: mais pra frente no guia você vai aprender a montá-lo. Por ora, só guarde a ideia de que a primeira etapa deve ser pensada para o lead.',
  },
  'c-icp-3': {
    porque: 'Saber quem é seu cliente ideal faz você gastar tempo e dinheiro com quem realmente tem chance de comprar — e não com todo mundo. É a diferença entre prospecção focada e esforço desperdiçado.',
    como: 'Preencha os campos pensando nos seus melhores clientes atuais: o que eles têm em comum? Que problema você resolve pra eles tão bem? Comece pelo que você já sabe de cabeça — não precisa preencher tudo de uma vez.',
  },

  /* ── Cap c-prospeccao ── */
  'c-prospeccao-1': {
    porque: 'Quem só espera o cliente chegar fica refém da sorte e da sazonalidade. Quem só vai atrás se cansa e não constrói reputação. As duas juntas se equilibram: a atração aquece sua marca ao longo do tempo, e a prospecção traz oportunidades quando você precisa delas agora.',
    como: 'Olhe seu negócio hoje. De onde vieram seus últimos 10 clientes? Se quase todos chegaram sozinhos (indicação, redes, busca), você depende de inbound e ganharia muito adicionando prospecção ativa. Se você vive correndo atrás e nunca sobra tempo, talvez precise fortalecer a atração. O objetivo é não depender de um só caminho.',
  },
  'c-prospeccao-2': {
    porque: 'Prospecção ativa começa por uma lista. Sem saber onde procurar, você prospecta quem aparece pela frente — e perde tempo com quem nunca vai comprar. Quanto mais alinhada sua lista estiver com o seu Cliente Ideal, mais conversa vira venda.',
    como: 'Volte ao seu ICP (lá no Diagnóstico) e pergunte: onde essas empresas estão? Pode ser mais simples do que parece — grupos de WhatsApp e associações do seu setor, feiras e eventos locais, perfis que seguem seus concorrentes, indicações de clientes atuais, listas de empresas da sua região. Escolha duas ou três fontes realistas para começar.',
  },
  'c-prospeccao-3': {
    porque: 'Prospecção não se aprende lendo, se aprende fazendo. A primeira leva, mesmo pequena, ensina o que funciona na sua realidade: qual abordagem gera resposta, qual horário, qual canal. Cinco contatos feitos valem mais que cinquenta planejados.',
    como: 'Pegue de 5 a 10 contatos da sua lista. Para cada um, escreva uma mensagem curta e honesta: quem é você, por que está falando com aquela empresa especificamente (mostre que não é mensagem em massa) e uma oferta clara de conversa — não de venda imediata. Registre cada contato como um lead no seu funil e acompanhe quem respondeu. Quando quiser organizar esses contatos numa sequência de mensagens ao longo do tempo, sua Régua de Comunicação ajuda nisso.',
  },

  /* ── Cap 8 ── */
  'c8-1': {
    porque: 'Sem reunião semanal entre marketing, vendas e comunicação, cada área age por conta própria. O desalinhamento gera leads ruins, fechamentos perdidos e conteúdo inútil.',
    como: '1. Defina representantes de cada área (pode ser a mesma pessoa).\n2. Escolha dia e horário fixos: 30 minutos, sem slides.\n3. Pauta sempre igual: o que foi gerado + o que está travado + o que vai ser publicado.',
  },
  'c8-2': {
    porque: 'Sem documentação, o alinhamento dura enquanto durar a memória das pessoas. Um documento único garante que qualquer nova entrada entenda a linguagem e as metas do negócio.',
    como: '1. Crie no Diretório: "Alinhamento Comercial — [Ano]".\n2. Seções: persona principal, metas unificadas, glossário de termos, SLAs entre áreas.\n3. Revise a cada trimestre.',
  },
  'c8-3': {
    porque: 'Contratar no calor do momento custa caro e muitas vezes gera demissão prematura. Um critério baseado em métricas elimina a pressão emocional da decisão.',
    como: '1. Complete: "Vamos contratar [papel] quando [KPI] superar [meta] por [N dias] consecutivos".\n2. Escreva para cada posição prevista nos próximos 12 meses.\n3. Coloque no planejamento anual como marco de crescimento.',
  },
  'c8-4': {
    porque: 'Sem SLA, marketing culpa vendas por não trabalhar os leads e vendas culpa marketing pela qualidade. O SLA elimina essa disputa com critérios objetivos e mensuráveis.',
    como: '1. Defina: quanto tempo vendas tem para contatar um lead após chegar? (meta: até 1 hora útil).\n2. Documente o critério de "lead qualificado" — quando marketing passa para vendas.\n3. Configure no CRM como alerta automático de follow-up.',
  },
  'c8-5': {
    porque: 'O mercado muda e o que funcionou no ano passado pode não funcionar mais. Sem revisão anual, você opera com um mapa desatualizado — e chega em lugares que não queria.',
    como: '1. Bloqueie 4 horas — preferencialmente fora do escritório.\n2. Pauta: o que mudou no mercado, o que funcionou, o que não funcionou, os 3 objetivos do próximo ano.\n3. Convide sócios e líderes de área.',
  },
  'c8-6': {
    porque: 'Times que não celebram vitórias entram em modo constante de "mais, mais, mais" — e chegam ao burnout. Documentar o que funcionou cria o playbook de crescimento da empresa.',
    como: '1. Retrospectiva dos últimos 6 meses: maior resultado e maior aprendizado.\n2. Escreva o que funcionou em detalhes — o processo, não só o resultado.\n3. Celebre com a equipe de forma concreta: jantar, folga, bônus.',
  },
};

let _idSeq = Date.now();
function genId(prefix = 'g') { return `${prefix}${_idSeq++}`; }

/* ─── Customizations persistence ─────────────────────────────────────────────── */
function buildEffectiveChapters(customizations) {
  return GUIA_CHAPTERS.map((c) => {
    const meta = CAP_META[c.id] ?? {};
    const custom = customizations[c.id];
    if (!custom) return { ...c, ...meta };
    const { taskLayers: _tl, taskFormTypes: _tf, ...chapCustom } = custom;
    return { ...c, ...meta, ...chapCustom };
  });
}

/* ─── Task form type mapping ─────────────────────────────────────────────────── */
const TASK_FORM_TYPE = {
  'c1-1': 'swot',
  'c1-2': 'persona',
  'c1-3': 'funil',
  'c1-4': 'fourps',
  'c1-6': 'competitor',
  'c2-1': 'goals',
  'c2-2': 'budget',
  'c7-1': 'kpis_def',
  'c3-5': 'richtext',
  'c5-4': 'richtext',
  'c4-1': 'richtext',
  'c6-4': 'tools',
  'c-icp-3': 'icp',
};

const TASK_DIR_META = {
  'c3-5': { title: 'Organograma de Marketing', folder: 'processos' },
  'c5-4': { title: 'Guia de Marca',            folder: 'templates' },
  'c4-1': { title: 'Processo de Vendas',       folder: 'processos' },
  'c6-4': { title: 'Stack de Ferramentas',     folder: 'processos' },
};

/* ─── Shared form styles ─────────────────────────────────────────────────────── */
const INPUT_S = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 7, padding: '7px 10px',
  fontSize: 12, color: 'var(--text)', outline: 'none',
  fontFamily: 'var(--font-body)',
};

function FLabel({ children, color }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: color ?? 'var(--text3)', letterSpacing: '0.05em', marginBottom: 4 }}>
      {children}
    </div>
  );
}

function SaveBtn({ onClick, disabled, done }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: disabled ? 'var(--bg4)' : 'var(--accent)',
        color: disabled ? 'var(--text3)' : '#fff',
        border: 'none', borderRadius: 8,
        padding: '8px 14px', fontSize: 12, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-body)', transition: 'background .15s',
      }}
    >
      <CheckCircle2 size={13} />
      {done ? 'Atualizar dados' : 'Salvar e concluir'}
    </button>
  );
}

/* ─── useLocalStorage + useVersionHistory (histórico de versões da SWOT) ─────── */
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
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

function useVersionHistory(storageKey) {
  const [, setVersions] = useLocalStorage(storageKey, []);
  const saveVersion = useCallback((data) => {
    const snapshot = JSON.parse(JSON.stringify(data));
    setVersions(prev => {
      if (prev.length > 0 && JSON.stringify(prev[0].data) === JSON.stringify(snapshot)) return prev;
      return [{ id: `vh${Date.now()}`, date: new Date().toISOString(), data: snapshot }, ...prev].slice(0, 10);
    });
  }, [setVersions]);
  return { saveVersion };
}

/* ─── SWOT Form ───────────────────────────────────────────────────────────────── */
function SwotForm({ onComplete, done }) {
  const { empresaId } = useAuth();
  const { onSwotSaved } = useContext(GuiaCtx);
  const toText = (arr) => (Array.isArray(arr) ? arr : []).map(i => typeof i === 'string' ? i : i.text).filter(Boolean).join('\n');
  const [vals, setVals] = useState({ forcas: '', fraquezas: '', oportunidades: '', ameacas: '' });
  const [loading, setLoading] = useState(true);
  const [saveErr, setSaveErr] = useState(null);
  const { saveVersion } = useVersionHistory('diag_swot_versions');
  const prevData = useRef(null);

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('diagnostico_swot').select('*').eq('empresa_id', empresaId).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          prevData.current = {
            forcas:        data.forcas        ?? [],
            fraquezas:     data.fraquezas     ?? [],
            oportunidades: data.oportunidades ?? [],
            ameacas:       data.ameacas       ?? [],
          };
          setVals({
            forcas:        toText(data.forcas),
            fraquezas:     toText(data.fraquezas),
            oportunidades: toText(data.oportunidades),
            ameacas:       toText(data.ameacas),
          });
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const QUADS = [
    { key: 'forcas',        label: 'Forças',        color: 'var(--green)'   },
    { key: 'fraquezas',     label: 'Fraquezas',     color: 'var(--amber)'   },
    { key: 'oportunidades', label: 'Oportunidades', color: 'var(--accent2)' },
    { key: 'ameacas',       label: 'Ameaças',       color: 'var(--red)'     },
  ];
  const anyFilled = Object.values(vals).some(v => v.trim());

  async function handleSave() {
    setSaveErr(null);
    const parseLines = (text, prefix) =>
      text.split('\n').map(l => l.trim()).filter(Boolean)
        .map(t => ({ id: genId(prefix), text: t, fromGuia: true }));
    const swot = {
      forcas:        parseLines(vals.forcas,        'f'),
      fraquezas:     parseLines(vals.fraquezas,     'w'),
      oportunidades: parseLines(vals.oportunidades, 'o'),
      ameacas:       parseLines(vals.ameacas,       'a'),
    };
    if (prevData.current && Object.values(prevData.current).some(arr => Array.isArray(arr) && arr.length > 0)) {
      saveVersion(prevData.current);
    }
    const { error } = await supabase
      .from('diagnostico_swot')
      .upsert({
        empresa_id:    empresaId,
        forcas:        swot.forcas,
        fraquezas:     swot.fraquezas,
        oportunidades: swot.oportunidades,
        ameacas:       swot.ameacas,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'empresa_id' });
    if (error) {
      setSaveErr('Erro ao salvar SWOT. Tente novamente.');
      return;
    }
    prevData.current = swot;
    onSwotSaved(swot);
    onComplete();
  }

  if (loading) return <div style={{ color: 'var(--text3)', fontSize: 12, padding: '8px 0' }}>Carregando...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {QUADS.map(({ key, label, color }) => (
          <div key={key}>
            <FLabel color={color}>{label}</FLabel>
            <textarea value={vals[key]} onChange={e => setVals(v => ({ ...v, [key]: e.target.value }))}
              placeholder="Uma por linha..." rows={3}
              style={{ ...INPUT_S, resize: 'vertical' }} />
          </div>
        ))}
      </div>
      {saveErr && <div style={{ color: 'var(--red)', fontSize: 11 }}>{saveErr}</div>}
      <SaveBtn onClick={handleSave} disabled={!anyFilled} done={done} />
    </div>
  );
}

/* ─── personaFromRow (mini-mapper para leitura do banco) ─────────────────────── */
function personaFromRow(r) {
  return {
    id:            r.id,
    nome:          r.nome            ?? '',
    cargo:         r.cargo           ?? '',
    avatar:        r.avatar          ?? '',
    color:         r.color           ?? '--accent2',
    descricao:     r.descricao       ?? '',
    dores:         r.dores           ?? [],
    decisaoCompra: r.decisao_compra  ?? '',
    objecoes:      r.objecoes        ?? [],
    canais:        r.canais          ?? '',
  };
}

/* ─── Persona Form ───────────────────────────────────────────────────────────── */
function PersonaForm({ onComplete, done }) {
  const { empresaId } = useAuth();
  const { onPersonasSaved } = useContext(GuiaCtx);
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveErr, setSaveErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const { saveVersion } = useVersionHistory('diag_personas_versions');
  const [form, setForm] = useState({ nome: '', cargo: '', descricao: '', dores: '', decisaoCompra: '', canais: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.nome.trim() && form.dores.trim();

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase
      .from('diagnostico_personas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('criado_em', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setPersonas((data ?? []).map(personaFromRow));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  async function handleSave() {
    setSaveErr(null);
    setSaving(true);
    const nome = form.nome.trim();
    const row = {
      nome,
      cargo:          form.cargo.trim(),
      avatar:         nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      color:          '--accent2',
      descricao:      form.descricao.trim(),
      dores:          form.dores.split('\n').map(l => l.trim()).filter(Boolean),
      decisao_compra: form.decisaoCompra.trim(),
      objecoes:       [],
      canais:         form.canais.trim(),
      atualizado_em:  new Date().toISOString(),
    };
    if (personas.length > 0) saveVersion(personas);
    const { data: created, error } = await supabase
      .from('diagnostico_personas')
      .insert(row)
      .select()
      .single();
    setSaving(false);
    if (error) { setSaveErr('Erro ao salvar persona. Tente novamente.'); return; }
    const updated = [...personas, personaFromRow(created)];
    setPersonas(updated);
    onPersonasSaved(updated);
    onComplete();
  }

  if (loading) return <SkeletonLoader lines={4} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {personas.length > 0 && (
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {personas.length} persona{personas.length > 1 ? 's' : ''} já cadastrada{personas.length > 1 ? 's' : ''}
          </span>
          {personas.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 999, fontSize: 8, fontWeight: 700,
                background: 'rgba(91,110,245,0.15)', color: 'var(--accent2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{p.avatar || p.nome.slice(0, 2).toUpperCase()}</div>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{p.nome}</span>
              {p.cargo && <span style={{ fontSize: 10, color: 'var(--text3)' }}>· {p.cargo}</span>}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <FLabel>Nome fictício *</FLabel>
          <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Ana, a Fundadora" style={INPUT_S} />
        </div>
        <div>
          <FLabel>Cargo / Situação</FLabel>
          <input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Ex: CEO · 35 anos" style={INPUT_S} />
        </div>
      </div>
      <div>
        <FLabel>Descrição rápida</FLabel>
        <input value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Quem é essa pessoa..." style={INPUT_S} />
      </div>
      <div>
        <FLabel>Principais dores * (uma por linha)</FLabel>
        <textarea value={form.dores} onChange={e => set('dores', e.target.value)} rows={3}
          placeholder={'Dor 1\nDor 2...'} style={{ ...INPUT_S, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <FLabel>Como decide a compra</FLabel>
          <input value={form.decisaoCompra} onChange={e => set('decisaoCompra', e.target.value)} placeholder="Ex: Busca ROI claro" style={INPUT_S} />
        </div>
        <div>
          <FLabel>Canais preferidos</FLabel>
          <input value={form.canais} onChange={e => set('canais', e.target.value)} placeholder="LinkedIn, WhatsApp..." style={INPUT_S} />
        </div>
      </div>
      {saveErr && <div style={{ color: 'var(--red)', fontSize: 11 }}>{saveErr}</div>}
      <SaveBtn onClick={handleSave} disabled={!valid || saving} done={done} />
    </div>
  );
}

/* ─── Funil Form ──────────────────────────────────────────────────────────────── */
const FUNIL_DEFAULT_STAGES = [
  { id: null, nome: 'Leads gerados',    volume: '', conversao: '' },
  { id: null, nome: 'Contato feito',    volume: '', conversao: '' },
  { id: null, nome: 'Proposta enviada', volume: '', conversao: '' },
  { id: null, nome: 'Negociação',       volume: '', conversao: '' },
  { id: null, nome: 'Fechamento',       volume: '', conversao: '' },
];

function FunilForm({ onComplete, done }) {
  const { empresaId } = useAuth();
  const { onFunilSaved } = useContext(GuiaCtx);
  const { saveVersion } = useVersionHistory('diag_funil_versions');
  const [existingStages, setExistingStages] = useState([]);
  const [stages, setStages] = useState(FUNIL_DEFAULT_STAGES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('diagnostico_funil').select('etapas')
      .eq('empresa_id', empresaId).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.etapas?.length) {
          setExistingStages(data.etapas);
          setStages(data.etapas.map(s => ({
            id:        s.id,
            nome:      s.nome,
            volume:    String(s.volume ?? ''),
            conversao: String(s.conversao ?? ''),
          })));
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  const valid = stages.some(s => s.nome.trim());

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true); setSaveErr(null);
    if (existingStages.length > 0) saveVersion(existingStages);
    const toSave = stages
      .filter(s => s.nome.trim())
      .map(s => ({
        id:        s.id || genId('fu'),
        nome:      s.nome.trim(),
        volume:    Number(s.volume) || 0,
        conversao: Number(s.conversao) || 0,
      }));
    const { error } = await supabase
      .from('diagnostico_funil')
      .upsert(
        { empresa_id: empresaId, etapas: toSave, atualizado_em: new Date().toISOString() },
        { onConflict: 'empresa_id' }
      );
    if (error) { setSaveErr('Erro ao salvar: ' + error.message); setSaving(false); return; }
    setExistingStages(toSave);
    if (onFunilSaved) onFunilSaved(toSave);
    setSaving(false);
    onComplete();
  }

  function setField(i, key, val) {
    setStages(st => st.map((x, j) => j === i ? { ...x, [key]: val } : x));
  }

  if (loading) return <SkeletonLoader rows={3} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>Etapa</span>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>Volume</span>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>Conversão %</span>
      </div>
      {stages.map((s, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 6 }}>
          <input value={s.nome} onChange={e => setField(i, 'nome', e.target.value)} placeholder={`Etapa ${i + 1}`} style={INPUT_S} />
          <input type="number" value={s.volume} onChange={e => setField(i, 'volume', e.target.value)} placeholder="0" style={INPUT_S} />
          <input type="number" value={s.conversao} onChange={e => setField(i, 'conversao', e.target.value)} placeholder="%" style={INPUT_S} />
        </div>
      ))}
      {saveErr && <div style={{ color: 'var(--red)', fontSize: 12 }}>{saveErr}</div>}
      <SaveBtn onClick={handleSave} disabled={!valid || saving} done={done} />
    </div>
  );
}

/* ─── 4Ps / 6 elementos Form ─────────────────────────────────────────────────── */
const FOURPS_FORM_FIELDS = [
  { key: 'produto',   dbField: 'descricao',       label: 'Produto',    color: 'var(--accent2)', placeholder: 'O que você vende e qual o diferencial?' },
  { key: 'preco',     dbField: 'modelo',          label: 'Preço',      color: 'var(--green)',   placeholder: 'Modelo de precificação e faixa de preço' },
  { key: 'praca',     dbField: 'canaisVenda',     label: 'Praça',      color: 'var(--teal)',    placeholder: 'Onde e como distribui / entrega' },
  { key: 'promocao',  dbField: 'canaisMarketing', label: 'Promoção',   color: 'var(--amber)',   placeholder: 'Como atrai e comunica com clientes' },
  { key: 'pessoas',   dbField: 'quemAtende',      label: 'Pessoas',    color: 'var(--purple)',  placeholder: 'Quem atende o cliente e qual o perfil ideal' },
  { key: 'processos', dbField: 'comoEntrega',     label: 'Processos',  color: 'var(--teal)',    placeholder: 'Como o serviço é entregue ao cliente' },
];

function FourPsForm({ onComplete, done }) {
  const { empresaId } = useAuth();
  const { onQuatroPsSaved } = useContext(GuiaCtx);
  const { saveVersion } = useVersionHistory('diag_4ps_versions');
  const [existingRow, setExistingRow] = useState(null);
  const [vals, setVals] = useState({ produto: '', preco: '', praca: '', promocao: '', pessoas: '', processos: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('diagnostico_4ps').select('*')
      .eq('empresa_id', empresaId).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setExistingRow(data);
          setVals({
            produto:   data.produto?.descricao        ?? '',
            preco:     data.preco?.modelo             ?? '',
            praca:     data.praca?.canaisVenda        ?? '',
            promocao:  data.promocao?.canaisMarketing ?? '',
            pessoas:   data.pessoas?.quemAtende       ?? '',
            processos: data.processos?.comoEntrega    ?? '',
          });
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  const valid = Object.values(vals).some(v => v.trim());

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true); setSaveErr(null);
    const existingFourPs = {
      produto:   existingRow?.produto   ?? {},
      preco:     existingRow?.preco     ?? {},
      praca:     existingRow?.praca     ?? {},
      promocao:  existingRow?.promocao  ?? {},
      pessoas:   existingRow?.pessoas   ?? {},
      processos: existingRow?.processos ?? {},
    };
    const hasContent = Object.values(existingFourPs).some(p =>
      Object.values(p).some(v => v && typeof v === 'string' && v.trim())
    );
    if (hasContent) saveVersion(existingFourPs);
    const toUpsert = {
      empresa_id: empresaId,
      produto:   { ...existingFourPs.produto,   descricao:       vals.produto   },
      preco:     { ...existingFourPs.preco,     modelo:          vals.preco     },
      praca:     { ...existingFourPs.praca,     canaisVenda:     vals.praca     },
      promocao:  { ...existingFourPs.promocao,  canaisMarketing: vals.promocao  },
      pessoas:   { ...existingFourPs.pessoas,   quemAtende:      vals.pessoas   },
      processos: { ...existingFourPs.processos, comoEntrega:     vals.processos },
      atualizado_em: new Date().toISOString(),
    };
    const { data: saved, error } = await supabase
      .from('diagnostico_4ps')
      .upsert(toUpsert, { onConflict: 'empresa_id' })
      .select().single();
    if (error) { setSaveErr('Erro ao salvar: ' + error.message); setSaving(false); return; }
    setExistingRow(saved);
    if (onQuatroPsSaved) onQuatroPsSaved(saved);
    setSaving(false);
    onComplete();
  }

  if (loading) return <SkeletonLoader rows={3} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {FOURPS_FORM_FIELDS.map(({ key, label, color, placeholder }) => (
          <div key={key}>
            <FLabel color={color}>{label}</FLabel>
            <textarea value={vals[key]} onChange={e => setVals(v => ({ ...v, [key]: e.target.value }))}
              placeholder={placeholder} rows={3} style={{ ...INPUT_S, resize: 'vertical' }} />
          </div>
        ))}
      </div>
      {saveErr && <div style={{ color: 'var(--red)', fontSize: 12 }}>{saveErr}</div>}
      <SaveBtn onClick={handleSave} disabled={!valid || saving} done={done} />
    </div>
  );
}

/* ─── Competitor Form ────────────────────────────────────────────────────────── */
function compFromRow(r) {
  return {
    id:           r.id,
    nome:         r.nome          ?? '',
    site:         r.site          ?? '',
    faixaPreco:   r.faixa_preco   ?? 'medio',
    canais:       r.canais        ?? [],
    forcas:       r.forcas        ?? [],
    fraquezas:    r.fraquezas     ?? [],
    diferenciais: r.diferenciais  ?? '',
  };
}

function CompetitorForm({ onComplete, done }) {
  const { empresaId } = useAuth();
  const { onConcorrentesSaved } = useContext(GuiaCtx);
  const { saveVersion } = useVersionHistory('diag_competitors_versions');
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);
  const [form, setForm] = useState({ nome: '', site: '', forcas: '', fraquezas: '', diferenciais: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('diagnostico_concorrentes').select('*')
      .eq('empresa_id', empresaId).order('criado_em', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setCompetitors(data?.length ? data.map(compFromRow) : []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  const valid = form.nome.trim();

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true); setSaveErr(null);
    const row = {
      nome:         form.nome.trim(),
      site:         form.site.trim(),
      faixa_preco:  'medio',
      canais:       [],
      forcas:       form.forcas.split('\n').map(l => l.trim()).filter(Boolean),
      fraquezas:    form.fraquezas.split('\n').map(l => l.trim()).filter(Boolean),
      diferenciais: form.diferenciais.trim(),
    };
    const { data: created, error } = await supabase
      .from('diagnostico_concorrentes').insert(row).select().single();
    if (error) { setSaveErr('Erro ao salvar: ' + error.message); setSaving(false); return; }
    const newAll = [...competitors, compFromRow(created)];
    saveVersion(newAll);
    setCompetitors(newAll);
    if (onConcorrentesSaved) onConcorrentesSaved(newAll);
    setSaving(false);
    onComplete();
  }

  if (loading) return <SkeletonLoader rows={3} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {competitors.length > 0 && (
        <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
          <div style={{ color: 'var(--text3)', marginBottom: 6 }}>Concorrentes já cadastrados:</div>
          {competitors.map(c => (
            <div key={c.id} style={{ color: 'var(--text2)', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--green)', fontSize: 10 }}>✓</span>
              <span>{c.nome}</span>
              {c.site && <span style={{ color: 'var(--text3)' }}>— {c.site}</span>}
            </div>
          ))}
          <div style={{ color: 'var(--text3)', marginTop: 8, fontSize: 11 }}>Adicionar mais um concorrente:</div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <FLabel>Nome do concorrente *</FLabel>
          <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: RD Station" style={INPUT_S} />
        </div>
        <div>
          <FLabel>Site</FLabel>
          <input value={form.site} onChange={e => set('site', e.target.value)} placeholder="rdstation.com" style={INPUT_S} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <FLabel>Forças (uma por linha)</FLabel>
          <textarea value={form.forcas} onChange={e => set('forcas', e.target.value)} rows={3}
            placeholder={'Força 1\nForça 2...'} style={{ ...INPUT_S, resize: 'vertical' }} />
        </div>
        <div>
          <FLabel>Fraquezas (uma por linha)</FLabel>
          <textarea value={form.fraquezas} onChange={e => set('fraquezas', e.target.value)} rows={3}
            placeholder={'Fraqueza 1\nFraqueza 2...'} style={{ ...INPUT_S, resize: 'vertical' }} />
        </div>
      </div>
      <div>
        <FLabel>Nosso diferencial versus esse concorrente</FLabel>
        <input value={form.diferenciais} onChange={e => set('diferenciais', e.target.value)} placeholder="O que nos diferencia..." style={INPUT_S} />
      </div>
      {saveErr && <div style={{ color: 'var(--red)', fontSize: 12 }}>{saveErr}</div>}
      <SaveBtn onClick={handleSave} disabled={!valid || saving} done={done} />
    </div>
  );
}

/* ─── Goals Form (c2-1) ──────────────────────────────────────────────────────── */
const GOALS_LABELS = ['Meta 1 — Vendas/Receita', 'Meta 2 — Geração de Leads', 'Meta 3 — Retenção/Churn'];
const GOALS_PLACEHOLDERS = ['Ex: Receita mensal de R$ 150k', 'Ex: 60 leads qualificados/mês', 'Ex: Churn abaixo de 3%'];

function GoalsForm({ onComplete, done }) {
  const { empresaId } = useAuth();
  const { onMetasSaved } = useContext(GuiaCtx);
  const [existingKpis, setExistingKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);
  const [goals, setGoals] = useState([
    { nome: '', meta: '', prazo: '' },
    { nome: '', meta: '', prazo: '' },
    { nome: '', meta: '', prazo: '' },
  ]);

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('kpis').select('id,nome,meta,prazo,tipo')
      .eq('empresa_id', empresaId).order('ordem', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setExistingKpis(data ?? []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  const valid = goals.some(g => g.nome.trim());

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true); setSaveErr(null);
    const toInsert = goals
      .filter(g => g.nome.trim())
      .map((g, i) => ({
        nome:        g.nome.trim(),
        tipo:        'numero',
        calculo:     'manual',
        fonte:       null,
        valor:       0,
        meta:        Number(g.meta) || 100,
        tendencia:   0,
        prazo:       g.prazo || null,
        frequencia:  'mensal',
        invert_goal: false,
        descricao:   '',
        formula:     '',
        exemplo:     '',
        empresa_id:  empresaId,
        ordem:       existingKpis.length + i,
      }));
    const { data: inserted, error } = await supabase
      .from('kpis').insert(toInsert).select('id,nome');
    if (error) { setSaveErr('Erro ao salvar: ' + error.message); setSaving(false); return; }
    const newAll = [...existingKpis, ...(inserted ?? [])];
    setExistingKpis(newAll);
    if (onMetasSaved) onMetasSaved(newAll);
    setSaving(false);
    onComplete();
  }

  function setField(i, key, val) {
    setGoals(gl => gl.map((x, j) => j === i ? { ...x, [key]: val } : x));
  }

  if (loading) return <SkeletonLoader rows={3} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {existingKpis.length > 0 && (
        <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
          <div style={{ color: 'var(--text3)', marginBottom: 6 }}>KPIs/metas já cadastrados:</div>
          {existingKpis.map(k => (
            <div key={k.id} style={{ color: 'var(--text2)', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--green)', fontSize: 10 }}>✓</span>
              <span>{k.nome}</span>
              {k.meta != null && <span style={{ color: 'var(--text3)' }}>— meta: {k.meta}</span>}
            </div>
          ))}
          <div style={{ color: 'var(--text3)', marginTop: 8, fontSize: 11 }}>Adicionar mais metas:</div>
        </div>
      )}
      {goals.map((g, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px', gap: 6 }}>
          <div>
            <FLabel>{GOALS_LABELS[i]}</FLabel>
            <input value={g.nome} onChange={e => setField(i, 'nome', e.target.value)}
              placeholder={GOALS_PLACEHOLDERS[i]} style={INPUT_S} />
          </div>
          <div>
            {i === 0 && <FLabel>Valor meta</FLabel>}
            {i !== 0 && <div style={{ height: 22 }} />}
            <input type="number" value={g.meta} onChange={e => setField(i, 'meta', e.target.value)}
              placeholder="0" style={INPUT_S} />
          </div>
          <div>
            {i === 0 && <FLabel>Prazo</FLabel>}
            {i !== 0 && <div style={{ height: 22 }} />}
            <input type="date" value={g.prazo} onChange={e => setField(i, 'prazo', e.target.value)}
              style={INPUT_S} />
          </div>
        </div>
      ))}
      {saveErr && <div style={{ color: 'var(--red)', fontSize: 12 }}>{saveErr}</div>}
      <SaveBtn onClick={handleSave} disabled={!valid || saving} done={done} />
    </div>
  );
}

/* ─── Budget Form (c2-2) ─────────────────────────────────────────────────────── */
function BudgetForm({ onComplete, done }) {
  const { empresaId } = useAuth();
  const { onMetasSaved } = useContext(GuiaCtx);
  const [existingBudget, setExistingBudget] = useState(null);
  const [allKpis, setAllKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);
  const [faturamento, setFaturamento] = useState('');
  const [percentual, setPercentual] = useState(7);
  const budget = faturamento ? Math.round(Number(faturamento) * percentual / 100) : 0;
  const valid = faturamento && Number(faturamento) > 0;

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('kpis').select('id,nome,meta')
      .eq('empresa_id', empresaId)
      .then(({ data }) => {
        if (cancelled) return;
        const all = data ?? [];
        setAllKpis(all);
        const found = all.find(k => k.nome === 'Orçamento de Marketing');
        if (found) setExistingBudget(found);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true); setSaveErr(null);
    const row = {
      nome:        'Orçamento de Marketing',
      tipo:        'moeda',
      calculo:     'manual',
      fonte:       null,
      valor:       0,
      meta:        budget,
      tendencia:   0,
      prazo:       null,
      frequencia:  'mensal',
      invert_goal: false,
      descricao:   `${percentual}% do faturamento médio mensal`,
      formula:     `Faturamento médio × ${percentual}%`,
      exemplo:     `R$ ${Number(faturamento).toLocaleString('pt-BR')} × ${percentual}% = R$ ${budget.toLocaleString('pt-BR')}`,
      empresa_id:  empresaId,
      ordem:       allKpis.length,
    };
    const { data: inserted, error } = await supabase
      .from('kpis').insert(row).select('id,nome').single();
    if (error) { setSaveErr('Erro ao salvar: ' + error.message); setSaving(false); return; }
    const newAll = [...allKpis, inserted];
    setAllKpis(newAll);
    setExistingBudget(inserted);
    if (onMetasSaved) onMetasSaved(newAll);
    setSaving(false);
    onComplete();
  }

  if (loading) return <SkeletonLoader rows={2} />;

  if (existingBudget) {
    return (
      <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
        <div style={{ color: 'var(--text3)', marginBottom: 4 }}>Orçamento de Marketing já definido:</div>
        <div style={{ color: 'var(--text)', fontWeight: 500 }}>
          Meta: R$ {Number(existingBudget.meta ?? 0).toLocaleString('pt-BR')}
        </div>
        <div style={{ color: 'var(--text3)', marginTop: 4, fontSize: 11 }}>Para alterar, acesse o módulo Metas e KPIs.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
        <div>
          <FLabel>Faturamento médio mensal (R$)</FLabel>
          <input type="number" value={faturamento} onChange={e => setFaturamento(e.target.value)} placeholder="Ex: 50000" style={INPUT_S} />
        </div>
        <div>
          <FLabel>Percentual</FLabel>
          <select value={percentual} onChange={e => setPercentual(Number(e.target.value))}
            style={{ ...INPUT_S, cursor: 'pointer' }}>
            {[5, 6, 7, 8, 9, 10, 12, 15].map(p => <option key={p} value={p}>{p}%</option>)}
          </select>
        </div>
      </div>
      {budget > 0 && (
        <div style={{ padding: '8px 12px', background: 'rgba(91,110,245,0.08)', border: '1px solid rgba(91,110,245,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--accent2)' }}>
          Orçamento mensal estimado: <strong>R$ {budget.toLocaleString('pt-BR')}</strong>
        </div>
      )}
      {saveErr && <div style={{ color: 'var(--red)', fontSize: 12 }}>{saveErr}</div>}
      <SaveBtn onClick={handleSave} disabled={!valid || saving} done={done} />
    </div>
  );
}

/* ─── KPIs Definition Form (c7-1) ────────────────────────────────────────────── */
const KPI_SUGGESTIONS = [
  { nome: 'Leads qualificados/mês',   tipo: 'numero',     meta: 50,  invertGoal: false, descricao: 'Leads que passaram pelos critérios de qualificação (BANT) no período.' },
  { nome: 'Taxa de fechamento',       tipo: 'percentual', meta: 20,  invertGoal: false, descricao: 'Percentual de leads qualificados que se tornam clientes.' },
  { nome: 'CAC (Custo de Aquisição)', tipo: 'moeda',      meta: 350, invertGoal: true,  descricao: 'Custo médio para adquirir um novo cliente.' },
  { nome: 'Churn mensal',             tipo: 'percentual', meta: 3,   invertGoal: true,  descricao: 'Percentual de clientes que cancelaram no período.' },
  { nome: 'NPS (Satisfação)',         tipo: 'numero',     meta: 50,  invertGoal: false, descricao: 'Net Promoter Score — promotores menos detratores.' },
];

function KPIsDefForm({ onComplete, done }) {
  const { empresaId } = useAuth();
  const { onKpisSaved } = useContext(GuiaCtx);
  const [existingKpis, setExistingKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);
  const [selected, setSelected] = useState(new Set(KPI_SUGGESTIONS.map((_, i) => i)));
  const [prazo, setPrazo] = useState('');

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('kpis').select('id,nome,tipo,meta')
      .eq('empresa_id', empresaId).order('ordem', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setExistingKpis(data ?? []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  const existingNames = new Set(existingKpis.map(k => k.nome));
  const availableIdxs = KPI_SUGGESTIONS.map((_, i) => i).filter(i => !existingNames.has(KPI_SUGGESTIONS[i].nome));
  const valid = [...selected].some(i => availableIdxs.includes(i));

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true); setSaveErr(null);
    const toInsert = [...selected]
      .filter(i => availableIdxs.includes(i))
      .map((i, idx) => ({
        nome:        KPI_SUGGESTIONS[i].nome,
        tipo:        KPI_SUGGESTIONS[i].tipo,
        calculo:     'manual',
        fonte:       null,
        valor:       0,
        meta:        KPI_SUGGESTIONS[i].meta,
        tendencia:   0,
        prazo:       prazo || null,
        frequencia:  'mensal',
        invert_goal: KPI_SUGGESTIONS[i].invertGoal,
        descricao:   KPI_SUGGESTIONS[i].descricao,
        formula:     '',
        exemplo:     '',
        empresa_id:  empresaId,
        ordem:       existingKpis.length + idx,
      }));
    const { data: inserted, error } = await supabase
      .from('kpis').insert(toInsert).select('id,nome');
    if (error) { setSaveErr('Erro ao salvar: ' + error.message); setSaving(false); return; }
    const newAll = [...existingKpis, ...(inserted ?? [])];
    setExistingKpis(newAll);
    if (onKpisSaved) onKpisSaved(newAll);
    setSaving(false);
    onComplete();
  }

  const fmtMeta = (kpi) =>
    kpi.tipo === 'moeda' ? `R$ ${kpi.meta.toLocaleString('pt-BR')}` :
    kpi.tipo === 'percentual' ? `${kpi.meta}%` : String(kpi.meta);

  if (loading) return <SkeletonLoader rows={3} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {existingKpis.length > 0 && (
        <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
          <div style={{ color: 'var(--text3)', marginBottom: 6 }}>KPIs já cadastrados:</div>
          {existingKpis.map(k => (
            <div key={k.id} style={{ color: 'var(--text2)', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--green)', fontSize: 10 }}>✓</span>
              <span>{k.nome}</span>
            </div>
          ))}
        </div>
      )}
      {availableIdxs.length > 0 ? (
        <>
          <FLabel>Selecione os KPIs para adicionar ao seu painel:</FLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {availableIdxs.map(i => {
              const kpi = KPI_SUGGESTIONS[i];
              return (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7,
                  background: selected.has(i) ? 'rgba(91,110,245,0.08)' : 'var(--bg)',
                  border: `1px solid ${selected.has(i) ? 'rgba(91,110,245,0.3)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all .12s' }}>
                  <input type="checkbox" checked={selected.has(i)}
                    onChange={e => setSelected(s => { const n = new Set(s); e.target.checked ? n.add(i) : n.delete(i); return n; })}
                    style={{ cursor: 'pointer', accentColor: 'var(--accent)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{kpi.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                      Meta de referência: {fmtMeta(kpi)} · {kpi.invertGoal ? 'Menor = melhor' : 'Maior = melhor'}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div>
            <FLabel>Prazo das metas</FLabel>
            <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} style={INPUT_S} />
          </div>
          {saveErr && <div style={{ color: 'var(--red)', fontSize: 12 }}>{saveErr}</div>}
          <SaveBtn onClick={handleSave} disabled={!valid || saving} done={done} />
        </>
      ) : (
        <div style={{ color: 'var(--text3)', fontSize: 12, padding: '8px 0' }}>
          Todos os KPIs sugeridos já foram adicionados.
        </div>
      )}
    </div>
  );
}

/* ─── ICP Form (c-icp-3) ─────────────────────────────────────────────────────── */
function IcpForm({ onComplete, done }) {
  const navigate = useNavigate();
  const { empresaId } = useAuth();
  const { onIcpSaved } = useContext(GuiaCtx);
  const [existingRow, setExistingRow] = useState(null);
  const [vals, setVals] = useState({ dor_principal: '', gatilho_compra: '', decisor: '', ticket_medio: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('diagnostico_icp').select('*')
      .eq('empresa_id', empresaId).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setExistingRow(data);
          setVals({
            dor_principal:  data.dor_principal  ?? '',
            gatilho_compra: data.gatilho_compra ?? '',
            decisor:        data.decisor        ?? '',
            ticket_medio:   data.ticket_medio   ?? '',
          });
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  const valid = Object.values(vals).some(v => v.trim());

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true); setSaveErr(null);
    const toUpsert = {
      empresa_id:         empresaId,
      atividade:          existingRow?.atividade          ?? null,
      porte:              existingRow?.porte              ?? null,
      capital_social:     existingRow?.capital_social     ?? null,
      uf:                 existingRow?.uf                 ?? null,
      municipio:          existingRow?.municipio          ?? null,
      natureza_juridica:  existingRow?.natureza_juridica  ?? null,
      dor_principal:      vals.dor_principal.trim()  || null,
      gatilho_compra:     vals.gatilho_compra.trim() || null,
      decisor:            vals.decisor.trim()         || null,
      ticket_medio:       vals.ticket_medio.trim()    || null,
      atualizado_em:      new Date().toISOString(),
    };
    const { data: saved, error } = await supabase
      .from('diagnostico_icp')
      .upsert(toUpsert, { onConflict: 'empresa_id' })
      .select().single();
    if (error) { setSaveErr('Erro ao salvar: ' + error.message); setSaving(false); return; }
    setExistingRow(saved);
    if (onIcpSaved) onIcpSaved(saved);
    setSaving(false);
    onComplete();
  }

  if (loading) return <SkeletonLoader rows={3} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <FLabel color="var(--accent2)">Principal dor que você resolve pra esse cliente</FLabel>
        <textarea value={vals.dor_principal}
          onChange={e => setVals(v => ({ ...v, dor_principal: e.target.value }))}
          rows={2} placeholder="Ex: Gasta tempo demais em tarefas administrativas sem ver resultado..."
          style={{ ...INPUT_S, resize: 'vertical' }} />
      </div>
      <div>
        <FLabel color="var(--green)">O que faz esse cliente decidir comprar — gatilho</FLabel>
        <textarea value={vals.gatilho_compra}
          onChange={e => setVals(v => ({ ...v, gatilho_compra: e.target.value }))}
          rows={2} placeholder="Ex: Crescimento rápido que a operação manual não acompanha mais..."
          style={{ ...INPUT_S, resize: 'vertical' }} />
      </div>
      <div>
        <FLabel color="var(--teal)">Quem decide a compra</FLabel>
        <input value={vals.decisor}
          onChange={e => setVals(v => ({ ...v, decisor: e.target.value }))}
          placeholder="Ex: Dono(a) da empresa, sócio(a) gestor(a)..."
          style={INPUT_S} />
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
          Veja também suas Personas para mais detalhes sobre o decisor.
        </div>
      </div>
      <div>
        <FLabel color="var(--amber)">Ticket médio esperado (R$)</FLabel>
        <input value={vals.ticket_medio}
          onChange={e => setVals(v => ({ ...v, ticket_medio: e.target.value }))}
          placeholder="Ex: R$ 3.500/mês ou R$ 12.000 por projeto"
          style={INPUT_S} />
      </div>
      {saveErr && <div style={{ color: 'var(--red)', fontSize: 11 }}>{saveErr}</div>}
      <SaveBtn onClick={handleSave} disabled={!valid || saving} done={done} />
      <div style={{ marginTop: 2, padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
        Quer detalhar o perfil de empresa (setor, porte, região)?{' '}
        <button onClick={() => navigate('/diagnostico')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent2)', fontSize: 11, padding: 0, textDecoration: 'underline', fontFamily: 'var(--font-body)' }}>
          Refine os critérios firmográficos no seu Diagnóstico, na seção Cliente Ideal.
        </button>
      </div>
    </div>
  );
}

/* ─── Rich Text Form (Diretório docs) ────────────────────────────────────────── */
function RichTextForm({ taskId, onComplete, done }) {
  const meta = TASK_DIR_META[taskId] ?? { title: 'Documento', folder: 'processos' };
  const { onGuiaDocSaved } = useContext(GuiaCtx);
  const { empresaId } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveErr, setSaveErr] = useState(null);

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('diretorio_documentos').select('descricao').eq('guia_task_id', taskId).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setContent(data.descricao ?? '');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId, taskId]);

  const valid = content.trim();

  async function handleSave() {
    setSaveErr(null);
    const tipo = meta.folder === 'templates' ? 'template' : 'sop';
    const result = await saveGuiaDoc({ taskId, tipo, nome: meta.title, descricao: content.trim() });
    if (result.error) { setSaveErr(result.error); return; }
    onGuiaDocSaved?.(taskId);
    onComplete();
  }

  if (loading) return <div style={{ color: 'var(--text3)', fontSize: 12, padding: '8px 0' }}>Carregando...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
        Salvo como <strong style={{ color: 'var(--accent2)' }}>"{meta.title}"</strong> na pasta{' '}
        <strong style={{ color: 'var(--accent2)' }}>{meta.folder === 'processos' ? 'Processos' : 'Templates'}</strong> do Diretório.
      </div>
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={6}
        placeholder="Escreva o conteúdo do documento..." style={{ ...INPUT_S, resize: 'vertical' }} />
      {saveErr && <p style={{ fontSize: 11, color: 'var(--red)', margin: 0 }}>Erro ao salvar: {saveErr}</p>}
      <SaveBtn onClick={handleSave} disabled={!valid} done={done} />
    </div>
  );
}

/* ─── Tools Form (c6-4) ─────────────────────────────────────────────────────── */
const TOOLS_LIST = [
  { id: 't1', label: 'Google Drive / Workspace', desc: 'Documentos, planilhas e armazenamento em nuvem' },
  { id: 't2', label: 'WhatsApp Business',         desc: 'Atendimento, follow-up e broadcast' },
  { id: 't3', label: 'Trello / Notion',           desc: 'Gestão de projetos e calendário editorial' },
  { id: 't4', label: 'CRM (HubSpot / Pipedrive)', desc: 'Pipeline de vendas e gestão de leads' },
  { id: 't5', label: 'Canva',                     desc: 'Criação de posts e materiais visuais' },
  { id: 't6', label: 'Zapier / Make',             desc: 'Automações sem código entre ferramentas' },
  { id: 't7', label: 'Google Analytics 4',        desc: 'Análise de tráfego do site' },
  { id: 't8', label: 'Meta Ads Manager',          desc: 'Anúncios no Instagram e Facebook' },
];

// O conteúdo salvo é o texto composto (não há coluna própria para a seleção de checkboxes) —
// reconstrói o estado do formulário a partir do texto no formato que handleSave gera abaixo.
function parseToolsContent(text) {
  if (!text) return { checked: TOOLS_LIST.map(() => false), notes: '' };
  const [toolsPart, notesPart] = text.split('\n\nNotas:\n');
  const selectedLabels = new Set(
    (toolsPart ?? '').split('\n').filter(l => l.startsWith('• ')).map(l => l.slice(2))
  );
  return { checked: TOOLS_LIST.map(t => selectedLabels.has(t.label)), notes: notesPart ?? '' };
}

function ToolsForm({ onComplete, done }) {
  const { onGuiaDocSaved } = useContext(GuiaCtx);
  const { empresaId } = useAuth();
  const [checked, setChecked] = useState(TOOLS_LIST.map(() => false));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveErr, setSaveErr] = useState(null);

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('diretorio_documentos').select('descricao').eq('guia_task_id', 'c6-4').maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.descricao) {
          const parsed = parseToolsContent(data.descricao);
          setChecked(parsed.checked);
          setNotes(parsed.notes);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  const valid = checked.some(Boolean);

  async function handleSave() {
    setSaveErr(null);
    const selectedTools = TOOLS_LIST.filter((_, i) => checked[i]).map(t => t.label);
    const content = `Stack de ferramentas escolhidas:\n${selectedTools.map(t => `• ${t}`).join('\n')}${notes.trim() ? `\n\nNotas:\n${notes.trim()}` : ''}`;
    const result = await saveGuiaDoc({ taskId: 'c6-4', tipo: 'sop', nome: 'Stack de Ferramentas', descricao: content });
    if (result.error) { setSaveErr(result.error); return; }
    onGuiaDocSaved?.('c6-4');
    onComplete();
  }

  if (loading) return <div style={{ color: 'var(--text3)', fontSize: 12, padding: '8px 0' }}>Carregando...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <FLabel>Marque as ferramentas que vai usar na operação:</FLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {TOOLS_LIST.map((tool, i) => (
          <label key={tool.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7,
            background: checked[i] ? 'rgba(91,110,245,0.08)' : 'var(--bg)',
            border: `1px solid ${checked[i] ? 'rgba(91,110,245,0.3)' : 'var(--border)'}`,
            cursor: 'pointer', transition: 'all .12s' }}>
            <input type="checkbox" checked={checked[i]}
              onChange={e => setChecked(c => c.map((v, j) => j === i ? e.target.checked : v))}
              style={{ cursor: 'pointer', accentColor: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{tool.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{tool.desc}</div>
            </div>
          </label>
        ))}
      </div>
      <div>
        <FLabel>Notas / outras ferramentas (opcional)</FLabel>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Outras ferramentas ou observações..." style={{ ...INPUT_S, resize: 'vertical' }} />
      </div>
      {saveErr && <p style={{ fontSize: 11, color: 'var(--red)', margin: 0 }}>Erro ao salvar: {saveErr}</p>}
      <SaveBtn onClick={handleSave} disabled={!valid} done={done} />
    </div>
  );
}

/* ─── Destination label helper ───────────────────────────────────────────────── */
function destinoLabel(destino) {
  if (!destino) return null;
  const { modulo, arquivo } = destino;
  const labels = {
    diagnostico: 'Diagnóstico',
    crm:         'CRM',
    kpis:        'KPIs & Metas',
    diretorio:   arquivo ? `Diretório → ${arquivo}` : 'Diretório Interno',
    redes:       'Redes Sociais',
    regua:       'Régua de Comunicação',
    guia:        null,
  };
  return labels[modulo] ?? null;
}

/* ─── Simple complete form (fallback) ────────────────────────────────────────── */
function SimpleCompleteForm({ onComplete, done, destino }) {
  const [notes,   setNotes]   = useState('');
  const [touched, setTouched] = useState(false);

  const valid = notes.trim().length >= 10;
  const showError = touched && !valid && !done;

  function handleComplete() {
    if (!done && !valid) { setTouched(true); return; }
    onComplete();
  }

  const dsLabel = destinoLabel(destino);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        {dsLabel && (
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
            → Vai para: {dsLabel}
          </span>
        )}
        <FLabel>Sua anotação {done ? '' : '(obrigatório para concluir)'}</FLabel>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); if (touched) setTouched(false); }}
          rows={3}
          placeholder="Anote o que fez, o que aprendeu ou o próximo passo..."
          style={{ ...INPUT_S, resize: 'vertical', borderColor: showError ? 'var(--red)' : undefined }}
        />
        {showError && (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--red)' }}>
            Escreva sua anotação antes de concluir esta tarefa.
          </p>
        )}
      </div>
      <button onClick={handleComplete}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: done ? 'var(--bg3)' : 'var(--accent)', color: done ? 'var(--text3)' : '#fff', border: done ? '1px solid var(--border)' : 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', alignSelf: 'flex-start' }}>
        <CheckCircle2 size={13} /> {done ? 'Atualizar anotação' : 'Marcar como concluída'}
      </button>
    </div>
  );
}

/* ─── Task inline form dispatcher ───────────────────────────────────────────── */
function TaskInlineForm({ taskId, onComplete, done, destino }) {
  const { getFormType } = useContext(GuiaCtx);
  switch (getFormType(taskId)) {
    case 'swot':       return <SwotForm       onComplete={onComplete} done={done} />;
    case 'persona':    return <PersonaForm    onComplete={onComplete} done={done} />;
    case 'funil':      return <FunilForm      onComplete={onComplete} done={done} />;
    case 'fourps':     return <FourPsForm     onComplete={onComplete} done={done} />;
    case 'competitor': return <CompetitorForm onComplete={onComplete} done={done} />;
    case 'goals':      return <GoalsForm      onComplete={onComplete} done={done} />;
    case 'budget':     return <BudgetForm     onComplete={onComplete} done={done} />;
    case 'kpis_def':   return <KPIsDefForm    onComplete={onComplete} done={done} />;
    case 'richtext':   return <RichTextForm   taskId={taskId} onComplete={onComplete} done={done} />;
    case 'tools':      return <ToolsForm      onComplete={onComplete} done={done} />;
    case 'icp':        return <IcpForm        onComplete={onComplete} done={done} />;
    default:           return <SimpleCompleteForm onComplete={onComplete} done={done} destino={destino} />;
  }
}

/* ─── ─────────────────────────────────────────────────────────────────────────── */

/* ─── Detect auto-completed tasks from system state ─────────────────────────── */
function buildAutoChecked(leads, swotData, personasData, concorrentesData, quatroPsData, funilData, kpisData, icpData, guiaDocTaskIds) {
  const set = new Set();
  // CRM configured
  if (leads.some((l) => l.col !== 'ganho')) {
    set.add('c6-4');
    set.add('c1-3');
  }
  // SWOT filled — lido do Supabase (swotData null até carregar)
  if (swotData && Object.values(swotData).some((arr) => Array.isArray(arr) && arr.length > 0)) set.add('c1-1');
  // Personas filled — lido do Supabase (personasData null até carregar)
  if (Array.isArray(personasData) && personasData.length > 0) set.add('c1-2');
  // 4Ps/6 elementos preenchidos — lido do Supabase (quatroPsData null até carregar)
  if (quatroPsData && Object.values(quatroPsData).some(p => p && typeof p === 'object' && Object.values(p).some(v => v && typeof v === 'string' && v.trim()))) set.add('c1-4');
  // Competitors filled — lido do Supabase (concorrentesData null até carregar)
  if (Array.isArray(concorrentesData) && concorrentesData.length > 0) set.add('c1-6');
  // Funil preenchido — lido do Supabase (funilData null até carregar)
  if (Array.isArray(funilData) && funilData.length > 0) set.add('c1-3');
  // KPIs/Metas — lido do Supabase (kpisData null até carregar)
  if (Array.isArray(kpisData) && kpisData.length > 0) set.add('c2-1');
  if (Array.isArray(kpisData) && kpisData.some(k => k.nome === 'Orçamento de Marketing')) set.add('c2-2');
  if (Array.isArray(kpisData) && kpisData.length >= 3) set.add('c7-1');
  // ICP preenchido — pelo menos um campo qualitativo preenchido
  if (icpData && [icpData.dor_principal, icpData.gatilho_compra, icpData.decisor, icpData.ticket_medio].some(v => v && String(v).trim())) set.add('c-icp-3');
  // Guia docs — lido do Supabase (diretorio_documentos.guia_task_id). 'c6-4' fica de fora:
  // sua detecção depende só de leads reais no CRM (regra acima).
  ['c3-5', 'c5-4', 'c4-1'].forEach(tid => {
    if (guiaDocTaskIds?.includes(tid)) set.add(tid);
  });
  return set;
}

/* ─── Inline text renderer ───────────────────────────────────────────────────── */
function renderInline(text) {
  return text.split(/\*\*(.+?)\*\*/g).map((p, i) =>
    i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text)', fontWeight: 600 }}>{p}</strong> : p
  );
}

/* ─── ProgressRing ───────────────────────────────────────────────────────────── */
function ProgressRing({ pct, color, size = 48 }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`var(${color})`} strokeWidth={5}
        strokeDasharray={`${(pct / 100) * c} ${c - (pct / 100) * c}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .4s' }} />
    </svg>
  );
}

/* ─── Table ──────────────────────────────────────────────────────────────────── */
function TabelaCapitulo({ tabela }) {
  return (
    <div style={{ overflowX: 'auto', margin: '8px 0 4px', border: '1px solid var(--border)', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {tabela.colunas.map((col, i) => (
              <th key={i} style={{ padding: '7px 12px', textAlign: 'left', color: 'var(--text3)', fontWeight: 600, fontSize: 11, background: 'var(--bg4)', borderBottom: '1px solid var(--border)', borderRight: i < tabela.colunas.length - 1 ? '1px solid var(--border)' : 'none' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabela.linhas.map((linha, i) => (
            <tr key={i} style={{ borderBottom: i < tabela.linhas.length - 1 ? '1px solid var(--border)' : 'none' }}>
              {linha.map((cell, j) => (
                <td key={j} style={{ padding: '7px 12px', color: j === 0 ? 'var(--text)' : 'var(--text2)', fontWeight: j === 0 ? 500 : 400, borderRight: j < linha.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Teoria block ───────────────────────────────────────────────────────────── */
function TeoriaBlock({ block, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      {block.split('\n').map((line, j) => {
        if (!line.trim()) return null;
        if (line.trimStart().startsWith('- ')) {
          return (
            <div key={j} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 3, paddingLeft: 4 }}>
              <span style={{ color: `var(${color})`, flexShrink: 0, marginTop: 1 }}>—</span>
              <span>{renderInline(line.replace(/^[\s]*- /, ''))}</span>
            </div>
          );
        }
        return <p key={j} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, margin: '0 0 4px' }}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

/* ─── Guide origin badge ─────────────────────────────────────────────────────── */
function GuideBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(91,110,245,0.12)', color: 'var(--accent2)', border: '1px solid rgba(91,110,245,0.25)', flexShrink: 0 }}>
      <BookOpen size={9} /> Criado pelo Guia
    </span>
  );
}

/* ─── Three-layer expand panel ───────────────────────────────────────────────── */
function LayersPanel({ item, color, onComplete, done }) {
  const { getTaskLayers } = useContext(GuiaCtx);
  const layers = getTaskLayers(item.id);
  if (!layers) return null;
  return (
    <div style={{ marginTop: 6, marginLeft: 28, padding: '12px 14px', borderRadius: 8, background: 'var(--bg)', border: `1px solid color-mix(in srgb, var(${color}) 25%, transparent)` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: `var(${color})`, letterSpacing: '0.07em', marginBottom: 3 }}>O QUÊ</div>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, margin: 0 }}>{item.texto}</p>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: `var(${color})`, letterSpacing: '0.07em', marginBottom: 3 }}>POR QUÊ</div>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, margin: 0 }}>{layers.porque}</p>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: `var(${color})`, letterSpacing: '0.07em', marginBottom: 3 }}>COMO</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65 }}>
            {layers.como.split('\n').map((line, i) => (
              <p key={i} style={{ margin: '0 0 2px' }}>{line}</p>
            ))}
          </div>
        </div>

        {/* Form section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: `var(${color})`, letterSpacing: '0.07em' }}>
              {done ? 'DADOS PREENCHIDOS' : 'PREENCHER E CONCLUIR'}
            </div>
            {done && <GuideBadge />}
          </div>
          <TaskInlineForm taskId={item.id} onComplete={onComplete} done={done} destino={item.destino} />
        </div>
      </div>
    </div>
  );
}

/* ─── Checklist item ─────────────────────────────────────────────────────────── */
function ChecklistItem({ item, capId, capColor, done, onToggle, onSaveComplete, autoDetected }) {
  const navigate = useNavigate();
  const { getTaskLayers } = useContext(GuiaCtx);
  const [hovered,  setHovered]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showTip,  setShowTip]  = useState(false);
  const action = TASK_ACTIONS[item.id];
  const layers = getTaskLayers(item.id);

  const handleComplete = () => onSaveComplete(capId, item.id);

  return (
    <div>
      {/* Main row */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderRadius: 8, transition: 'background .12s', background: hovered ? 'var(--bg4)' : 'transparent' }}
      >
        {/* Checkbox — somente leitura quando a tarefa tem detecção automática */}
        {autoDetected ? (
          <span
            title="Marcação automática — não pode ser alterada manualmente"
            style={{ flexShrink: 0, marginTop: 1, padding: 0, color: done ? `var(${capColor})` : 'var(--text3)', display: 'flex', cursor: 'default', opacity: 0.85 }}>
            {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(capId, item.id); }}
            style={{ flexShrink: 0, marginTop: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: done ? `var(${capColor})` : 'var(--text3)', display: 'flex' }}>
            {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          </button>
        )}

        {/* Auto-detect badge */}
        {autoDetected && (
          <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}>
            <Zap size={13} style={{ color: 'var(--amber)', cursor: 'default' }} />
            {showTip && (
              <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', fontSize: 11, color: 'var(--text2)', whiteSpace: 'normal', width: 220, lineHeight: 1.4, textAlign: 'left', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                {AUTO_DETECT_DESC[item.id] ?? 'Marcada automaticamente quando o dado correspondente existir no sistema.'}
              </div>
            )}
          </div>
        )}

        {/* Task text — click to expand layers */}
        <span
          onClick={() => layers && setExpanded((p) => !p)}
          style={{ flex: 1, fontSize: 13, color: done ? 'var(--text3)' : 'var(--text2)', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.5, cursor: layers ? 'pointer' : 'default' }}>
          {item.texto}
        </span>

        {/* Layer expand icon */}
        {layers && (
          <button onClick={() => setExpanded((p) => !p)}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 1, color: expanded ? `var(${capColor})` : 'var(--text3)', display: 'flex', marginTop: 2, transition: 'transform .15s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
            <ChevronDown size={13} />
          </button>
        )}

        {/* Action button — hover reveal (only when not expanded) */}
        {action && hovered && !expanded && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(action.to); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, background: 'transparent', border: `1px solid color-mix(in srgb, var(${capColor}) 30%, transparent)`, borderRadius: 6, padding: '3px 8px', fontSize: 11, color: `var(${capColor})`, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
            {action.label} <ArrowRight size={10} />
          </button>
        )}
      </div>

      {/* Three layers + form panel */}
      {expanded && layers && (
        <LayersPanel item={item} color={capColor} onComplete={handleComplete} done={done} />
      )}
    </div>
  );
}

/* ─── Super-admin: task edit row ─────────────────────────────────────────────── */
function TaskEditRow({ item, idx, isDragOver, onChange, onDelete, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [expanded,    setExpanded]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(idx)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, idx); }}
      onDrop={() => onDrop(idx)}
      onDragEnd={onDragEnd}
      style={{ background: isDragOver ? 'rgba(91,110,245,0.07)' : 'var(--bg2)', border: `1px solid ${isDragOver ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 10px', transition: 'all .12s', cursor: 'grab' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <GripVertical size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
        <input
          value={item.texto}
          onChange={(e) => onChange(idx, 'texto', e.target.value)}
          placeholder="Texto da tarefa..."
          style={{ ...INPUT_S, flex: 1 }}
        />
        <button
          onClick={() => setExpanded((p) => !p)}
          style={{ background: expanded ? 'rgba(176,110,245,0.12)' : 'var(--bg3)', border: `1px solid ${expanded ? 'rgba(176,110,245,0.3)' : 'var(--border)'}`, borderRadius: 6, padding: '4px 8px', fontSize: 10, color: expanded ? 'var(--purple)' : 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {expanded ? 'Fechar' : 'PQ / COMO'}
        </button>
        {showConfirm ? (
          <>
            <button onClick={() => onDelete(idx)}
              style={{ background: 'var(--red)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, color: '#fff', cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font-body)' }}>
              Excluir
            </button>
            <button onClick={() => setShowConfirm(false)}
              style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 10, color: 'var(--text3)', cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font-body)' }}>
              Cancelar
            </button>
          </>
        ) : (
          <button onClick={() => setShowConfirm(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 3, display: 'flex', borderRadius: 4, flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 10, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <FLabel>POR QUÊ (motivação da tarefa)</FLabel>
            <textarea value={item.porque ?? ''} onChange={(e) => onChange(idx, 'porque', e.target.value)}
              rows={2} placeholder="Por que esta tarefa é importante..." style={{ ...INPUT_S, resize: 'vertical' }} />
          </div>
          <div>
            <FLabel>COMO (instruções passo a passo)</FLabel>
            <textarea value={item.como ?? ''} onChange={(e) => onChange(idx, 'como', e.target.value)}
              rows={3} placeholder={'1. Passo 1\n2. Passo 2\n3. Passo 3'} style={{ ...INPUT_S, resize: 'vertical' }} />
          </div>
          <div>
            <FLabel>Tipo de formulário inline</FLabel>
            <select value={item.formType ?? 'simple'} onChange={(e) => onChange(idx, 'formType', e.target.value)}
              style={{ ...INPUT_S }}>
              <option value="simple">Simples — anotação livre</option>
              <option value="swot">Diagnóstico — SWOT</option>
              <option value="persona">Diagnóstico — Persona</option>
              <option value="goals">Metas — KPIs / Metas SMART</option>
              <option value="budget">Metas — Orçamento</option>
              <option value="richtext">Diretório — Documento de texto</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Super-admin: chapter edit panel ───────────────────────────────────────── */
function ChapterEditPanel({ cap, draft, onChange, onReset }) {
  const setField = (key, val) => onChange({ ...draft, [key]: val });
  const dragIdx = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  function updateTask(idx, key, val) {
    onChange({ ...draft, checklist: draft.checklist.map((item, i) => i === idx ? { ...item, [key]: val } : item) });
  }
  function deleteTask(idx) {
    onChange({ ...draft, checklist: draft.checklist.filter((_, i) => i !== idx) });
  }
  function addTask() {
    const newItem = { id: genId('ct'), texto: '', porque: '', como: '', formType: 'simple', concluido: false };
    onChange({ ...draft, checklist: [...draft.checklist, newItem] });
  }
  function handleDragStart(idx) { dragIdx.current = idx; }
  function handleDragOver(e, idx) { e.preventDefault(); setDragOver(idx); }
  function handleDrop(idx) {
    if (dragIdx.current !== null && dragIdx.current !== idx) {
      const list = [...draft.checklist];
      const [moved] = list.splice(dragIdx.current, 1);
      list.splice(idx, 0, moved);
      onChange({ ...draft, checklist: list });
    }
    dragIdx.current = null;
    setDragOver(null);
  }
  function handleDragEnd() { dragIdx.current = null; setDragOver(null); }

  return (
    <div style={{ borderTop: '1px solid rgba(176,110,245,0.3)', background: 'var(--bg3)' }}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Chapter fields row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FLabel color="var(--purple)">Título do capítulo</FLabel>
            <input value={draft.titulo} onChange={(e) => setField('titulo', e.target.value)} style={INPUT_S} />
          </div>
          <div>
            <FLabel color="var(--purple)">Subtítulo</FLabel>
            <input value={draft.subtitulo} onChange={(e) => setField('subtitulo', e.target.value)} style={INPUT_S} />
          </div>
          <div>
            <FLabel color="var(--purple)">Tempo estimado</FLabel>
            <input value={draft.tempo} onChange={(e) => setField('tempo', e.target.value)} placeholder="ex: 60 min" style={INPUT_S} />
          </div>
          <div>
            <FLabel color="var(--purple)">Nº de ações práticas</FLabel>
            <input type="number" value={draft.acoes} onChange={(e) => setField('acoes', Number(e.target.value))} min={1} style={INPUT_S} />
          </div>
        </div>

        {/* Teoria */}
        <div>
          <FLabel color="var(--purple)">Texto introdutório (teoria)</FLabel>
          <textarea value={draft.teoria} onChange={(e) => setField('teoria', e.target.value)}
            rows={9} style={{ ...INPUT_S, resize: 'vertical', lineHeight: 1.6 }} />
        </div>

        {/* Dica */}
        <div>
          <FLabel color="var(--purple)">Dica do capítulo</FLabel>
          <textarea value={draft.dica} onChange={(e) => setField('dica', e.target.value)}
            rows={3} style={{ ...INPUT_S, resize: 'vertical' }} />
        </div>

        {/* Checklist editor */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', letterSpacing: '0.07em', marginBottom: 10 }}>
            TAREFAS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {draft.checklist.map((item, idx) => (
              <TaskEditRow
                key={item.id}
                item={item}
                idx={idx}
                isDragOver={dragOver === idx}
                onChange={updateTask}
                onDelete={deleteTask}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
          <button
            onClick={addTask}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'transparent', border: '1px dashed rgba(176,110,245,0.4)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(176,110,245,0.4)'; e.currentTarget.style.color = 'var(--text3)'; }}
          >
            <Plus size={13} /> Nova tarefa
          </button>
        </div>

        {/* Restore default */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button
            onClick={onReset}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px', fontSize: 11, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.color = 'var(--amber)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; }}
          >
            <RotateCcw size={11} /> Restaurar padrão deste capítulo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Bloco B: Prompts fixos de IA ──────────────────────────────────────────── */
function BlocoPromptsIA({ promptsIA }) {
  const { openAI } = useUI();
  return (
    <div style={{ margin: '0 20px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>🤖</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.04em' }}>PERGUNTAR À IA</span>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {promptsIA.map((prompt, i) => (
          <button
            key={i}
            onClick={() => openAI(prompt)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 13px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', transition: 'all .13s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; }}
          >
            <span>{prompt}</span>
            <Send size={12} style={{ flexShrink: 0, color: 'var(--accent)' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Bloco C: Próximo passo no app ─────────────────────────────────────────── */
function BlocoProximoPasso({ proximoPasso }) {
  const navigate = useNavigate();
  return (
    <div style={{ margin: '0 20px 20px', background: 'color-mix(in srgb, var(--accent) 8%, var(--bg2))', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'color-mix(in srgb, var(--accent) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <MapPin size={18} style={{ color: 'var(--accent2)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent2)', letterSpacing: '0.07em', marginBottom: 3 }}>PRÓXIMO PASSO</div>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: '0 0 10px' }}>{proximoPasso.mensagem}</p>
        <button
          onClick={() => navigate(proximoPasso.rota)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          <ArrowRight size={12} /> Ir para {proximoPasso.label}
        </button>
      </div>
    </div>
  );
}

/* ─── Capitulo card ──────────────────────────────────────────────────────────── */
function CapituloCard({ cap, progress, autoChecked, onToggle, onSaveComplete, onOpen, isOpen, editMode, editDraft, onEditChange, onReset }) {
  const { openAI } = useUI();

  function isChecked(itemId) {
    // Tarefas de detecção automática: estado sempre derivado do banco, nunca do progresso salvo manualmente.
    if (AUTO_DETECT_IDS.has(itemId)) return autoChecked.has(itemId);
    return (progress[cap.id] ?? []).includes(itemId);
  }

  const total    = cap.checklist.length;
  const checked  = cap.checklist.filter((item) => isChecked(item.id)).length;
  const pct      = total ? Math.round((checked / total) * 100) : 0;
  const complete = pct === 100;
  const capLabel = cap.numero === 0 ? 'INTRODUÇÃO' : `CAPÍTULO ${cap.numero}`;

  return (
    <div style={{ background: 'var(--bg2)', border: `1px solid ${isOpen ? `var(${cap.color})` : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color .15s' }}>

      {/* Header */}
      <div onClick={onOpen} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: `color-mix(in srgb, var(${cap.color}) 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <cap.icon size={19} style={{ color: `var(${cap.color})` }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: `var(${cap.color})`, fontWeight: 600 }}>{capLabel}</span>
            {complete && !editMode && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(45,212,160,0.15)', color: 'var(--green)' }}>
                <Trophy size={9} /> Concluído
              </span>
            )}
            {editMode && isOpen && (
              <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(176,110,245,0.15)', color: 'var(--purple)', border: '1px solid rgba(176,110,245,0.25)' }}>
                Em edição
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3, marginTop: 2 }}>{cap.titulo}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{cap.subtitulo}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: complete ? 'var(--green)' : 'var(--text)' }}>{pct}%</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{checked}/{total} itens</div>
          </div>
          <ProgressRing pct={pct} color={complete ? '--green' : cap.color} />
          <div style={{ color: 'var(--text3)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* Expanded */}
      {isOpen && (
        editMode && editDraft ? (
          <ChapterEditPanel cap={cap} draft={editDraft} onChange={onEditChange} onReset={onReset} />
        ) : (
          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg3)' }}>

            {/* Teoria + meta info */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                {cap.teoria.split('\n\n').map((block, i) => (
                  <TeoriaBlock key={i} block={block} color={cap.color} />
                ))}
                {cap.tabela && <TabelaCapitulo tabela={cap.tabela} />}
              </div>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg2)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)', minWidth: 148 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                  <Clock size={11} style={{ color: `var(${cap.color})` }} />
                  Estimado: <strong style={{ color: 'var(--text2)' }}>{cap.tempo}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                  <List size={11} style={{ color: `var(${cap.color})` }} />
                  <strong style={{ color: 'var(--text2)' }}>{cap.acoes}</strong> ações práticas
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {cap.checklist.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  capId={cap.id}
                  capColor={cap.color}
                  done={isChecked(item.id)}
                  onToggle={onToggle}
                  onSaveComplete={onSaveComplete}
                  autoDetected={autoChecked.has(item.id)}
                />
              ))}
            </div>

            {/* Dica + AI */}
            <div style={{ padding: '0 20px 16px', display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, background: `color-mix(in srgb, var(${cap.color}) 8%, var(--bg2))`, border: `1px solid color-mix(in srgb, var(${cap.color}) 25%, transparent)`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <Lightbulb size={13} style={{ color: `var(${cap.color})`, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: `var(${cap.color})`, letterSpacing: '0.07em' }}>DICA DO CAPÍTULO</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>{cap.dica}</p>
              </div>
              <button onClick={() => openAI(cap.aiPrompt)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0, alignSelf: 'center' }}>
                <Bot size={13} /> Consultar IA
              </button>
            </div>

            {/* Bloco B: Prompts de IA */}
            {cap.promptsIA?.length > 0 && (
              <BlocoPromptsIA promptsIA={cap.promptsIA} />
            )}

            {/* Bloco C: Próximo passo */}
            {cap.proximoPasso && (
              <BlocoProximoPasso proximoPasso={cap.proximoPasso} />
            )}
          </div>
        )
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function GuiaEstrategico() {
  const { user, empresaId } = useAuth();
  const { leads } = useCRM();

  const isSuperAdmin = user?.role === 'superadmin';

  /* ── Progress state ── */
  const [progress,    setProgress]    = useState({});
  const [loadingGuia, setLoadingGuia] = useState(true);
  const [openCap,     setOpenCap]     = useState('c0');
  const [revision,    setRevision]    = useState(0);

  /* ── Load progress from Supabase ── */
  useEffect(() => {
    if (!user?.id || !empresaId) return;
    let cancelled = false;
    supabase
      .from('guia_progresso')
      .select('progresso')
      .eq('usuario_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProgress(data?.progresso ?? {});
        setLoadingGuia(false);
      });
    return () => { cancelled = true; };
  }, [user?.id, empresaId]);

  /* ── Persist progress to Supabase (debounced 800ms) ── */
  useEffect(() => {
    if (!user?.id || !empresaId || loadingGuia) return;
    const timer = setTimeout(() => {
      supabase
        .from('guia_progresso')
        .upsert(
          { usuario_id: user.id, empresa_id: empresaId, progresso: progress, atualizado_em: new Date().toISOString() },
          { onConflict: 'usuario_id' }
        );
    }, 800);
    return () => clearTimeout(timer);
  }, [progress, user?.id, empresaId, loadingGuia]);

  /* ── SWOT state (para raio auto-concluído) ── */
  const [swotData, setSwotData] = useState(null);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    supabase
      .from('diagnostico_swot')
      .select('forcas,fraquezas,oportunidades,ameacas')
      .eq('empresa_id', empresaId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSwotData(data ?? null);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  /* ── Personas state (para raio auto-concluído) ── */
  const [personasData, setPersonasData] = useState(null);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    supabase
      .from('diagnostico_personas')
      .select('id')
      .eq('empresa_id', empresaId)
      .then(({ data }) => {
        if (cancelled) return;
        setPersonasData(data ?? []);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  /* ── Concorrentes state (para raio auto-concluído) ── */
  const [concorrentesData, setConcorrentesData] = useState(null);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    supabase
      .from('diagnostico_concorrentes')
      .select('id')
      .eq('empresa_id', empresaId)
      .then(({ data }) => {
        if (cancelled) return;
        setConcorrentesData(data ?? []);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  /* ── 4Ps / 6 elementos state (para raio auto-concluído) ── */
  const [quatroPsData, setQuatroPsData] = useState(null);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    supabase
      .from('diagnostico_4ps')
      .select('produto,preco,praca,promocao,pessoas,processos')
      .eq('empresa_id', empresaId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setQuatroPsData(data ?? null);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  /* ── Funil state (para raio auto-concluído) ── */
  const [funilData, setFunilData] = useState(null);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    supabase
      .from('diagnostico_funil')
      .select('etapas')
      .eq('empresa_id', empresaId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setFunilData(data?.etapas ?? null);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  /* ── KPIs/Metas state (para raio auto-concluído) ── */
  const [kpisData, setKpisData] = useState(null);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    supabase
      .from('kpis')
      .select('id,nome')
      .eq('empresa_id', empresaId)
      .then(({ data }) => {
        if (cancelled) return;
        setKpisData(data ?? []);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  /* ── ICP state (para raio auto-concluído) ── */
  const [icpData, setIcpData] = useState(null);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    supabase
      .from('diagnostico_icp')
      .select('dor_principal,gatilho_compra,decisor,ticket_medio')
      .eq('empresa_id', empresaId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setIcpData(data ?? null);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  /* ── Guia docs state (para raio auto-concluído de c3-5/c4-1/c5-4) ── */
  const [guiaDocTaskIds, setGuiaDocTaskIds] = useState([]);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    fetchGuiaDocTaskIds().then((ids) => { if (!cancelled) setGuiaDocTaskIds(ids); });
    return () => { cancelled = true; };
  }, [empresaId]);

  /* ── Customizations state ── */
  const [customizations, setCustomizations] = useState({});
  const [editMode,  setEditMode]  = useState(false);
  const [editDraft, setEditDraft] = useState({});

  /* ── Load customizations from Supabase ── */
  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    supabase
      .from('guia_customizacoes')
      .select('customizacoes')
      .eq('empresa_id', empresaId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setCustomizations(data?.customizacoes ?? {});
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  /* ── Effective chapter/layer data ── */
  const CAPITULOS_EFFECTIVE = useMemo(
    () => buildEffectiveChapters(customizations),
    [customizations],
  );

  const TASK_LAYERS_EFFECTIVE = useMemo(() => {
    const merged = { ...TASK_LAYERS };
    Object.values(customizations).forEach((cap) => {
      if (cap.taskLayers) Object.assign(merged, cap.taskLayers);
    });
    return merged;
  }, [customizations]);

  const TASK_FORM_TYPE_EFFECTIVE = useMemo(() => {
    const merged = { ...TASK_FORM_TYPE };
    Object.values(customizations).forEach((cap) => {
      if (cap.taskFormTypes) Object.assign(merged, cap.taskFormTypes);
    });
    return merged;
  }, [customizations]);

  /* ── Context value ── */
  const ctxValue = useMemo(() => ({
    getTaskLayers:       (taskId) => TASK_LAYERS_EFFECTIVE[taskId],
    getFormType:         (taskId) => TASK_FORM_TYPE_EFFECTIVE[taskId],
    editMode,
    onSwotSaved:         (newSwot)         => setSwotData(newSwot),
    onPersonasSaved:     (newPersonas)     => setPersonasData(newPersonas),
    onConcorrentesSaved: (newConcorrentes) => setConcorrentesData(newConcorrentes),
    onQuatroPsSaved:     (newPs)           => setQuatroPsData(newPs),
    onFunilSaved:        (newFunil)        => setFunilData(newFunil),
    onMetasSaved:        (newKpis)         => setKpisData(newKpis),
    onKpisSaved:         (newKpis)         => setKpisData(newKpis),
    onIcpSaved:          (newIcp)          => setIcpData(newIcp),
    onGuiaDocSaved:      (taskId)          => setGuiaDocTaskIds((prev) => prev.includes(taskId) ? prev : [...prev, taskId]),
  }), [TASK_LAYERS_EFFECTIVE, TASK_FORM_TYPE_EFFECTIVE, editMode]);

  /* ── Checklist helpers ── */
  const autoChecked = useMemo(() => buildAutoChecked(leads, swotData, personasData, concorrentesData, quatroPsData, funilData, kpisData, icpData, guiaDocTaskIds), [leads, swotData, personasData, concorrentesData, quatroPsData, funilData, kpisData, icpData, guiaDocTaskIds, revision]);

  function toggleItem(capId, itemId) {
    // Tarefas de detecção automática não são clicáveis — o estado vem sempre do banco.
    if (AUTO_DETECT_IDS.has(itemId)) return;
    setProgress((prev) => {
      const current = prev[capId] ?? [];
      const next = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];
      return { ...prev, [capId]: next };
    });
  }

  function handleSaveComplete(capId, itemId) {
    // Tarefas de detecção automática nunca gravam marcação manual: o formulário salva o dado real
    // (SWOT, persona, KPI...), e a detecção reavalia sozinha a partir dele no próximo render.
    if (AUTO_DETECT_IDS.has(itemId)) { setRevision((r) => r + 1); return; }
    setProgress((prev) => {
      const current = prev[capId] ?? [];
      if (current.includes(itemId)) return prev;
      return { ...prev, [capId]: [...current, itemId] };
    });
    setRevision((r) => r + 1);
  }

  function isChecked(cap, itemId) {
    // Tarefas de detecção automática: estado sempre derivado do banco, nunca do progresso salvo manualmente.
    if (AUTO_DETECT_IDS.has(itemId)) return autoChecked.has(itemId);
    return (progress[cap.id] ?? []).includes(itemId);
  }

  /* ── Edit mode functions ── */
  function enterEditMode() {
    const draft = {};
    CAPITULOS_EFFECTIVE.forEach((cap) => {
      draft[cap.id] = {
        titulo:    cap.titulo,
        subtitulo: cap.subtitulo,
        teoria:    cap.teoria,
        dica:      cap.dica,
        tempo:     cap.tempo,
        acoes:     cap.acoes,
        checklist: cap.checklist.map((item) => ({
          ...item,
          porque:   TASK_LAYERS_EFFECTIVE[item.id]?.porque  ?? '',
          como:     TASK_LAYERS_EFFECTIVE[item.id]?.como    ?? '',
          formType: TASK_FORM_TYPE_EFFECTIVE[item.id] ?? 'simple',
        })),
      };
    });
    setEditDraft(draft);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditDraft({});
    setEditMode(false);
  }

  function saveEditChanges() {
    const newCustomizations = {};
    Object.entries(editDraft).forEach(([capId, draft]) => {
      const taskLayers    = {};
      const taskFormTypes = {};
      draft.checklist.forEach((item) => {
        if (item.porque || item.como) {
          taskLayers[item.id] = { porque: item.porque ?? '', como: item.como ?? '' };
        }
        if (item.formType && item.formType !== 'simple') {
          taskFormTypes[item.id] = item.formType;
        }
      });
      newCustomizations[capId] = {
        titulo:    draft.titulo,
        subtitulo: draft.subtitulo,
        teoria:    draft.teoria,
        dica:      draft.dica,
        tempo:     draft.tempo,
        acoes:     draft.acoes,
        checklist: draft.checklist.map(({ porque: _p, como: _c, formType: _f, ...item }) => item),
        taskLayers,
        taskFormTypes,
      };
    });
    setCustomizations(newCustomizations);
    supabase
      .from('guia_customizacoes')
      .upsert(
        { empresa_id: empresaId, customizacoes: newCustomizations, atualizado_em: new Date().toISOString() },
        { onConflict: 'empresa_id' }
      )
      .then(({ error }) => { if (error) console.error('guia_customizacoes upsert:', error); });
    setEditMode(false);
    setEditDraft({});
  }

  function resetChapter(capId) {
    const baseChap = GUIA_CHAPTERS.find((c) => c.id === capId);
    const baseMeta = CAP_META[capId] ?? {};
    setCustomizations((prev) => {
      const next = { ...prev };
      delete next[capId];
      supabase
        .from('guia_customizacoes')
        .upsert(
          { empresa_id: empresaId, customizacoes: next, atualizado_em: new Date().toISOString() },
          { onConflict: 'empresa_id' }
        )
        .then(({ error }) => { if (error) console.error('guia_customizacoes upsert:', error); });
      return next;
    });
    if (baseChap) {
      setEditDraft((prev) => ({
        ...prev,
        [capId]: {
          titulo:    baseChap.titulo,
          subtitulo: baseChap.subtitulo,
          teoria:    baseChap.teoria,
          dica:      baseMeta.dica ?? '',
          tempo:     baseMeta.tempo ?? '',
          acoes:     baseMeta.acoes ?? baseChap.checklist.length,
          checklist: baseChap.checklist.map((item) => ({
            ...item,
            porque:   TASK_LAYERS[item.id]?.porque  ?? '',
            como:     TASK_LAYERS[item.id]?.como    ?? '',
            formType: TASK_FORM_TYPE[item.id] ?? 'simple',
          })),
        },
      }));
    }
  }

  /* ── Summary numbers ── */
  const totalItems   = CAPITULOS_EFFECTIVE.reduce((s, c) => s + c.checklist.length, 0);
  const checkedItems = CAPITULOS_EFFECTIVE.reduce((s, c) => s + c.checklist.filter((item) => isChecked(c, item.id)).length, 0);
  const overallPct   = Math.round((checkedItems / totalItems) * 100);
  const capsComplete = CAPITULOS_EFFECTIVE.filter((c) => c.checklist.every((item) => isChecked(c, item.id))).length;

  if (loadingGuia) return <SkeletonLoader rows={5} />;

  return (
    <GuiaCtx.Provider value={ctxValue}>
      <div style={{ padding: '24px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>

        {/* ── Edit mode banner (superadmin only, when active) ── */}
        {editMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(176,110,245,0.1)', border: '1px solid rgba(176,110,245,0.35)', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
            <Shield size={15} style={{ color: 'var(--purple)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple)', flex: 1 }}>Modo de edição — Super Admin</span>
            <button onClick={saveEditChanges}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Save size={12} /> Salvar alterações
            </button>
            <button onClick={cancelEdit}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border2)', borderRadius: 7, padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <X size={12} /> Cancelar
            </button>
          </div>
        )}

        {/* ── Overall progress banner ── */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
          <ProgressRing pct={overallPct} color={overallPct === 100 ? '--green' : '--accent'} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--text)', lineHeight: 1.1 }}>
              {overallPct}% concluído
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
              {checkedItems} de {totalItems} ações realizadas · {capsComplete} de {CAPITULOS_EFFECTIVE.length} capítulos completos
            </div>
            <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ width: `${overallPct}%`, height: '100%', background: overallPct === 100 ? 'var(--green)' : 'var(--accent)', borderRadius: 4, transition: 'width .4s' }} />
            </div>
          </div>
          {autoChecked.size > 0 && !editMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(240,168,50,0.1)', border: '1px solid rgba(240,168,50,0.2)', fontSize: 11, color: 'var(--amber)', flexShrink: 0 }}>
              <Zap size={12} /> {autoChecked.size} detectados automaticamente
            </div>
          )}
          {overallPct === 100 && !editMode && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Trophy size={28} style={{ color: 'var(--amber)' }} />
              <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>Guia completo!</span>
            </div>
          )}
          {isSuperAdmin && !editMode && (
            <button
              onClick={enterEditMode}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(176,110,245,0.1)', border: '1px solid rgba(176,110,245,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--purple)', cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0, transition: 'all .15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(176,110,245,0.18)'; e.currentTarget.style.borderColor = 'var(--purple)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(176,110,245,0.1)'; e.currentTarget.style.borderColor = 'rgba(176,110,245,0.3)'; }}
            >
              <Pencil size={13} /> Editar guia
            </button>
          )}
        </div>

        {/* ── Chapters ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CAPITULOS_EFFECTIVE.map((cap) => {
            const draft = editDraft[cap.id];
            const headerCap = editMode && draft
              ? { ...cap, titulo: draft.titulo, subtitulo: draft.subtitulo }
              : cap;
            return (
              <CapituloCard
                key={cap.id}
                cap={headerCap}
                progress={progress}
                autoChecked={autoChecked}
                onToggle={toggleItem}
                onSaveComplete={handleSaveComplete}
                onOpen={() => setOpenCap(openCap === cap.id ? null : cap.id)}
                isOpen={openCap === cap.id}
                editMode={editMode}
                editDraft={draft}
                onEditChange={(newDraft) => setEditDraft((prev) => ({ ...prev, [cap.id]: newDraft }))}
                onReset={() => resetChapter(cap.id)}
              />
            );
          })}
        </div>
      </div>
    </GuiaCtx.Provider>
  );
}
