import { Navigate, useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../../store/auth.js';

export default function ProtectedRoute({ children, module }) {
  const { isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (module && !hasPermission(module, 'view')) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '60vh', gap: 14, textAlign: 'center',
      }}>
        <ShieldOff size={36} style={{ color: 'var(--text3)' }} />
        <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>
          Acesso não autorizado
        </p>
        <p style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 320 }}>
          Você não tem permissão para acessar este módulo. Fale com o administrador.
        </p>
      </div>
    );
  }

  return children;
}
