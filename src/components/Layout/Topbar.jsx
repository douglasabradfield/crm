import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Plus, Sun, Moon, Bell, Menu, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../store/index.js';
import { useAuth } from '../../store/auth.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { useIsMobile } from '../../hooks/useMediaQuery.js';
import EmpresaSwitcher from './EmpresaSwitcher.jsx';

function MenuItem({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        minHeight: 44, padding: '8px 10px', borderRadius: 8,
        border: 'none', background: 'transparent', cursor: 'pointer',
        color: 'var(--text2)', fontSize: 13, fontFamily: 'var(--font-body)', textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg4)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={15} style={{ flexShrink: 0 }} />
      {label}
    </button>
  );
}

export default function Topbar({ title, subtitle, onOpenAI, onOpenNav }) {
  const { theme, toggleTheme } = useTheme();
  const { hasPermission } = useAuth();
  const { count, overdueCount } = useNotifications();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const podeVerCRM = hasPermission('crm', 'view');
  const podeVerIA  = hasPermission('ia', 'view');

  return (
    <header style={{
      height: 60,
      padding: isMobile ? '0 14px' : '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: isMobile ? 10 : 0,
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {onOpenNav && (
          <button
            className="btn-ghost"
            onClick={onOpenNav}
            aria-label="Abrir menu"
            style={{ padding: 0, width: 40, height: 40, justifyContent: 'center', flexShrink: 0 }}
          >
            <Menu size={18} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--text)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {title}
          </h1>
          {subtitle && !isMobile && (
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {isMobile ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <EmpresaSwitcher />

          {podeVerCRM && (
            <button className="btn-primary" aria-label="Nova ação"
              style={{ padding: 0, width: 40, height: 40, justifyContent: 'center', flexShrink: 0 }}>
              <Plus size={16} />
            </button>
          )}

          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              className="btn-ghost"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Mais opções"
              aria-expanded={menuOpen}
              style={{ padding: 0, width: 40, height: 40, justifyContent: 'center', flexShrink: 0 }}
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                minWidth: 210,
                background: 'var(--bg3)',
                border: '1px solid var(--border2)',
                borderRadius: 10,
                padding: 4,
                zIndex: 80,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              }}>
                {podeVerIA && (
                  <MenuItem icon={MessageSquare} label="Perguntar à IA"
                    onClick={() => { setMenuOpen(false); onOpenAI(); }} />
                )}
                {count > 0 && podeVerCRM && (
                  <MenuItem
                    icon={Bell}
                    label={`Follow-ups vencidos (${count > 9 ? '9+' : count})`}
                    onClick={() => { setMenuOpen(false); navigate('/crm'); }}
                  />
                )}
                <MenuItem
                  icon={theme === 'dark' ? Sun : Moon}
                  label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                  onClick={toggleTheme}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EmpresaSwitcher />

          {count > 0 && podeVerCRM && (
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

          {podeVerIA && (
            <button className="btn-ghost" onClick={onOpenAI}>
              <MessageSquare size={13} />
              Perguntar à IA
            </button>
          )}

          <button
            className="btn-ghost"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            style={{ padding: '7px 10px' }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {podeVerCRM && (
            <button className="btn-primary">
              <Plus size={14} />
              Nova ação
            </button>
          )}
        </div>
      )}
    </header>
  );
}
