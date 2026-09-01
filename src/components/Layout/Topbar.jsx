import { MessageSquare, Plus, Sun, Moon, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../store/index.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import EmpresaSwitcher from './EmpresaSwitcher.jsx';

export default function Topbar({ title, subtitle, onOpenAI }) {
  const { theme, toggleTheme } = useTheme();
  const { count, overdueCount } = useNotifications();
  const navigate = useNavigate();

  return (
    <header style={{
      height: 60,
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--text)',
          lineHeight: 1.2,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <EmpresaSwitcher />

        {count > 0 && (
          <div style={{ position: 'relative', display: 'flex' }}>
            <button
              className="btn-ghost"
              title={`${overdueCount} follow-up(s) vencido(s)`}
              style={{ padding: '7px 10px' }}
              onClick={() => navigate('/crm')}
            >
              <Bell size={14} style={{ color: overdueCount > 0 ? 'var(--amber)' : 'var(--text2)' }} />
            </button>
            <span style={{
              position: 'absolute', top: 3, right: 3,
              width: 15, height: 15, borderRadius: '50%',
              background: overdueCount > 0 ? 'var(--amber)' : 'var(--accent)',
              color: '#fff', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              {count > 9 ? '9+' : count}
            </span>
          </div>
        )}

        <button className="btn-ghost" onClick={onOpenAI}>
          <MessageSquare size={13} />
          Perguntar à IA
        </button>

        <button
          className="btn-ghost"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          style={{ padding: '7px 10px' }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <button className="btn-primary">
          <Plus size={14} />
          Nova ação
        </button>
      </div>
    </header>
  );
}
