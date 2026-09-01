import { createElement, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';
import { DEFAULT_PERMISSIONS } from '../data/permissions.js';

const LS_USER_OVERRIDES = 'crm_user_overrides';
const LS_ROLE_OVERRIDES = 'crm_role_overrides';

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
  const email  = supabaseUser.email ?? '';
  const perfil = await fetchPerfil(supabaseUser.id);

  if (!perfil) {
    console.warn('Perfil não encontrado para o usuário', supabaseUser.id);
    const fallbackName = email.split('@')[0] || 'Usuário';
    return {
      id:           supabaseUser.id,
      email,
      name:         fallbackName,
      role:         null,
      empresa_id:   null,
      empresas:     [],
      isSuperadmin: false,
      avatar:       fallbackName.slice(0, 2).toUpperCase(),
    };
  }

  const vinculos = await fetchVinculos(supabaseUser.id);

  // Empresa ativa = perfis.empresa_ativa_id (com fallback para empresa_id, igual
  // ao coalesce de empresa_do_usuario() no banco).
  const empresaAtivaId = perfil.empresa_ativa_id ?? perfil.empresa_id ?? null;
  const vinculoAtivo   = vinculos.find((v) => v.empresaId === empresaAtivaId);

  // Papel: do vínculo da empresa ATIVA. Fallback para perfil.papel só para não
  // deixar o usuário sem permissões caso o vínculo ainda não exista.
  const role = vinculoAtivo?.papel ?? perfil.papel ?? null;

  // Superadmin é papel GLOBAL, não por empresa. Enquanto o superadmin está numa
  // empresa-cliente (onde o vínculo é 'admin'), role vira 'admin' — por isso a
  // flag olha perfis.papel e todos os vínculos, não só o da empresa ativa.
  const isSuperadmin =
    perfil.papel === 'superadmin' || vinculos.some((v) => v.papel === 'superadmin');

  const name = perfil.nome || email.split('@')[0] || 'Usuário';
  return {
    id:           supabaseUser.id,
    email,
    name,
    role,
    empresa_id:   empresaAtivaId,
    empresas:     vinculos,
    isSuperadmin,
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

  const isAuthenticated = user !== null;
  const empresaId       = user?.empresa_id ?? null;
  const empresas        = user?.empresas ?? [];
  const isSuperadmin    = user?.isSuperadmin ?? false;
  const empresaAtiva    = empresas.find((e) => e.empresaId === empresaId) ?? null;

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
    return { ok: true };
  }, [empresaId]);

  /* ── Permission checks ── */
  const hasPermission = useCallback((module, action) => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
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
    trocarEmpresa,
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
