import { createElement, createContext, useCallback, useContext, useState } from 'react';
import { MOCK_USERS } from '../data/users.js';
import { DEFAULT_PERMISSIONS } from '../data/permissions.js';

const LS_SESSION      = 'crm_session';
const LS_USER_OVERRIDES = 'crm_user_overrides';
const LS_ROLE_OVERRIDES = 'crm_role_overrides';

const AuthContext = createContext(null);

function loadSession() {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return null;
    const { userId } = JSON.parse(raw);
    return MOCK_USERS.find((u) => u.id === userId) ?? null;
  } catch {
    return null;
  }
}

function loadUserOverrides() {
  try {
    return JSON.parse(localStorage.getItem(LS_USER_OVERRIDES) ?? '{}');
  } catch {
    return {};
  }
}

function loadRoleOverrides() {
  try {
    return JSON.parse(localStorage.getItem(LS_ROLE_OVERRIDES) ?? '{}');
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(() => loadSession());
  const [userOverrides, setUserOverrides] = useState(() => loadUserOverrides());
  const [roleOverrides, setRoleOverrides] = useState(() => loadRoleOverrides());

  const isAuthenticated = user !== null;

  const login = useCallback((email, password) => {
    const found = MOCK_USERS.find(
      (u) => u.email === email && u.password === password,
    );
    if (!found) return false;
    localStorage.setItem(LS_SESSION, JSON.stringify({ userId: found.id }));
    setUser(found);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(LS_SESSION);
    setUser(null);
  }, []);

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

  // Update a single permission override for a specific user
  const updateUserPermission = useCallback((userId, module, action, value) => {
    setUserOverrides((prev) => {
      const next = {
        ...prev,
        [userId]: {
          ...prev[userId],
          [module]: {
            ...(prev[userId]?.[module] ?? {}),
            [action]: value,
          },
        },
      };
      localStorage.setItem(LS_USER_OVERRIDES, JSON.stringify(next));
      return next;
    });
  }, []);

  // Reset all overrides for a specific user
  const resetUserPermissions = useCallback((userId) => {
    setUserOverrides((prev) => {
      const next = { ...prev };
      delete next[userId];
      localStorage.setItem(LS_USER_OVERRIDES, JSON.stringify(next));
      return next;
    });
  }, []);

  // Update a role-level permission
  const updateRolePermission = useCallback((role, module, action, value) => {
    setRoleOverrides((prev) => {
      const next = {
        ...prev,
        [role]: {
          ...prev[role],
          [module]: {
            ...(prev[role]?.[module] ?? {}),
            [action]: value,
          },
        },
      };
      localStorage.setItem(LS_ROLE_OVERRIDES, JSON.stringify(next));
      return next;
    });
  }, []);

  // Reset role permissions to defaults
  const resetRolePermissions = useCallback((role) => {
    setRoleOverrides((prev) => {
      const next = { ...prev };
      delete next[role];
      localStorage.setItem(LS_ROLE_OVERRIDES, JSON.stringify(next));
      return next;
    });
  }, []);

  // Computed permissions for a given role (merges role overrides on top of defaults)
  const getRolePermissions = useCallback((role) => {
    const defaults = DEFAULT_PERMISSIONS[role] ?? {};
    const overrides = roleOverrides[role] ?? {};
    const result = {};
    for (const mod of Object.keys(defaults)) {
      result[mod] = { ...defaults[mod], ...(overrides[mod] ?? {}) };
    }
    return result;
  }, [roleOverrides]);

  // Computed permissions for a specific user (merges user overrides on top of role perms)
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
