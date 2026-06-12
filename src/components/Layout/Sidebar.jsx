import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, Search, MessageSquare,
  BarChart2, ClipboardList, FolderOpen, Share2, Sparkles,
  Settings, LogOut, Headphones,
} from 'lucide-react';
import { useAuth } from '../../store/auth.js';
import { ROLES } from '../../data/users.js';

function getOpenTickets() {
  try {
    const t = JSON.parse(localStorage.getItem('crm_tickets') || '[]');
    const n = t.filter(tk => tk.status !== 'concluido').length;
    return n > 0 ? n : null;
  } catch { return null; }
}

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { path: '/guia', icon: BookOpen,        label: 'Guia Estratégico', module: 'guia' },
      { path: '/',     icon: LayoutDashboard, label: 'Painel',           module: 'dashboard' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { path: '/crm',        icon: Users,        label: 'CRM',                   module: 'crm',        badge: 12 },
      { path: '/prospeccao', icon: Search,        label: 'Prospecção Ativa',      module: 'prospeccao', badge: 3  },
      { path: '/regua',      icon: MessageSquare, label: 'Régua de Comunicação',  module: 'regua'       },
      { path: '/tickets',    icon: Headphones,    label: 'Chamados',              module: 'tickets',    getBadge: getOpenTickets },
    ],
  },
  {
    label: 'Desempenho',
    items: [
      { path: '/kpis',        icon: BarChart2,     label: 'Metas e Indicadores', module: 'kpis'        },
      { path: '/diagnostico', icon: ClipboardList, label: 'Diagnóstico',  module: 'diagnostico' },
    ],
  },
  {
    label: 'Organização',
    items: [
      { path: '/diretorio', icon: FolderOpen, label: 'Diretório Interno', module: 'diretorio' },
      { path: '/redes',     icon: Share2,     label: 'Redes Sociais',     module: 'redes'     },
    ],
  },
];

export default function Sidebar({ onOpenAI }) {
  const { user, logout, hasPermission } = useAuth();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{
        padding: '18px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '17px',
          color: 'var(--text)',
          letterSpacing: '-0.01em',
        }}>
          Comercial PME
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {NAV_GROUPS.map(({ label, items }) => {
          const visible = items.filter((item) => hasPermission(item.module, 'view'));
          if (!visible.length) return null;
          return (
            <div key={label} style={{ marginBottom: '18px' }}>
              <p style={{
                fontSize: '11px', fontWeight: 500, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                padding: '0 10px', marginBottom: '3px',
              }}>
                {label}
              </p>

              {visible.map(({ path, icon: Icon, label: itemLabel, badge, getBadge }) => {
                const badgeVal = getBadge ? getBadge() : badge;
                return (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === '/'}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    <Icon size={15} className="nav-icon" />
                    <span style={{ flex: 1, lineHeight: 1.3 }}>{itemLabel}</span>
                    {badgeVal != null && (
                      <span style={{
                        background: 'var(--accent)', color: '#fff',
                        fontSize: '10px', fontWeight: 500,
                        padding: '1px 6px', borderRadius: '20px', lineHeight: 1.6,
                      }}>
                        {badgeVal}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}

        {/* Configurações — admin only */}
        {hasPermission('configuracoes', 'view') && (
          <div style={{ marginBottom: '18px' }}>
            <p style={{
              fontSize: '11px', fontWeight: 500, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              padding: '0 10px', marginBottom: '3px',
            }}>
              Sistema
            </p>
            <NavLink
              to="/configuracoes"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Settings size={15} className="nav-icon" />
              <span style={{ flex: 1, lineHeight: 1.3 }}>Configurações</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {/* AI button */}
        {hasPermission('ia', 'view') && (
          <button className="ai-btn" onClick={onOpenAI} style={{ marginBottom: 10 }}>
            <span
              className="pulse-dot"
              style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }}
            />
            <Sparkles size={14} style={{ color: 'var(--accent2)', flexShrink: 0 }} />
            <span style={{ fontWeight: 500 }}>Assistente IA</span>
          </button>
        )}

        {/* User info + logout */}
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8,
            background: 'var(--bg3)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--accent-bg)', color: 'var(--accent2)',
              fontSize: 11, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {user.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text3)' }}>{ROLES[user.role]}</p>
            </div>
            <button
              onClick={logout}
              title="Sair"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', padding: 4, borderRadius: 6,
                display: 'flex', flexShrink: 0,
                transition: 'color 0.13s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
