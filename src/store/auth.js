import { createElement, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';
import { DEFAULT_PERMISSIONS } from '../data/permissions.js';

const LS_USER_OVERRIDES = 'crm_user_overrides';
const LS_ROLE_OVERRIDES = 'crm_role_overrides';

// Multi-empresa: pistas locais gravadas ao trocar de empresa.
// A correção de raiz é no banco: a policy "perfis: select do proprio perfil"
// (migration ...000006) garante que o usuário SEMPRE enxerga a própria linha de
// public.perfis, em qualquer empresa ativa — logo perfis.empresa_ativa_id volta
// a ser a fonte de verdade da empresa ativa.
// LS_EMPRESA_HINT sobra apenas como rede de segurança: se por algum motivo o
// perfil não puder ser lido, ainda dá para resolver a empresa da última troca.
// LS_EMPRESA_ANTERIOR = empresa de onde a pessoa saiu (botão "voltar" da tela de
// recuperação SemPermissoesEmpresa).
const LS_EMPRESA_HINT     = 'crm_empresa_ativa_hint';
const LS_EMPRESA_ANTERIOR = 'crm_empresa_anterior';

function lsGet(key) {
  try { return localStorage.getItem(key) || null; } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage indisponível */ }
}
function lsDel(key) {
  try { localStorage.removeItem(key); } catch { /* storage indisponível */ }
}

const AuthContext = createContext(null);

/* ─── Profile fetch ──────────────────────────────────────────────────────────── */
async function fetchPerfil(userId) {
  const { data, error } = await supabase
    .from('perfis')
    .select('empresa_id, empresa_ativa_id, nome, email, papel')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data;
}

// Empresas em que o perfil tem vínculo (multi-empresa). O papel agora é POR
// empresa — vem de perfis_empresas, não mais de perfis.papel.
async function fetchVinculos(userId) {
  const { data, error } = await supabase
    .from('perfis_empresas')
    .select('empresa_id, papel, empresas(id, nome)')
    .eq('perfil_id', userId);
  if (error || !data) return [];
  return data
    .map((v) => ({
      empresaId: v.empresa_id,
      papel:     v.papel,
      nome:      v.empresas?.nome || 'Empresa',
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function buildUser(supabaseUser) {
  if (!supabaseUser) return null;
  const email = supabaseUser.email ?? '';

  // perfis e perfis_empresas são independentes: perfis_empresas tem policy de
  // SELECT robusta (perfil_id = auth.uid()) e continua legível em qualquer
  // empresa; perfis pode ficar invisível logo após uma troca. Buscamos os dois
  // em paralelo e nunca deixamos a falha de um zerar as permissões se o outro
  // tem a resposta.
  const [perfil, vinculos] = await Promise.all([
    fetchPerfil(supabaseUser.id),
    fetchVinculos(supabaseUser.id),
  ]);

  if (!perfil) {
    console.warn('Perfil não lido (RLS ou inexistente) para o usuário', supabaseUser.id);
  }

  // Empresa ativa: perfis.empresa_ativa_id é a fonte de verdade (com fallback
  // para empresa_id, igual ao coalesce de empresa_do_usuario() no banco). Com a
  // policy do próprio perfil no banco, isto resolve em qualquer empresa.
  let empresaAtivaId = perfil?.empresa_ativa_id ?? perfil?.empresa_id ?? null;

  // Rede de segurança para o caso raro de o perfil não ter sido lido: a dica
  // local da última troca (se ainda houver vínculo com ela) e, por fim, o
  // vínculo único. Com vários vínculos e sem perfil, adivinhar poderia jogar a
  // pessoa na empresa errada — melhor a tela de recuperação.
  if (empresaAtivaId == null) {
    const hint = lsGet(LS_EMPRESA_HINT);
    if (hint && vinculos.some((v) => v.empresaId === hint)) {
      empresaAtivaId = hint;
    } else if (vinculos.length === 1) {
      empresaAtivaId = vinculos[0].empresaId;
    }
  }

  // Perfil legível => a dica local já cumpriu (ou nem precisou cumprir) o papel.
  if (perfil) lsDel(LS_EMPRESA_HINT);

  const vinculoAtivo = vinculos.find((v) => v.empresaId === empresaAtivaId);

  // Papel: do vínculo da empresa ATIVA. Fallback para perfil.papel só para não
  // deixar o usuário sem permissões caso o vínculo ainda não exista.
  const role = vinculoAtivo?.papel ?? perfil?.papel ?? null;

  // Superadmin é papel GLOBAL, não por empresa. Enquanto o superadmin está numa
  // empresa-cliente (onde o vínculo é 'admin'), role vira 'admin' — por isso a
  // flag olha perfis.papel e todos os vínculos, não só o da empresa ativa.
  const isSuperadmin =
    perfil?.papel === 'superadmin' || vinculos.some((v) => v.papel === 'superadmin');

  // Recuperação (em vez de app sem rotas) quando: (a) não deu para determinar a
  // empresa ativa mas há vínculos, ou (b) há empresa ativa mas o papel nela não
  // pôde ser resolvido.
  const semPapelNaEmpresa =
    (empresaAtivaId == null && vinculos.length > 0) ||
    (empresaAtivaId != null && role == null);

  const name = perfil?.nome || email.split('@')[0] || 'Usuário';
  return {
    id:           supabaseUser.id,
    email,
    name,
    role,
    empresa_id:   empresaAtivaId,
    empresas:     vinculos,
    isSuperadmin,
    semPapelNaEmpresa,
    avatar:       name.slice(0, 2).toUpperCase(),
  };
}

/* ─── Local-storage helpers (permission overrides) ───────────────────────────── */
function loadUserOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_USER_OVERRIDES) ?? '{}'); }
  catch { return {}; }
}

function loadRoleOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_ROLE_OVERRIDES) ?? '{}'); }
  catch { return {}; }
}

/* ─── Provider ───────────────────────────────────────────────────────────────── */
export function AuthProvider({ children }) {
  const [user,          setUser]         = useState(null);
  const [loading,       setLoading]      = useState(true);
  const [userOverrides, setUserOverrides] = useState(() => loadUserOverrides());
  const [roleOverrides, setRoleOverrides] = useState(() => loadRoleOverrides());

  useEffect(() => {
    // Check stored session on mount. loading stays true until the profile is
    // fetched so the UI never flashes with incorrect permissions.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = await buildUser(session.user);
        setUser(u);
      }
      setLoading(false);
    });

    // Keep user in sync for all subsequent auth events (sign-in, sign-out,
    // token refresh). Never call Supabase client methods directly inside this
    // callback — defer with setTimeout to avoid re-entrant deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      setTimeout(async () => {
        const u = await buildUser(session.user);
        setUser(u);
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated    = user !== null;
  const empresaId          = user?.empresa_id ?? null;
  const empresas           = user?.empresas ?? [];
  const isSuperadmin       = user?.isSuperadmin ?? false;
  const empresaAtiva       = empresas.find((e) => e.empresaId === empresaId) ?? null;
  const semPapelNaEmpresa  = user?.semPapelNaEmpresa ?? false;
  // Empresa de onde a pessoa saiu na última troca — alvo do botão "voltar" da
  // tela de recuperação. Vem do localStorage, então funciona mesmo sem sidebar.
  const empresaAnteriorId  = lsGet(LS_EMPRESA_ANTERIOR);
  const empresaAnterior    = empresas.find((e) => e.empresaId === empresaAnteriorId) ?? null;

  /* ── Auth actions ── */
  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Recarrega o usuário (perfil + vínculos) a partir da sessão atual, SEM
  // reload da página. Usar quando os vínculos mudam mas a empresa ativa não —
  // ex.: superadmin acabou de criar uma empresa-cliente e o seletor do Topbar
  // precisa passar a aparecer.
  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const u = await buildUser(session.user);
      setUser(u);
    }
  }, []);

  // Troca a empresa ativa. trocar_empresa_ativa é SECURITY DEFINER e valida o
  // vínculo no banco — é o ÚNICO caminho válido (UPDATE direto é bloqueado por
  // trigger). Devolve { ok } — quem chama decide como recarregar a aplicação.
  const trocarEmpresa = useCallback(async (novaEmpresaId) => {
    if (!novaEmpresaId || novaEmpresaId === empresaId) return { ok: true };
    const { error } = await supabase.rpc('trocar_empresa_ativa', { p_empresa_id: novaEmpresaId });
    if (error) {
      console.error('Falha ao trocar de empresa', error);
      return { ok: false, error };
    }
    // Registra a troca ANTES do reload que o chamador dispara. A dica é só rede
    // de segurança (o perfil já é legível em qualquer empresa pela policy do
    // banco); a "anterior" alimenta o botão voltar da tela de recuperação.
    lsSet(LS_EMPRESA_HINT, novaEmpresaId);
    if (empresaId) lsSet(LS_EMPRESA_ANTERIOR, empresaId);
    return { ok: true };
  }, [empresaId]);

  // Volta para a empresa de onde a pessoa saiu na última troca. Não depende de
  // nenhum componente que possa não renderizar (sidebar, seletor) — só do
  // localStorage e da RPC validada. Recarrega a aplicação ao dar certo.
  const voltarEmpresaAnterior = useCallback(async () => {
    const anterior = lsGet(LS_EMPRESA_ANTERIOR);
    if (!anterior) return { ok: false, semDestino: true };
    const { error } = await supabase.rpc('trocar_empresa_ativa', { p_empresa_id: anterior });
    if (error) {
      console.error('Falha ao voltar para a empresa anterior', error);
      return { ok: false, error };
    }
    lsSet(LS_EMPRESA_HINT, anterior);
    lsDel(LS_EMPRESA_ANTERIOR);
    window.location.assign('/');
    return { ok: true };
  }, []);

  /* ── Permission checks ── */
  const hasPermission = useCallback((module, action) => {
    if (!user) return false;
    // Superadmin é papel GLOBAL: nunca fica sem acesso, nem quando o papel na
    // empresa ativa não pôde ser resolvido (role === null). Isso garante o
    // caminho de volta por Configurações → Empresas.
    if (user.role === 'superadmin' || user.isSuperadmin) return true;
    // 1. User-level override
    const uOverride = userOverrides[user.id]?.[module]?.[action];
    if (uOverride !== undefined) return uOverride;
    // 2. Role-level override
    const rOverride = roleOverrides[user.role]?.[module]?.[action];
    if (rOverride !== undefined) return rOverride;
    // 3. Default role permission
    return DEFAULT_PERMISSIONS[user.role]?.[module]?.[action] ?? false;
  }, [user, userOverrides, roleOverrides]);

  const updateUserPermission = useCallback((userId, module, action, value) => {
    setUserOverrides((prev) => {
      const next = {
        ...prev,
        [userId]: {
          ...prev[userId],
          [module]: { ...(prev[userId]?.[module] ?? {}), [action]: value },
        },
      };
      localStorage.setItem(LS_USER_OVERRIDES, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetUserPermissions = useCallback((userId) => {
    setUserOverrides((prev) => {
      const next = { ...prev };
      delete next[userId];
      localStorage.setItem(LS_USER_OVERRIDES, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateRolePermission = useCallback((role, module, action, value) => {
    setRoleOverrides((prev) => {
      const next = {
        ...prev,
        [role]: {
          ...prev[role],
          [module]: { ...(prev[role]?.[module] ?? {}), [action]: value },
        },
      };
      localStorage.setItem(LS_ROLE_OVERRIDES, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetRolePermissions = useCallback((role) => {
    setRoleOverrides((prev) => {
      const next = { ...prev };
      delete next[role];
      localStorage.setItem(LS_ROLE_OVERRIDES, JSON.stringify(next));
      return next;
    });
  }, []);

  const getRolePermissions = useCallback((role) => {
    const defaults  = DEFAULT_PERMISSIONS[role] ?? {};
    const overrides = roleOverrides[role] ?? {};
    const result = {};
    for (const mod of Object.keys(defaults)) {
      result[mod] = { ...defaults[mod], ...(overrides[mod] ?? {}) };
    }
    return result;
  }, [roleOverrides]);

  const getUserPermissions = useCallback((targetUser) => {
    const rolePerms = getRolePermissions(targetUser.role);
    const overrides = userOverrides[targetUser.id] ?? {};
    const result = {};
    for (const mod of Object.keys(rolePerms)) {
      result[mod] = { ...rolePerms[mod], ...(overrides[mod] ?? {}) };
    }
    return result;
  }, [getRolePermissions, userOverrides]);

  const value = {
    user,
    isAuthenticated,
    loading,
    empresaId,
    empresas,
    empresaAtiva,
    isSuperadmin,
    semPapelNaEmpresa,
    empresaAnterior,
    trocarEmpresa,
    voltarEmpresaAnterior,
    refreshUser,
    login,
    logout,
    hasPermission,
    userOverrides,
    roleOverrides,
    updateUserPermission,
    resetUserPermissions,
    updateRolePermission,
    resetRolePermissions,
    getRolePermissions,
    getUserPermissions,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
