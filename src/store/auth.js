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
    .select('empresa_id, nome, email, papel')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data;
}

async function buildUser(supabaseUser) {
  if (!supabaseUser) return null;
  const email  = supabaseUser.email ?? '';
  const perfil = await fetchPerfil(supabaseUser.id);

  if (!perfil) {
    console.warn('Perfil não encontrado para o usuário', supabaseUser.id);
    const fallbackName = email.split('@')[0] || 'Usuário';
    return {
      id:         supabaseUser.id,
      email,
      name:       fallbackName,
      role:       null,
      empresa_id: null,
      avatar:     fallbackName.slice(0, 2).toUpperCase(),
    };
  }

  const name = perfil.nome || email.split('@')[0] || 'Usuário';
  return {
    id:         supabaseUser.id,
    email,
    name,
    role:       perfil.papel,
    empresa_id: perfil.empresa_id,
    avatar:     name.slice(0, 2).toUpperCase(),
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

  /* ── Auth actions ── */
  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

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
