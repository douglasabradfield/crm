# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto
Plataforma web para pequenas e médias empresas brasileiras estruturarem
seu departamento comercial. Combina conteúdo educacional (guia em 8 capítulos),
ferramentas operacionais (CRM, prospecção, régua, KPIs) e IA assistente contextual.

## Estado atual
O projeto está no estágio de boilerplate Vite. `src/` contém apenas os arquivos padrão (`App.jsx`, `main.jsx`, `index.css`, `App.css`). Toda a arquitetura descrita abaixo ainda precisa ser construída.

## Comandos

```bash
npm run dev       # inicia o servidor de desenvolvimento (Vite HMR)
npm run build     # build de produção para dist/
npm run preview   # preview do build de produção
npm run lint      # ESLint em todo o projeto
```

## Stack técnica
- React 19 + Vite
- React Router DOM v7 para navegação entre as 9 páginas
- Tailwind CSS v3 para estilos (dark theme obrigatório)
- Recharts para gráficos e visualizações
- lucide-react para ícones
- date-fns para manipulação de datas
- Context API para estado global compartilhado
- localStorage para persistência de dados no MVP
- Anthropic API (fetch direto) para chamadas de IA
- Modelo IA: `claude-sonnet-4-20250514`, `max_tokens: 800`

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

## Módulos do app (9 páginas)

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

## Arquitetura de estado (Context API)

O provider raiz em `src/store/index.js` expõe:
```javascript
{
  ui: { activePage, aiPanelOpen, aiPanelContext },
  crm: { leads: [], pipeline: {} },
  metas: { kpis: [], targets: {} },
  diretorio: { folders: {}, passwords: [] },
  redes: { metrics: {}, posts: [], calendar: {} }
}
```

## Assistente IA (AIPanel.jsx)

- Slide-in pela direita, largura 380px, overlay semitransparente
- Dot verde pulsando no header (status online)
- Bolhas: usuário (direita, accent-bg) e IA (esquerda, bg3)
- Animação de digitação com 3 pontos bouncing
- Quick chips contextuais ao abrir
- Enter envia, Shift+Enter quebra linha

System prompt base injetado em todas as chamadas:
```
Você é um assistente especializado em estratégia comercial e marketing
para PMEs brasileiras. Dê respostas práticas, diretas e acionáveis.
Use linguagem brasileira informal mas profissional. Máx 200 palavras
por resposta, mas muito úteis. Crie templates e scripts quando pedido.
Quando criar mensagens de prospecção ou follow-up, formate claramente.
```

Adicionar contexto da página ativa ao system prompt (dados de leads, KPIs, etc.).

## Integrações externas (src/services/)

### API Receita Federal (gratuita)
```
GET https://receitaws.com.br/v1/cnpj/{cnpj}
Retorna: razao_social, cnae_fiscal, municipio, uf, situacao, capital_social
```

### Hunter.io (VITE_HUNTER_API_KEY)
```
GET https://api.hunter.io/v2/domain-search?domain={domain}&api_key={key}
Retorna: emails verificados com score de confiança
```

### Apollo.io (VITE_APOLLO_API_KEY)
```
POST https://api.apollo.io/v1/people/search
Headers: x-api-key: {key}
Body: { q_organization_domains: [domain], page: 1 }
Retorna: phone_numbers, emails, LinkedIn
```

### Anthropic API (VITE_ANTHROPIC_API_KEY)
```
POST https://api.anthropic.com/v1/messages
Headers: x-api-key: {key}, anthropic-version: 2023-06-01
Body: { model, max_tokens, system, messages }
```

## Regras de desenvolvimento

1. SEMPRE dark theme — nunca usar fundo branco ou cinza claro
2. Componentes de UI reutilizáveis em `src/components/UI/`
3. Dados mockados em `src/data/` para todo o MVP (sem backend ainda)
4. Cada integração externa tem arquivo próprio em `src/services/`
5. API keys via `import.meta.env.VITE_*`
6. Erros de API: mensagem amigável em português
7. Senhas no Diretório: mascaradas (`••••••••`) por padrão, revelar 3s ao clicar
8. Loading states: skeleton ou spinner em toda chamada assíncrona
9. Animação fadeIn ao trocar de página (CSS keyframes simples)
10. Todos os números monetários: `toLocaleString('pt-BR')` com prefixo R$
