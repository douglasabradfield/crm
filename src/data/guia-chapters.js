export const GUIA_CHAPTERS = [
  {
    id: 'c0',
    numero: 0,
    titulo: 'Por Que Estruturar Agora?',
    subtitulo: 'Introdução: entenda o custo de crescer sem estrutura',
    teoria: `Muitas PMEs crescem no improviso: vendas acontecem por indicação, a comunicação varia de acordo com quem faz a postagem no dia, e o funil de vendas existe apenas na cabeça do dono. Esse modelo funciona até um certo ponto — e então trava.

O crescimento bagunçado tem um custo invisível: clientes perdidos por falta de follow-up, propostas sem padrão, equipe sem clareza de papéis e energia desperdiçada em atividades que não convertem. A sensação é de estar sempre correndo, mas nunca chegando.

Um departamento comercial organizado não precisa ser caro nem complexo. Começa com clareza: saber quem você atende, como comunica, como vende e como mede. Com essa base, cada real investido rende mais e cada pessoa da equipe sabe exatamente o que fazer.

Este guia foi construído para ser prático. Cada capítulo tem teoria suficiente para embasar a decisão, e checklists diretos para você agir. Complete um capítulo por semana e, em dois meses, sua operação comercial terá uma estrutura real.`,
    checklist: [
      { id: 'c0-1', texto: 'Identifique as principais dores atuais: vendas estagnadas, comunicação inconsistente ou falta de leads?', concluido: false },
      { id: 'c0-2', texto: 'Defina 1 meta simples e mensurável para os próximos 3 meses (ex: +20% em leads qualificados)', concluido: false },
      { id: 'c0-3', texto: 'Avalie o orçamento disponível: freelancers a partir de R$500/mês ou contratação full-time?', concluido: false },
      { id: 'c0-4', texto: 'Liste quem na equipe atual pode assumir papéis comerciais mesmo que parcialmente', concluido: false },
      { id: 'c0-5', texto: 'Comprometa-se com 1 hora por semana exclusiva para este guia', concluido: false },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
    exercicio: {
      titulo: 'Defina a base da sua empresa',
      instrucao: 'Antes de qualquer estratégia, você precisa saber por que sua empresa existe. Responda com clareza e simplicidade — sem texto corporativo.',
      campos: [
        {
          id: 'missao',
          label: 'Missão',
          placeholder: 'Por que sua empresa existe além de gerar dinheiro? Ex: "Ajudar pequenos comerciantes a vender mais com menos esforço."',
          tipo: 'textarea',
        },
        {
          id: 'visao',
          label: 'Visão',
          placeholder: 'Onde você quer que sua empresa esteja daqui a 3 anos? Ex: "Ser referência em consultoria comercial para PMEs no interior de SP."',
          tipo: 'textarea',
        },
        {
          id: 'valores',
          label: 'Valores',
          placeholder: 'Quais princípios guiam as decisões da sua empresa? Ex: "Honestidade, resultado prático, respeito ao tempo do cliente."',
          tipo: 'textarea',
        },
      ],
    },
    promptsIA: [
      'Identificar minhas principais dores comerciais',
      'Definir minha prioridade nos próximos 30 dias',
      'Criar meu primeiro plano de prioridades',
    ],
    proximoPasso: {
      modulo: 'diretorio',
      label: 'Diretório Interno',
      mensagem: 'Agora registre a missão, visão e valores da sua empresa no Diretório — o repositório central do seu negócio.',
      rota: '/diretorio',
    },
  },

  {
    id: 'c1',
    numero: 1,
    titulo: 'Diagnóstico Inicial',
    subtitulo: 'Mapeie onde você está antes de decidir para onde ir',
    teoria: `Antes de qualquer estratégia, você precisa saber exatamente em que ponto está. Muitos empresários pulam essa etapa por achar que "já sabem o problema" — e acabam investindo nas soluções erradas.

**Análise SWOT simplificada**
A SWOT é uma ferramenta de quatro quadrantes que organiza o que você sabe sobre o negócio:
- **Forças (do inglês Strengths)**: o que você faz bem que os concorrentes não fazem. Pode ser atendimento, preço, especialização ou velocidade.
- **Fraquezas (do inglês Weaknesses)**: onde você perde negócios ou onde a operação custa mais do que deveria.
- **Oportunidades (do inglês Opportunities)**: tendências de mercado, nichos mal atendidos, tecnologias que você ainda não usa.
- **Ameaças (do inglês Threats)**: concorrentes crescendo, mudanças regulatórias, dependência de poucos clientes.

**Personas básicas**
Persona é o retrato do seu cliente ideal — não qualquer um que compra, mas aquele que você mais quer atender. Quanto mais você conhece esse cliente, mais fácil fica saber o que falar e como vender. Uma boa persona tem: nome fictício, cargo ou situação, principal dor que seu produto resolve, e como ela toma a decisão de compra.

**Funil de vendas atual**
Mesmo que informal, todo negócio tem um funil: alguém descobre você (topo), considera comprar (meio) e toma a decisão (fundo). O diagnóstico é mapear onde estão os gargalos: o problema é geração de leads, conversão ou retenção?

**Os 4Ps do marketing**
Produto (o que você vende e qual o diferencial), Preço (posicionamento e margem), Praça (onde e como entrega) e Promoção (como comunica e atrai). Entender os 4Ps ajuda a identificar qual alavanca tem mais impacto imediato no seu caso.

Se você vende serviço (e não produto físico), Pessoas (quem executa e atende) e Processos (como a entrega acontece na prática) costumam ter mais impacto do que Praça. Avalie os 6.`,
    checklist: [
      { id: 'c1-5', texto: 'Entreviste 3 clientes atuais: por que escolheram você? O que poderia ser melhor?', concluido: false },
      { id: 'c1-6', texto: 'Analise 2 concorrentes diretos: o que oferecem que você não oferece?', concluido: false },
      { id: 'c1-1', texto: 'Faça sua SWOT: liste pelo menos 3 itens em cada quadrante (Forças, Fraquezas, Oportunidades, Ameaças)', concluido: false },
      { id: 'c1-2', texto: 'Crie 2 ou 3 personas: nome fictício, cargo, principal dor e como decide a compra', concluido: false },
      { id: 'c1-3', texto: 'Desenhe o funil atual: como um lead chega até você hoje e quais são as etapas até a venda?', concluido: false },
      { id: 'c1-4', texto: 'Analise os 4Ps (ou 6Ps para serviços): produto, preço, praça, promoção — e se vender serviço, inclua pessoas e processos também', concluido: false },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
    exercicio: {
      titulo: 'Registre seu diagnóstico',
      instrucao: 'Preencha abaixo. Cada campo vai direto para o módulo Diagnóstico — você não precisará preencher de novo.',
      campos: [
        {
          id: 'swot_forcas',
          label: 'Forças do seu negócio',
          placeholder: 'Liste pelo menos 3 forças. Ex: atendimento rápido, preço competitivo, expertise técnica.',
          tipo: 'textarea',
          destino: { modulo: 'diagnostico', secao: 'swot', quadrante: 'forcas' },
        },
        {
          id: 'swot_fraquezas',
          label: 'Fraquezas do seu negócio',
          placeholder: 'Liste pelo menos 3 fraquezas. Ex: sem processo de follow-up, equipe pequena, sem presença digital.',
          tipo: 'textarea',
          destino: { modulo: 'diagnostico', secao: 'swot', quadrante: 'fraquezas' },
        },
        {
          id: 'swot_oportunidades',
          label: 'Oportunidades que você enxerga',
          placeholder: 'Ex: mercado local pouco atendido, nova demanda por serviço que você oferece.',
          tipo: 'textarea',
          destino: { modulo: 'diagnostico', secao: 'swot', quadrante: 'oportunidades' },
        },
        {
          id: 'swot_ameacas',
          label: 'Ameaças no seu mercado',
          placeholder: 'Ex: concorrente maior entrando na região, sazonalidade, dependência de poucos clientes.',
          tipo: 'textarea',
          destino: { modulo: 'diagnostico', secao: 'swot', quadrante: 'ameacas' },
        },
        {
          id: 'persona_principal',
          label: 'Descreva seu cliente ideal',
          placeholder: 'Nome fictício, cargo ou situação, principal dor que você resolve, como decide comprar. Ex: João, dono de oficina, 42 anos, perde clientes por falta de follow-up.',
          tipo: 'textarea',
          destino: { modulo: 'diagnostico', secao: 'personas' },
        },
      ],
    },
    promptsIA: [
      'Completar minha análise SWOT',
      'Criar minha primeira persona',
      'Desenhar o funil atual da minha empresa',
      'Transformar meu diagnóstico em 3 ações práticas',
    ],
    proximoPasso: {
      modulo: 'diagnostico',
      label: 'Diagnóstico',
      mensagem: 'Agora formalize tudo no módulo Diagnóstico — SWOT, personas, concorrentes e entrevistas de clientes já têm campos prontos esperando por você.',
      rota: '/diagnostico',
    },
  },

  {
    id: 'c2',
    numero: 2,
    titulo: 'Planejamento Geral',
    subtitulo: 'Metas SMART, orçamento e cronograma trimestral',
    teoria: `Um plano anual simples é melhor que um plano perfeito que ninguém executa. O objetivo aqui não é criar um documento de 50 páginas — é ter uma bússola clara que a equipe consulte toda semana.

**Metas SMART**
Uma meta bem definida tem 5 características: Específica (Specific — o que exatamente você quer atingir?), Mensurável (Measurable — como vai saber que atingiu?), Atingível (Attainable — é realista dado o seu contexto?), Relevante (Relevant — impacta o negócio de verdade?) e Temporal (Time-bound — qual o prazo?). Uma meta genérica como "crescer as vendas" vira uma meta bem definida quando se torna: "aumentar o faturamento mensal em 20% até dezembro, conquistando 15 novos clientes no segmento de saúde".

**Valide antes de escalar**
Antes de investir mais em marketing, confirme que o que você vende resolve um problema real para as pessoas certas. O sinal mais claro: clientes que indicam sua empresa sem você pedir. Se ainda não chegou nesse ponto, o foco do plano deve ser ajustar a oferta — não aumentar o volume de ações.

**Orçamento de marketing**
A referência do mercado é alocar entre 5% e 10% do faturamento bruto para marketing. Para empresas em crescimento acelerado, pode chegar a 15%. Divida em três categorias: criação de conteúdo, mídia paga e ferramentas/tecnologia. Comece simples e aumente conforme mede o retorno.

Se você está começando e ainda não tem faturamento consistente, defina um valor fixo mensal que cabe no seu bolso — mesmo que seja R$ 200. O que importa é ter uma linha reservada e medir o retorno.

**Revisão trimestral**
O mercado muda rápido demais para planos rígidos. Reserve 2 horas a cada 90 dias para revisar o que funcionou, o que não funcionou e ajustar as metas do trimestre seguinte. Isso é gestão ágil aplicada ao comercial.`,
    checklist: [
      { id: 'c2-1', texto: 'Defina 3 metas bem definidas para os próximos 12 meses: vendas, geração de leads e retenção de clientes', concluido: false },
      { id: 'c2-2', texto: 'Calcule quanto é 5-10% do seu faturamento atual e aloque como orçamento de marketing', concluido: false },
      { id: 'c2-3', texto: 'Crie um cronograma trimestral: quais ações serão priorizadas no 1º, 2º, 3º e 4º trimestre?', concluido: false },
      { id: 'c2-4', texto: 'Valide a oferta: você tem clientes que indicam ativamente? Colete depoimentos', concluido: false },
      { id: 'c2-5', texto: 'Agende a primeira revisão trimestral no calendário agora — 90 dias a partir de hoje', concluido: false },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
    exercicio: {
      titulo: 'Defina suas metas',
      instrucao: 'Preencha suas 3 principais metas. Elas vão direto para o módulo KPIs & Metas como OKRs — você não precisará preencher de novo.',
      campos: [
        {
          id: 'meta_1',
          label: 'Meta principal (o que você mais quer atingir nos próximos 12 meses)',
          placeholder: 'Ex: Aumentar faturamento mensal de R$ 15.000 para R$ 25.000 até dezembro, conquistando 10 novos clientes.',
          tipo: 'textarea',
          destino: { modulo: 'kpis', secao: 'okrs', campo: 'objetivo_1' },
        },
        {
          id: 'meta_2',
          label: 'Meta de geração de clientes',
          placeholder: 'Ex: Gerar 20 novos leads qualificados por mês a partir do 2º trimestre.',
          tipo: 'textarea',
          destino: { modulo: 'kpis', secao: 'okrs', campo: 'objetivo_2' },
        },
        {
          id: 'meta_3',
          label: 'Meta de retenção',
          placeholder: 'Ex: Manter pelo menos 80% dos clientes ativos por mais de 6 meses.',
          tipo: 'textarea',
          destino: { modulo: 'kpis', secao: 'okrs', campo: 'objetivo_3' },
        },
        {
          id: 'orcamento_marketing',
          label: 'Orçamento mensal de marketing',
          placeholder: 'Ex: R$ 500/mês divididos em: R$ 200 em anúncios, R$ 200 em criação de conteúdo, R$ 100 em ferramentas.',
          tipo: 'textarea',
          destino: { modulo: 'diretorio', secao: 'documentos', arquivo: 'Planejamento — Orçamento de Marketing' },
        },
      ],
    },
    promptsIA: [
      'Criar metas para o próximo trimestre',
      'Calcular e dividir meu orçamento de marketing',
      'Montar meu calendário de ações por canal',
      'Gerar plano trimestral com base nas minhas respostas',
    ],
    proximoPasso: {
      modulo: 'kpis',
      label: 'KPIs & Metas',
      mensagem: 'Agora formalize suas metas no módulo KPIs & Metas — crie seus OKRs com os objetivos que você acabou de definir.',
      rota: '/kpis',
    },
  },

  {
    id: 'c3',
    numero: 3,
    titulo: 'Equipe e Papéis — Marketing',
    subtitulo: 'Monte a estrutura mínima de marketing sem estourar o orçamento',
    teoria: `O erro mais comum é contratar alguém antes de saber o que essa pessoa vai fazer. Marketing começa com clareza de papéis, não com número de pessoas.

**Estrutura mínima funcional**
Para a maioria das PMEs, a estrutura inicial de marketing precisa de três funções — não necessariamente três pessoas:
- **Head de Marketing / Estrategista**: define o que comunicar, para quem e por quê. Pode ser o próprio dono no início.
- **Produtor de Conteúdo**: escreve, filma ou grava o que vai ser publicado. Freelancer funciona bem aqui.
- **Gestor de Social Media**: agenda, publica, responde comentários e monitora métricas. Assistente virtual (VA, do inglês Virtual Assistant) cobre bem essa função.

**Por que começar com freelancers**
Freelancers permitem testar formatos e canais sem compromisso de contratação formal (CLT). Você descobre o que funciona para o seu público antes de contratar fixo. Plataformas como Workana, 99Freelas e LinkedIn têm bons profissionais a partir de R$800/mês para tarefas específicas.

**Organograma por funções**
Desenhe o organograma baseado em responsabilidades, não em cargos. Cada função deve ter: o que produz (entregável), com que frequência e como o sucesso é medido. Isso evita ambiguidade e facilita a entrada de qualquer pessoa, CLT ou freelancer.

**Templates como acelerador**
Antes de contratar, crie templates para as principais entregas: post de feed, story, e-mail de nutrição de contatos, proposta comercial. Quando a pessoa entrar, o padrão já estará definido e o tempo para a pessoa começar a produzir cai pela metade.`,
    checklist: [
      { id: 'c3-1', texto: 'Mapeie os 3 papéis essenciais: estratégia/conteúdo, social media e análise de dados', concluido: false },
      { id: 'c3-5', texto: 'Desenhe o organograma de marketing mesmo que seja só você + 1 freelancer', concluido: false },
      { id: 'c3-4', texto: 'Defina as métricas de cada papel: o que mede o sucesso da pessoa contratada?', concluido: false },
      { id: 'c3-3', texto: 'Crie templates básicos: template de post, story e e-mail para padronizar a produção', concluido: false },
      { id: 'c3-2', texto: 'Contrate o primeiro recurso: assistente virtual (VA) para redes sociais (R$800–R$1.500/mês no modelo freelancer)', concluido: false },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
    exercicio: {
      titulo: 'Monte a estrutura de marketing',
      instrucao: 'Defina os papéis e responsabilidades. Essas informações vão para o Diretório Interno como documento da equipe de marketing.',
      campos: [
        {
          id: 'papel_estrategista',
          label: 'Quem cuida da estratégia de marketing?',
          placeholder: 'Pode ser você mesmo agora. Ex: Douglas — define o que comunicar, revisa os conteúdos e aprova campanhas.',
          tipo: 'textarea',
          destino: { modulo: 'diretorio', secao: 'documentos', arquivo: 'Estrutura da Equipe de Marketing' },
        },
        {
          id: 'papel_conteudo',
          label: 'Quem produz o conteúdo?',
          placeholder: 'Ex: Freelancer contratado via Workana — responsável por posts e stories, entrega 3x por semana.',
          tipo: 'textarea',
          destino: { modulo: 'diretorio', secao: 'documentos', arquivo: 'Estrutura da Equipe de Marketing' },
        },
        {
          id: 'papel_social',
          label: 'Quem gerencia as redes sociais?',
          placeholder: 'Ex: Assistente virtual (VA) — agenda posts, responde comentários e envia relatório semanal.',
          tipo: 'textarea',
          destino: { modulo: 'diretorio', secao: 'documentos', arquivo: 'Estrutura da Equipe de Marketing' },
        },
        {
          id: 'metricas_marketing',
          label: 'Como você vai medir o resultado de marketing?',
          placeholder: 'Ex: número de seguidores, alcance das publicações, leads gerados por mês, taxa de abertura de e-mail.',
          tipo: 'textarea',
          destino: { modulo: 'diretorio', secao: 'documentos', arquivo: 'Estrutura da Equipe de Marketing' },
        },
      ],
    },
    promptsIA: [
      'Definir papéis de marketing para minha equipe atual',
      'Criar descrição de cargo para primeiro contratado',
      'Montar rotina de marketing da semana',
      'Criar briefing para contratar um freelancer de conteúdo',
    ],
    proximoPasso: {
      modulo: 'diretorio',
      label: 'Diretório Interno',
      mensagem: 'Registre o organograma e os templates de marketing no Diretório — o repositório central da sua empresa.',
      rota: '/diretorio',
    },
  },

  {
    id: 'c4',
    numero: 4,
    titulo: 'Equipe e Papéis — Vendas e Comercial',
    subtitulo: 'Pré-venda, fechamento e pós-venda: quem faz o quê',
    teoria: `Vendas é a função que mais sofre com a falta de clareza de papéis. Quando "todo mundo vende um pouco", ninguém vende direito. A solução é dividir o processo comercial em etapas e ter responsáveis claros por cada uma.

**As três funções do comercial**
- **Pré-vendedor ou SDR (do inglês Sales Development Representative)**: prospecta, faz o primeiro contato, qualifica o lead e agenda a reunião. É o trabalho mais repetitivo e escalável — ideal para automação e cadências de prospecção ativa.
- **Closer (executivo de fechamento)**: apresenta a solução, negocia e fecha o contrato. Precisa de habilidade de escuta, gestão de objeções e conhecimento profundo do produto.
- **Pós-venda ou CS (do inglês Customer Success)**: garante que o cliente alcance o resultado prometido, faz check-ins periódicos e identifica oportunidades de expansão. É quem previne o cancelamento (churn).

**Qualificação de leads**
Antes de apresentar sua solução, vale descobrir se o lead vale o seu tempo. Use quatro perguntas concretas: (1) O cliente tem orçamento disponível? (2) Estou falando com quem decide a compra? (3) Ele tem a necessidade real que resolvo? (4) Qual o prazo dele para tomar a decisão? Em inglês, esse modelo é chamado BANT (Budget, Authority, Need, Timeline).

**Modelo híbrido por território ou produto**
Para empresas menores, um vendedor pode acumular as funções de pré-vendedor e executivo de fechamento. O importante é que a divisão seja clara dentro da semana: manhãs para prospecção e tardes para negociações ativas. Dividir por produto ou segmento de mercado também funciona bem quando o portfólio é diversificado.

**Automação como primeiro funcionário**
CRM (do inglês Customer Relationship Management, ou Gestão do Relacionamento com o Cliente) é o sistema onde você registra e acompanha cada contato, proposta e negociação — para nunca perder um cliente por falta de acompanhamento (follow-up). Antes de contratar o segundo vendedor, automatize o máximo possível: sequências de e-mail, mensagens de WhatsApp para follow-up e notificações do CRM para leads parados. Uma boa automação pode substituir 30% do trabalho manual de um pré-vendedor.`,
    checklist: [
      { id: 'c4-1', texto: 'Mapeie o funil completo: como qualificar leads, apresentar a solução e fechar o contrato', concluido: false },
      { id: 'c4-2', texto: 'Defina quem é o pré-vendedor (SDR) e o executivo de fechamento (closer) — mesmo que seja a mesma pessoa', concluido: false },
      { id: 'c4-4', texto: 'Crie o script de qualificação com as 4 perguntas-chave (BANT)', concluido: false },
      { id: 'c4-3', texto: 'Configure 1 automação básica: sequência de acompanhamento (follow-up) por WhatsApp ou e-mail para leads frios', concluido: false },
      { id: 'c4-5', texto: 'Se você já tem ou planeja contratar vendedores: estabeleça política de comissionamento — base + % sobre faturamento líquido', concluido: false },
      { id: 'c4-6', texto: 'Implante o pós-venda: WhatsApp de check-in em D+7, D+30 e D+90 após a venda', concluido: false },
    ],
    tabela: {
      colunas: ['Perfil', 'Responsabilidade', 'Remuneração estimada'],
      linhas: [
        ['Pré-vendedor (SDR)',    'Prospecção e qualificação de leads',       'R$2.000–R$2.800 + comissão por reunião agendada'],
        ['Closer',               'Apresentação, negociação e fechamento',    'R$3.000–R$5.000 + 3–8% sobre negócios fechados'],
        ['Pós-venda (CS)',        'Onboarding, retenção e expansão',          'R$2.500–R$3.500 + bônus por satisfação e renovações'],
        ['Assistente comercial',  'Suporte administrativo e acompanhamentos', 'R$1.000–R$1.500 (freelancer/part-time)'],
      ],
    },
    status: 'nao_iniciado',
    progresso: 0,
    exercicio: {
      titulo: 'Monte seu funil de vendas',
      instrucao: 'Defina as etapas do seu processo comercial. Esses dados vão direto para o CRM — quando você clicar em "Ir para o CRM", as etapas já estarão prontas para usar.',
      campos: [
        {
          id: 'funil_etapas',
          label: 'Quais são as etapas do seu processo de venda?',
          placeholder: 'Liste uma por linha. Ex:\n1. Prospecção — primeiro contato e identificação de interesse\n2. Qualificação — verificar se tem necessidade e orçamento\n3. Proposta — envio e apresentação da solução\n4. Fechamento — negociação final e contrato\n5. Cliente ganho',
          tipo: 'textarea',
          destino: { modulo: 'crm', secao: 'funis', campo: 'etapas' },
        },
        {
          id: 'script_qualificacao',
          label: 'Suas 4 perguntas de qualificação (BANT)',
          placeholder: 'Ex:\n1. Orçamento: "Você tem um valor reservado para resolver esse problema?"\n2. Decisão: "Além de você, alguém mais precisa aprovar?"\n3. Necessidade: "Qual o maior problema que isso resolve hoje?"\n4. Prazo: "Quando você precisa ter isso funcionando?"',
          tipo: 'textarea',
          destino: { modulo: 'diretorio', secao: 'documentos', arquivo: 'Script de Pré-venda' },
        },
        {
          id: 'politica_posvenda',
          label: 'Como será seu pós-venda?',
          placeholder: 'Ex: WhatsApp de check-in em D+7 ("Está tudo certo com o início?"), D+30 ("Está tendo resultado?") e D+90 ("Vamos renovar?").',
          tipo: 'textarea',
          destino: { modulo: 'regua', secao: 'sequencias', campo: 'pos_venda' },
        },
      ],
    },
    promptsIA: [
      'Criar funil de vendas para minha empresa',
      'Gerar script de primeiro contato comercial',
      'Definir processo de acompanhamento (follow-up)',
      'Montar as etapas do meu pipeline de vendas',
    ],
    proximoPasso: {
      modulo: 'crm',
      label: 'CRM',
      mensagem: 'Agora configure seu pipeline no CRM — as etapas que você definiu no exercício já estão prontas para usar.',
      rota: '/crm',
    },
  },

  {
    id: 'c5',
    numero: 5,
    titulo: 'Equipe e Papéis — Comunicação',
    subtitulo: 'Marca, tom de voz e canais: como sua empresa fala com o mundo',
    teoria: `Comunicação inconsistente é uma das principais causas de desconfiança em PMEs. Quando o Instagram tem um tom, o WhatsApp tem outro e o site tem um terceiro, o cliente não sabe com quem está falando — e não confia em quem não reconhece.

**Posicionamento de marca**
Posicionamento é a resposta clara para: "por que você, e não o concorrente?" Não é sobre ser o melhor, mas sobre ser o melhor para um público específico com uma necessidade específica. Um bom posicionamento cabe em uma frase: "A [empresa] é a única [categoria] que [benefício único] para [público-alvo]."

**Tom de voz**
Tom de voz é como a empresa fala, não o que ela fala. É formal ou descontraído? Técnico ou acessível? Empático ou direto? Defina 3 a 4 adjetivos que descrevem o tom ideal e use-os como filtro para qualquer conteúdo produzido. Se o texto não parece com esses adjetivos, revise.

**Escolha de canais**
Não tente estar em todo lugar. Para PMEs B2B, LinkedIn e WhatsApp costumam ter o melhor ROI. Para B2C, Instagram e WhatsApp dominam. Escolha 2 ou 3 canais onde seu cliente ideal já está e invista consistência neles antes de expandir.

**Guia de marca de 1 página**
Um documento simples com: logotipo (versões e uso incorreto), paleta de cores (hex), tipografia, tom de voz e exemplos de uso. Isso garante que qualquer pessoa, freelancer ou funcionário novo, reproduza a identidade corretamente desde o primeiro dia.`,
    checklist: [
      { id: 'c5-1', texto: 'Escreva o posicionamento da empresa em uma frase: "Somos a única [X] que [benefício] para [público]"', concluido: false },
      { id: 'c5-2', texto: 'Defina 3 adjetivos que descrevem o tom de voz da marca (ex: direto, empático, especialista)', concluido: false },
      { id: 'c5-3', texto: 'Escolha 2 ou 3 canais prioritários e desative os que não têm consistência de publicação', concluido: false },
      { id: 'c5-4', texto: 'Crie o guia de marca de 1 página: cores, tipografia, tom e exemplos de uso correto e incorreto', concluido: false },
      { id: 'c5-5', texto: 'Estabeleça frequência mínima de publicação por canal e coloque no calendário', concluido: false },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
  },

  {
    id: 'c6',
    numero: 6,
    titulo: 'Ferramentas e Operação Diária',
    subtitulo: 'Stack de ferramentas acessível e rotina que funciona sem depender da memória',
    teoria: `A melhor ferramenta é aquela que a equipe realmente usa. Antes de assinar qualquer software pago, teste as versões gratuitas e valide que o processo funciona. Muita PME gasta em tecnologia antes de ter o processo claro — e aí a ferramenta vira problema, não solução.

**Stack inicial recomendado**
- **Google Workspace (Docs, Sheets, Drive)**: base para documentação, planilhas de KPIs e armazenamento. Gratuito até certo limite.
- **Canva**: criação de posts, apresentações e materiais de vendas sem precisar de designer.
- **WhatsApp Business**: atendimento, follow-up e broadcast para leads e clientes. Catálogo de produtos integrado.
- **CRM (HubSpot Free ou Pipedrive)**: gestão do pipeline de vendas. HubSpot free é robusto o suficiente para equipes de até 5 pessoas.
- **Trello ou Notion**: gestão de projetos e calendário editorial. Gratuito e intuitivo.

**Rotina da operação diária**
Consistência é mais valiosa que intensidade. Uma rotina clara evita que as tarefas importantes cedam espaço para as urgentes:
- **1h/dia de conteúdo**: produzir ou revisar o que será publicado naquele dia ou nos próximos 2 dias.
- **30 min/dia de CRM**: atualizar estágios de leads, registrar interações e verificar follow-ups do dia.
- **2h/semana de análise**: segunda-feira para revisar métricas da semana anterior e ajustar prioridades.
- **Call semanal de equipe**: alinhamento de 30 minutos, sem slides, com foco em bloqueios e próximos passos.

**Integrações sem código**
Zapier e Make (ex-Integromat) conectam ferramentas sem precisar de programador. Exemplos práticos: formulário do site → lead no CRM → notificação no WhatsApp do vendedor. Comece com uma automação simples e expanda.`,
    checklist: [
      { id: 'c6-1', texto: 'Configure Google Workspace (ou Gmail + Drive): crie pastas organizadas por área e projeto', concluido: false },
      { id: 'c6-2', texto: 'Instale e configure WhatsApp Business: perfil completo, catálogo e mensagem automática de ausência', concluido: false },
      { id: 'c6-3', texto: 'Crie conta no Trello ou Notion para o calendário editorial: 4 semanas de conteúdo planejado', concluido: false },
      { id: 'c6-4', texto: 'Configure ou escolha um CRM gratuito (HubSpot ou Pipedrive): cadastre os leads atuais', concluido: false },
      { id: 'c6-5', texto: 'Estabeleça a rotina diária da equipe: blocos fixos para conteúdo, CRM e análise na agenda', concluido: false },
      { id: 'c6-6', texto: 'Crie 1 automação no Zapier: ex. formulário de contato → lead no CRM + notificação para o vendedor', concluido: false },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
  },

  {
    id: 'c7',
    numero: 7,
    titulo: 'Medição e Ajustes',
    subtitulo: 'Os 5 KPIs que toda PME precisa acompanhar e como agir quando desviam',
    teoria: `"O que não é medido não é gerenciado." A frase é clichê, mas é verdade — principalmente para PMEs que tomam decisões por feeling. Medir não precisa ser complexo. Cinco indicadores bem acompanhados valem mais do que um dashboard com 40 gráficos que ninguém olha.

**Indicadores de topo de funil (geração)**
Leads por mês é o termômetro da sua máquina de atração. Queda de leads = problema em prospecção ou conteúdo. Crescimento de leads = hora de checar se a qualidade acompanha.

**Indicadores de meio de funil (conversão)**
Taxa de fechamento (leads → clientes) revela a eficiência do processo de vendas. Se cai, o problema pode ser qualificação fraca, proposta sem valor percebido ou follow-up insuficiente.

**Indicadores de eficiência**
CAC (Custo de Aquisição de Clientes) = total gasto em vendas e marketing / número de novos clientes. Quanto menor, melhor. Compare sempre com o LTV (Lifetime Value) do cliente — a regra geral é LTV ≥ 3× CAC para o negócio ser saudável.

**Ferramentas de medição**
Google Analytics 4 para tráfego e comportamento no site. Meta Ads Manager para anúncios no Instagram/Facebook. CRM para métricas do pipeline. Planilha simples para consolidar tudo em um único relatório mensal.

**O ciclo de ajuste**
Medir sem agir é desperdício de tempo. Para cada KPI abaixo da meta, defina uma hipótese de causa e um experimento de 30 dias para testar a solução. Documente o que funcionou para não depender da memória.`,
    checklist: [
      { id: 'c7-1', texto: 'Defina os 5 KPIs prioritários do negócio (use a tabela abaixo como referência)', concluido: false },
      { id: 'c7-2', texto: 'Configure o Google Analytics 4 no site e verifique se o rastreamento está funcionando', concluido: false },
      { id: 'c7-3', texto: 'Crie o relatório mensal: planilha simples com meta, realizado, variação e plano de ação', concluido: false },
      { id: 'c7-4', texto: 'Calcule seu CAC atual: total gasto em vendas+marketing no mês ÷ novos clientes conquistados', concluido: false },
      { id: 'c7-5', texto: 'Calcule o LTV médio dos seus clientes e verifique se LTV ÷ CAC ≥ 3', concluido: false },
      { id: 'c7-6', texto: 'Identifique 1 KPI abaixo da meta, defina a causa hipotética e um experimento de 30 dias', concluido: false },
    ],
    tabela: {
      colunas: ['KPI', 'Meta de referência', 'Como medir', 'Sinal de alerta'],
      linhas: [
        ['Leads gerados/mês',      '50+ leads qualificados',        'Formulários + CRM',              'Queda de 20% por 2 semanas seguidas'],
        ['Taxa de fechamento',     '10–20% de leads → clientes',    'CRM: fechados ÷ qualificados',   'Abaixo de 8% por 30 dias'],
        ['CAC (Custo por cliente)', 'Depende do ticket médio',       'Planilha: gasto ÷ novos clientes','CAC > 33% do LTV do cliente'],
        ['Churn mensal',           'Abaixo de 3%',                  'CRM: cancelamentos ÷ base ativa','Acima de 5% em qualquer mês'],
        ['NPS (satisfação)',       'Acima de 50 (Promotores − Detratores)', 'Pesquisa trimestral',     'Abaixo de 30 ou tendência de queda'],
      ],
    },
    status: 'nao_iniciado',
    progresso: 0,
  },

  {
    id: 'c8',
    numero: 8,
    titulo: 'Integração e Crescimento Sustentável',
    subtitulo: 'Alinhe marketing, vendas e comunicação para escalar sem quebrar',
    teoria: `O maior desperdício de energia em PMEs é o desalinhamento entre as áreas. Marketing gera leads que vendas acha ruins. Vendas fecha clientes que comunicação não sabe como engajar. Comunicação cria conteúdo que não reflete o que vendas precisaria para fechar mais negócios.

**O modelo de receita previsível**
Empresas que escalam de forma sustentável têm um sistema, não um conjunto de esforços individuais. Marketing atrai → vendas converte → comunicação retém. Quando essas três funções compartilham a mesma persona, as mesmas metas e o mesmo vocabulário, o crescimento se torna previsível.

**A reunião tripartite semanal**
Trinta minutos por semana com representantes de marketing, vendas e comunicação. Pauta fixa: (1) o que foi gerado na semana, (2) o que está travado no pipeline, (3) o que vai ser publicado na próxima semana. Sem slides, sem relatórios longos — só alinhamento e decisões.

**Escalar com responsabilidade**
A regra de ouro: contrate quando a capacidade atual estiver consistentemente acima de 80% por pelo menos 60 dias. Contratar antes disso gera custo sem necessidade; contratar depois gera perda de oportunidades e burnout da equipe atual. Cada nova contratação deve estar atrelada a uma meta específica: "contratamos 1 SDR quando a taxa de conversão de leads superar 15% por 2 meses consecutivos."

**Revisão anual estratégica**
Uma vez por ano, revise todo o planejamento com olhar externo. O que mudou no mercado? As personas ainda são as mesmas? O posicionamento ainda diferencia? O que era uma oportunidade virou commodity? Use os dados dos últimos 12 meses para tomar decisões sobre os próximos 12 — não o feeling do momento.`,
    checklist: [
      { id: 'c8-1', texto: 'Agende a primeira reunião tripartite semanal (marketing + vendas + comunicação) — 30 minutos, pauta fixa', concluido: false },
      { id: 'c8-2', texto: 'Crie o documento de alinhamento: persona compartilhada, metas unificadas e glossário comum entre as áreas', concluido: false },
      { id: 'c8-3', texto: 'Defina o critério de contratação: qual meta precisa ser batida por quantos dias para contratar a próxima pessoa?', concluido: false },
      { id: 'c8-4', texto: 'Implante o SLA entre marketing e vendas: prazo máximo para contato após um lead entrar no CRM', concluido: false },
      { id: 'c8-5', texto: 'Agende a revisão anual estratégica: bloco de 4 horas, fora do escritório, para repensar o plano completo', concluido: false },
      { id: 'c8-6', texto: 'Celebre e documente: quais processos do guia geraram mais resultado? Escreva o que funcionou para replicar', concluido: false },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
  },
];
