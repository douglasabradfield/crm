import { useAuth } from '../../store/auth.js';

export default function PermissionGate({ module, action = 'view', fallback = null, children }) {
  const { hasPermission } = useAuth();
  return hasPermission(module, action) ? children : fallback;
}
