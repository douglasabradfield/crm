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
      { id: 'c0-missao', texto: 'Escreva a missão da sua empresa: por que ela existe, além de gerar dinheiro? (1 frase simples, sem texto corporativo)', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Identidade da Empresa', campo: 'missao' } },
      { id: 'c0-visao', texto: 'Escreva a visão: onde você quer que sua empresa esteja daqui a 3 anos?', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Identidade da Empresa', campo: 'visao' } },
      { id: 'c0-valores', texto: 'Defina os valores: quais princípios guiam as decisões da sua empresa? (3 a 5 palavras ou frases curtas)', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Identidade da Empresa', campo: 'valores' } },
      { id: 'c0-1', texto: 'Identifique as principais dores atuais: vendas estagnadas, comunicação inconsistente ou falta de leads?', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Identidade da Empresa', campo: 'dores_principais' } },
      { id: 'c0-2', texto: 'Defina 1 meta simples e mensurável para os próximos 3 meses (ex: +20% em leads qualificados)', concluido: false, destino: { modulo: 'kpis', secao: 'okrs', campo: 'meta_3_meses' } },
      { id: 'c0-3', texto: 'Avalie o orçamento disponível: freelancers a partir de R$500/mês ou contratação full-time?', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Identidade da Empresa', campo: 'orcamento_inicial' } },
      { id: 'c0-4', texto: 'Liste quem na equipe atual pode assumir papéis comerciais mesmo que parcialmente', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Identidade da Empresa', campo: 'equipe_atual' } },
      { id: 'c0-5', texto: 'Comprometa-se com 1 hora por semana exclusiva para este guia', concluido: false, destino: { modulo: 'guia', campo: 'comprometimento' } },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
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
      { id: 'c1-5', texto: 'Entreviste 3 clientes atuais: por que escolheram você? O que poderia ser melhor?', concluido: false, destino: { modulo: 'diagnostico', secao: 'entrevistas' } },
      { id: 'c1-6', texto: 'Analise 2 concorrentes diretos: o que oferecem que você não oferece?', concluido: false, destino: { modulo: 'diagnostico', secao: 'concorrentes' } },
      { id: 'c1-1', texto: 'Faça sua SWOT: liste pelo menos 3 itens em cada quadrante (Forças, Fraquezas, Oportunidades, Ameaças)', concluido: false, destino: { modulo: 'diagnostico', secao: 'swot' } },
      { id: 'c1-2', texto: 'Crie 2 ou 3 personas: nome fictício, cargo, principal dor e como decide a compra', concluido: false, destino: { modulo: 'diagnostico', secao: 'personas' } },
      { id: 'c1-3', texto: 'Desenhe o funil atual: como um lead chega até você hoje e quais são as etapas até a venda?', concluido: false, destino: { modulo: 'crm', secao: 'funis' } },
      { id: 'c1-4', texto: 'Analise os 4Ps (ou 6Ps para serviços): produto, preço, praça, promoção — e se vender serviço, inclua pessoas e processos também', concluido: false, destino: { modulo: 'diagnostico', secao: '4ps' } },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
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
      { id: 'c2-1', texto: 'Defina 3 metas bem definidas para os próximos 12 meses: vendas, geração de leads e retenção de clientes', concluido: false, destino: { modulo: 'kpis', secao: 'okrs' } },
      { id: 'c2-2', texto: 'Calcule quanto é 5-10% do seu faturamento atual e aloque como orçamento de marketing', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Orçamento de Marketing' } },
      { id: 'c2-3', texto: 'Crie um cronograma trimestral: quais ações serão priorizadas no 1º, 2º, 3º e 4º trimestre?', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Cronograma Trimestral' } },
      { id: 'c2-4', texto: 'Valide a oferta: você tem clientes que indicam ativamente? Colete depoimentos', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Validação da Oferta' } },
      { id: 'c2-5', texto: 'Agende a primeira revisão trimestral no calendário agora — 90 dias a partir de hoje', concluido: false, destino: { modulo: 'kpis', secao: 'okrs', campo: 'revisao_trimestral' } },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
    promptsIA: [
      'Criar metas para o próximo trimestre',
      'Calcular e dividir meu orçamento de marketing',
      'Montar meu calendário de ações por canal',
      'Gerar plano trimestral com base nas minhas respostas',
    ],
    proximoPasso: {
      modulo: 'kpis',
      label: 'Metas e Indicadores',
      mensagem: 'Agora formalize suas metas no módulo Metas e Indicadores — crie seus OKRs com os objetivos que você acabou de definir.',
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
      { id: 'c3-1', texto: 'Mapeie os 3 papéis essenciais: estratégia/conteúdo, social media e análise de dados', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Estrutura da Equipe de Marketing' } },
      { id: 'c3-5', texto: 'Desenhe o organograma de marketing mesmo que seja só você + 1 freelancer', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Estrutura da Equipe de Marketing' } },
      { id: 'c3-4', texto: 'Defina as métricas de cada papel: o que mede o sucesso da pessoa contratada?', concluido: false, destino: { modulo: 'kpis', secao: 'kpis' } },
      { id: 'c3-3', texto: 'Crie templates básicos: template de post, story e e-mail para padronizar a produção', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Templates de Marketing' } },
      { id: 'c3-2', texto: 'Contrate o primeiro recurso: assistente virtual (VA) para redes sociais (R$800–R$1.500/mês no modelo freelancer)', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Estrutura da Equipe de Marketing' } },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
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
      { id: 'c4-1', texto: 'Mapeie o funil completo: como qualificar leads, apresentar a solução e fechar o contrato', concluido: false, destino: { modulo: 'crm', secao: 'funis' } },
      { id: 'c4-2', texto: 'Defina quem é o pré-vendedor (SDR) e o executivo de fechamento (closer) — mesmo que seja a mesma pessoa', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Estrutura da Equipe Comercial' } },
      { id: 'c4-4', texto: 'Crie o script de qualificação com as 4 perguntas-chave (BANT)', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Script de Pré-venda' } },
      { id: 'c4-3', texto: 'Configure 1 automação básica: sequência de acompanhamento (follow-up) por WhatsApp ou e-mail para leads frios', concluido: false, destino: { modulo: 'regua', secao: 'sequencias' } },
      { id: 'c4-5', texto: 'Se você já tem ou planeja contratar vendedores: estabeleça política de comissionamento — base + % sobre faturamento líquido', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Política de Comissionamento' } },
      { id: 'c4-6', texto: 'Implante o pós-venda: WhatsApp de check-in em D+7, D+30 e D+90 após a venda', concluido: false, destino: { modulo: 'regua', secao: 'sequencias', campo: 'pos_venda' } },
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
    promptsIA: [
      'Criar funil de vendas para minha empresa',
      'Gerar script de primeiro contato comercial',
      'Definir processo de acompanhamento (follow-up)',
      'Montar as etapas do meu pipeline de vendas',
    ],
    proximoPasso: {
      modulo: 'crm',
      label: 'CRM',
      mensagem: 'Agora configure seu pipeline no CRM — as etapas que você definiu nas tarefas já estão prontas para usar.',
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
Não tente estar em todo lugar. Para empresas que vendem para outras empresas (B2B), LinkedIn e WhatsApp costumam ter o melhor retorno. Para empresas que vendem direto para o consumidor final (B2C), Instagram e WhatsApp dominam. Escolha 2 ou 3 canais onde seu cliente ideal já está e invista consistência neles antes de expandir.

**Guia de marca de 1 página**
Um documento simples com: logotipo (versões e uso incorreto), paleta de cores (hex), tipografia, tom de voz e exemplos de uso. Isso garante que qualquer pessoa, freelancer ou funcionário novo, reproduza a identidade corretamente desde o primeiro dia.`,
    checklist: [
      { id: 'c5-1', texto: 'Escreva o posicionamento da empresa em uma frase: "Somos a única [X] que [benefício] para [público]"', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Guia de Marca' } },
      { id: 'c5-2', texto: 'Defina 3 adjetivos que descrevem o tom de voz da marca (ex: direto, empático, especialista)', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Guia de Marca' } },
      { id: 'c5-3', texto: 'Escolha 2 ou 3 canais prioritários e desative os que não têm consistência de publicação', concluido: false, destino: { modulo: 'redes', secao: 'canais' } },
      { id: 'c5-4', texto: 'Crie o guia de marca de 1 página: cores, tipografia, tom e exemplos de uso correto e incorreto', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Guia de Marca' } },
      { id: 'c5-5', texto: 'Estabeleça frequência mínima de publicação por canal e coloque no calendário', concluido: false, destino: { modulo: 'redes', secao: 'calendario' } },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
    promptsIA: [
      'Escrever o posicionamento da minha empresa em uma frase',
      'Definir tom de voz da minha marca',
      'Escolher canais prioritários para meu perfil de empresa',
      'Criar guia de comunicação em 1 página',
    ],
    proximoPasso: {
      modulo: 'redes',
      label: 'Redes Sociais',
      mensagem: 'Agora configure sua presença nos canais prioritários no módulo Redes Sociais.',
      rota: '/redes',
    },
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
- **WhatsApp Business**: atendimento, acompanhamento (follow-up) e broadcast para leads e clientes. Catálogo de produtos integrado.
- **CRM desta plataforma**: gerencie seu pipeline de vendas, leads e clientes em um só lugar — já integrado ao seu guia e assistente IA.
- **Trello ou Notion**: gestão de projetos e calendário editorial. Gratuito e intuitivo.

**Rotina da operação diária**
Consistência é mais valiosa que intensidade. Uma rotina clara evita que as tarefas importantes cedam espaço para as urgentes:
- **1h/dia de conteúdo**: produzir ou revisar o que será publicado naquele dia ou nos próximos 2 dias.
- **30 min/dia de CRM**: atualizar estágios de leads, registrar interações e verificar follow-ups do dia.
- **2h/semana de análise**: segunda-feira para revisar métricas da semana anterior e ajustar prioridades.
- **Call semanal de equipe**: alinhamento de 30 minutos, sem slides, com foco em bloqueios e próximos passos.

**Integrações sem código**
Zapier e Make (ex-Integromat) conectam sistemas sem precisar de programador (são chamadas de ferramentas no-code, ou sem código). Exemplos práticos: formulário do site → lead no CRM → notificação no WhatsApp do vendedor. Comece com uma automação simples e expanda.`,
    checklist: [
      { id: 'c6-1', texto: 'Configure Google Workspace (ou Gmail + Drive): crie pastas organizadas por área e projeto', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Rotina Comercial' } },
      { id: 'c6-2', texto: 'Instale e configure WhatsApp Business: perfil completo, catálogo e mensagem automática de ausência', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Rotina Comercial' } },
      { id: 'c6-3', texto: 'Crie conta no Trello ou Notion para o calendário editorial: 4 semanas de conteúdo planejado', concluido: false, destino: { modulo: 'redes', secao: 'calendario' } },
      { id: 'c6-4', texto: 'Configure o CRM desta plataforma: crie seu primeiro funil e cadastre os leads atuais', concluido: false, destino: { modulo: 'crm', secao: 'funis' } },
      { id: 'c6-5', texto: 'Estabeleça a rotina diária da equipe: blocos fixos para conteúdo, CRM e análise na agenda', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Rotina Comercial' } },
      { id: 'c6-6', texto: 'Crie 1 automação no Zapier: ex. formulário de contato → lead no CRM + notificação para o vendedor', concluido: false, destino: { modulo: 'regua', secao: 'sequencias' } },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
    promptsIA: [
      'Montar minha rotina comercial diária',
      'Criar lista de ferramentas essenciais com custo zero',
      'Gerar passo a passo de prospecção para o Diretório',
      'Criar calendário editorial para as próximas 4 semanas',
    ],
    proximoPasso: {
      modulo: 'dashboard',
      label: 'Painel',
      mensagem: 'Veja no Painel como sua operação está performando — as métricas do CRM e das metas já aparecem lá.',
      rota: '/',
    },
  },

  {
    id: 'c7',
    numero: 7,
    titulo: 'Medição e Ajustes',
    subtitulo: 'Os 5 KPIs que toda PME precisa acompanhar e como agir quando desviam',
    teoria: `"O que não é medido não é gerenciado." A frase é clichê, mas é verdade — principalmente para PMEs que tomam decisões por intuição do momento. Medir não precisa ser complexo. Cinco indicadores bem acompanhados valem mais do que um dashboard com 40 gráficos que ninguém olha.

**Indicadores de topo de funil (geração)**
Leads por mês é o termômetro da sua máquina de atração. Queda de leads = problema em prospecção ou conteúdo. Crescimento de leads = hora de checar se a qualidade acompanha.

**Indicadores de meio de funil (conversão)**
Taxa de fechamento (leads → clientes) revela a eficiência do processo de vendas. Se cai, o problema pode ser qualificação fraca, proposta sem valor percebido ou acompanhamento (follow-up) insuficiente.

**Indicadores de eficiência**
CAC (Custo de Aquisição de Cliente) = total gasto em vendas e marketing / número de novos clientes. Quanto menor, melhor. Compare sempre com o LTV (Valor do Tempo de Vida do Cliente — quanto um cliente gera de receita enquanto permanece com você) — a regra geral é LTV ≥ 3× CAC para o negócio ser saudável.

**Ferramentas de medição**
Google Analytics 4 para tráfego e comportamento no site. Meta Ads Manager para anúncios no Instagram/Facebook. CRM para métricas do pipeline. Planilha simples para consolidar tudo em um único relatório mensal.

**NPS — lealdade geral**
O NPS (Net Promoter Score) mede se os seus clientes indicariam sua empresa para outras pessoas. A pergunta é simples: "De 0 a 10, quanto você indicaria nossa empresa?" Promotores (9–10) são clientes satisfeitos que geram novos negócios. Detratores (0–6) correm risco de cancelar e podem prejudicar sua reputação. A fórmula é % de Promotores − % de Detratores. Aplique trimestralmente por WhatsApp ou e-mail.

**CSAT — satisfação com cada entrega**
Enquanto o NPS mede se o cliente recomendaria sua empresa no geral, o CSAT (Índice de Satisfação do Cliente) mede como ele avaliou uma experiência específica: o atendimento de hoje, a entrega do projeto, o suporte recebido. A pergunta é simples: "De 1 a 5, como você avalia esse atendimento?" Envie logo depois de cada entrega importante. Para prestadores de serviço, o CSAT costuma ser mais acionável que o NPS — porque aponta exatamente qual entrega precisa melhorar, não só a impressão geral.

**O ciclo de ajuste**
Medir sem agir é desperdício de tempo. Para cada KPI abaixo da meta, defina uma hipótese de causa e um experimento de 30 dias para testar a solução. Documente o que funcionou para não depender da memória.`,
    checklist: [
      { id: 'c7-1', texto: 'Defina os 5 KPIs prioritários do negócio (use a tabela abaixo como referência)', concluido: false, destino: { modulo: 'kpis', secao: 'kpis' } },
      { id: 'c7-2', texto: 'Configure o Google Analytics 4 no site e verifique se o rastreamento está funcionando', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Ferramentas de Medição' } },
      { id: 'c7-3', texto: 'Crie o relatório mensal: planilha simples com meta, realizado, variação e plano de ação', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Modelo de Relatório Mensal' } },
      { id: 'c7-4', texto: 'Calcule seu CAC atual: total gasto em vendas+marketing no mês ÷ novos clientes conquistados', concluido: false, destino: { modulo: 'kpis', secao: 'kpis', campo: 'cac' } },
      { id: 'c7-5', texto: 'Calcule o LTV médio dos seus clientes e verifique se LTV ÷ CAC ≥ 3', concluido: false, destino: { modulo: 'kpis', secao: 'kpis', campo: 'ltv' } },
      { id: 'c7-6', texto: 'Identifique 1 KPI abaixo da meta, defina a causa hipotética e um experimento de 30 dias', concluido: false, destino: { modulo: 'kpis', secao: 'okrs' } },
    ],
    tabela: {
      colunas: ['KPI', 'Meta de referência', 'Como medir', 'Sinal de alerta'],
      linhas: [
        ['Leads gerados/mês',      '50+ leads qualificados',        'Formulários + CRM',              'Queda de 20% por 2 semanas seguidas'],
        ['Taxa de fechamento',     '10–20% de leads → clientes',    'CRM: fechados ÷ qualificados',   'Abaixo de 8% por 30 dias'],
        ['CAC (Custo por cliente)', 'Depende do ticket médio',       'Planilha: gasto ÷ novos clientes','CAC > 33% do LTV do cliente'],
        ['Cancelamento mensal (Churn)', 'Abaixo de 3%',                  'CRM: cancelamentos ÷ base ativa','Acima de 5% em qualquer mês'],
        ['NPS — lealdade geral (Net Promoter Score)', 'Acima de 50 (Promotores − Detratores)', 'Pesquisa trimestral', 'Abaixo de 30 ou tendência de queda'],
        ['CSAT por entrega',       'Acima de 4,0 (em 5,0)',         'Pesquisa pós-atendimento ou pós-entrega', 'Abaixo de 3,5 em qualquer mês ou queda consecutiva'],
      ],
    },
    status: 'nao_iniciado',
    progresso: 0,
    promptsIA: [
      'Escolher meus 5 principais indicadores',
      'Criar painel de metas para o trimestre',
      'Gerar relatório mensal simples',
      'Identificar o que parar de fazer',
    ],
    proximoPasso: {
      modulo: 'kpis',
      label: 'Metas e Indicadores',
      mensagem: 'Configure seus indicadores no módulo Metas e Indicadores — crie os KPIs que você acabou de definir e acompanhe a evolução.',
      rota: '/kpis',
    },
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
A regra de ouro: contrate quando a capacidade atual estiver consistentemente acima de 80% por pelo menos 60 dias. Contratar antes disso gera custo sem necessidade; contratar depois gera perda de oportunidades e esgotamento da equipe atual (burnout). Cada nova contratação deve estar atrelada a uma meta específica: "contratamos 1 pré-vendedor (SDR) quando a taxa de conversão de leads superar 15% por 2 meses consecutivos."

**Revisão anual estratégica**
Uma vez por ano, revise todo o planejamento com olhar externo. O que mudou no mercado? As personas ainda são as mesmas? O posicionamento ainda diferencia? O que era uma oportunidade virou commodity? Use os dados dos últimos 12 meses para tomar decisões sobre os próximos 12 — não a intuição do momento.`,
    checklist: [
      { id: 'c8-1', texto: 'Agende a primeira reunião tripartite semanal (marketing + vendas + comunicação) — 30 minutos, pauta fixa', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Plano Comercial' } },
      { id: 'c8-2', texto: 'Crie o documento de alinhamento: persona compartilhada, metas unificadas e glossário comum entre as áreas', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Plano Comercial' } },
      { id: 'c8-3', texto: 'Defina o critério de contratação: qual meta precisa ser batida por quantos dias para contratar a próxima pessoa?', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Plano Comercial' } },
      { id: 'c8-4', texto: 'Implante o acordo de tempo de resposta (SLA) entre marketing e vendas: prazo máximo para o primeiro contato após um lead entrar no CRM', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Plano Comercial' } },
      { id: 'c8-5', texto: 'Agende a revisão anual estratégica: bloco de 4 horas, fora do escritório, para repensar o plano completo', concluido: false, destino: { modulo: 'kpis', secao: 'okrs' } },
      { id: 'c8-6', texto: 'Celebre e documente: quais processos do guia geraram mais resultado? Escreva o que funcionou para replicar', concluido: false, destino: { modulo: 'diretorio', arquivo: 'Plano Comercial' } },
    ],
    tabela: null,
    status: 'nao_iniciado',
    progresso: 0,
    promptsIA: [
      'Revisar progresso geral do meu comercial',
      'Criar plano de crescimento para os próximos 90 dias',
      'Identificar próximos passos de contratação',
      'Gerar resumo do meu plano comercial completo',
    ],
    proximoPasso: {
      modulo: 'dashboard',
      label: 'Painel',
      mensagem: 'Parabéns — você concluiu o guia! Acesse o Painel para ver sua operação completa e acompanhar o crescimento a partir de agora.',
      rota: '/',
    },
  },
];
