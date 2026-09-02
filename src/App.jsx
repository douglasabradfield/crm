import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useUI } from './store/index.js';
import { useAuth } from './store/auth.js';
import { useIsMobile } from './hooks/useMediaQuery.js';
import { primeiraRotaPermitida } from './data/permissions.js';
import { useCRM } from './store/crm.js';
import { useNotifications } from './hooks/useNotifications.js';
import { SkeletonPageLoader } from './components/UI/SkeletonLoader.jsx';

import Sidebar          from './components/Layout/Sidebar';
import Topbar           from './components/Layout/Topbar';
import AIPanel          from './components/Layout/AIPanel';
import LoginPage        from './components/Auth/LoginPage';
import ProtectedRoute   from './components/Auth/ProtectedRoute';
import SemPermissoesEmpresa from './components/Auth/SemPermissoesEmpresa';

import Dashboard        from './pages/Dashboard';
import GuiaEstrategico  from './pages/GuiaEstrategico';
import CRM              from './pages/CRM';
import ProspeccaoAtiva  from './pages/ProspeccaoAtiva';
import ReguaComunicacao from './pages/ReguaComunicacao';
import KPIs             from './pages/KPIs';
import Diagnostico      from './pages/Diagnostico';
import DiretorioInterno from './pages/DiretorioInterno';
import RedesSociais     from './pages/RedesSociais';
import Configuracoes    from './pages/Configuracoes';
import Tickets         from './pages/Tickets';
import AceitarConvite  from './pages/AceitarConvite';

const PAGE_META = {
  '/':              { title: 'Painel',                subtitle: 'Visão geral do seu departamento comercial' },
  '/guia':          { title: 'Guia Estratégico',       subtitle: '10 capítulos para estruturar seu comercial' },
  '/crm':           { title: 'CRM',                    subtitle: 'Gestão do pipeline de vendas' },
  '/prospeccao':    { title: 'Prospecção Ativa',        subtitle: 'Encontre e qualifique novos leads' },
  '/regua':         { title: 'Régua de Comunicação',    subtitle: 'Fluxos de nurturing e follow-up' },
  '/kpis':          { title: 'Metas e Indicadores',      subtitle: 'Indicadores de desempenho e metas' },
  '/diagnostico':   { title: 'Diagnóstico',             subtitle: 'Análise SWOT e maturidade comercial' },
  '/diretorio':     { title: 'Diretório Interno',       subtitle: 'SOPs, senhas e templates' },
  '/redes':         { title: 'Redes Sociais',           subtitle: 'Métricas e calendário editorial' },
  '/configuracoes': { title: 'Configurações',           subtitle: 'Permissões e usuários do sistema' },
  '/tickets':       { title: 'Chamados',               subtitle: 'Atendimento interno e externo'    },
};

// '/' não entra aqui — o contexto do Painel é montado com dados reais em buildDashboardContext().
const PAGE_AI_CONTEXT = {
  '/guia':          'Guia Estratégico: capítulos 1-3 completos (100%), capítulo 4 em andamento (60%), capítulos 5-8 pendentes.',
  '/crm':           'Pipeline: 4 leads em Prospecção, 3 em Qualificação, 3 em Proposta, 2 em Negociação. Total R$84.500. 3 follow-ups vencidos há mais de 5 dias.',
  '/prospeccao':    'Última busca: CNAE 6201-5 (Desenvolvimento de software), 47 empresas encontradas. Hunter.io integrado e ativo. Apollo.io inativo.',
  '/regua':         '3 fluxos de nurturing ativos. Último template enviado: "Follow-up após demo". Taxa de abertura média: 34%.',
  '/kpis':          'Receita R$127k (meta R$150k, 85%). Novos clientes 8 (meta 12, 67%). Churn 2,1% (meta <3%, OK). CAC R$420 (meta R$350, acima).',
  '/diagnostico':   'Score de maturidade comercial: 6,2/10. SWOT: 4 forças, 3 fraquezas, 2 oportunidades, 2 ameaças identificadas.',
  '/diretorio':     '12 SOPs, 3 senhas cadastradas, 8 templates salvos. Pasta aberta: /Documentos.',
  '/redes':         'Instagram 1,2k seguidores, engajamento 4,2%, 3 posts/semana. LinkedIn 890 conexões, 2 posts/semana.',
  '/configuracoes': '',
  '/tickets':       '8 tickets ativos: 3 abertos, 2 em andamento, 1 aguardando cliente, 2 concluídos. 1 ticket vencido. Prioridades: 3 alta, 3 média, 2 baixa.',
};

function resolveRoute(pathname) {
  if (pathname === '/') return '/';
  return Object.keys(PAGE_META).find((k) => k !== '/' && pathname.startsWith(k)) ?? '/';
}

// Contexto do Painel montado a partir de dados reais do CRM (nunca fixo).
function buildDashboardContext(leads, overdueCount) {
  if (leads.length === 0) return 'Nenhum lead cadastrado ainda.';
  const abertos = leads.filter((l) => l.col !== 'ganho' && !l.convertido);
  const pipelineValor = abertos.reduce((s, l) => s + (l.value || 0), 0);
  const convertidos = leads.filter((l) => l.convertido).length;
  const conversao = Math.round((convertidos / leads.length) * 100);
  return `${abertos.length} leads em aberto, pipeline R$ ${pipelineValor.toLocaleString('pt-BR')}, ` +
    `taxa de conversão ${conversao}%, ${overdueCount} follow-up${overdueCount !== 1 ? 's' : ''} vencido${overdueCount !== 1 ? 's' : ''}.`;
}

function Layout() {
  const location = useLocation();
  const { aiState, openAI, closeAI } = useUI();
  const { hasPermission } = useAuth();
  const { leads } = useCRM();
  const { overdueCount } = useNotifications();
  const isMobile = useIsMobile();
  const [navOpen, setNavOpen] = useState(false);

  // Menu off-canvas fecha sozinho ao trocar de rota (padrão do React de ajustar
  // estado durante a renderização, sem efeito).
  const [navPath, setNavPath] = useState(location.pathname);
  if (navPath !== location.pathname) {
    setNavPath(location.pathname);
    if (navOpen) setNavOpen(false);
  }

  const routeKey    = resolveRoute(location.pathname);
  const { title, subtitle } = PAGE_META[routeKey];
  const pageContext = routeKey === '/' ? buildDashboardContext(leads, overdueCount) : (PAGE_AI_CONTEXT[routeKey] ?? '');

  return (
    <div className="app-layout">
      <Sidebar
        mobile={isMobile}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onOpenAI={() => { setNavOpen(false); openAI(); }}
      />

      {isMobile && navOpen && (
        <div
          aria-hidden="true"
          onClick={() => setNavOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 75 }}
        />
      )}

      <div className="main-area">
        <Topbar
          title={title}
          subtitle={subtitle}
          onOpenAI={() => openAI()}
          onOpenNav={isMobile ? () => setNavOpen(true) : null}
        />

        <main className="page-area" style={isMobile ? { padding: 16 } : undefined}>
          <div className="page-enter" key={location.pathname}>
            <Routes>
              <Route path="/" element={
                hasPermission('dashboard', 'view')
                  ? <ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>
                  : <Navigate to={primeiraRotaPermitida(hasPermission)} replace />
              } />
              <Route path="/guia" element={
                <ProtectedRoute module="guia"><GuiaEstrategico /></ProtectedRoute>
              } />
              <Route path="/crm" element={
                <ProtectedRoute module="crm"><CRM /></ProtectedRoute>
              } />
              <Route path="/prospeccao" element={
                <ProtectedRoute module="prospeccao"><ProspeccaoAtiva /></ProtectedRoute>
              } />
              <Route path="/regua" element={
                <ProtectedRoute module="regua"><ReguaComunicacao /></ProtectedRoute>
              } />
              <Route path="/kpis" element={
                <ProtectedRoute module="kpis"><KPIs /></ProtectedRoute>
              } />
              <Route path="/diagnostico" element={
                <ProtectedRoute module="diagnostico"><Diagnostico /></ProtectedRoute>
              } />
              <Route path="/diretorio" element={
                <ProtectedRoute module="diretorio"><DiretorioInterno /></ProtectedRoute>
              } />
              <Route path="/redes" element={
                <ProtectedRoute module="redes"><RedesSociais /></ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute module="configuracoes"><Configuracoes /></ProtectedRoute>
              } />
              <Route path="/tickets" element={
                <ProtectedRoute module="tickets"><Tickets /></ProtectedRoute>
              } />
            </Routes>
          </div>
        </main>
      </div>

      <AIPanel
        open={aiState.open}
        onClose={closeAI}
        initialPrompt={aiState.prompt}
        promptKey={aiState.promptKey}
        pageContext={pageContext}
      />
    </div>
  );
}

function AuthGate() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }
  if (isAuthenticated && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading, semPapelNaEmpresa, isSuperadmin } = useAuth();
  const location = useLocation();

  // Rota pública de convite — não depende de autenticação, não bloquear no loading.
  if (location.pathname.startsWith('/convite/')) {
    return (
      <Routes>
        <Route path="/convite/:codigo" element={<AceitarConvite />} />
      </Routes>
    );
  }

  // Wait for Supabase to confirm/deny the session before deciding where to route.
  if (loading) {
    return <SkeletonPageLoader />;
  }

  if (location.pathname === '/login') {
    // Sessão já ativa em /login (ex.: retorno de magic link, que recarrega a
    // página em vez de navegar por JS): manda para dentro do app.
    if (isAuthenticated) {
      return <Navigate to="/" replace />;
    }
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Empresa ativa sem papel resolvido: tela de recuperação em vez de um app sem
  // rotas. Superadmin continua podendo chegar a Configurações → Empresas para
  // trocar de volta (hasPermission já libera todo módulo para superadmin).
  if (semPapelNaEmpresa && !(isSuperadmin && location.pathname.startsWith('/configuracoes'))) {
    return <SemPermissoesEmpresa />;
  }

  return <Layout />;
}
