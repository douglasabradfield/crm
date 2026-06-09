import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../store/auth.js';
import { MOCK_USERS, ROLES } from '../../data/users.js';

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400)); // tactile delay
    const ok = await login(email.trim(), password);
    setLoading(false);
    if (ok) {
      navigate('/', { replace: true });
    } else {
      setError('E-mail ou senha incorretos.');
    }
  }

  async function quickLogin(user) {
    const ok = await login(user.email, user.password);
    if (ok) navigate('/', { replace: true });
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <Sparkles size={22} style={{ color: 'var(--accent2)' }} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26, color: 'var(--text)', letterSpacing: '-0.5px',
            }}>
              Comercial PME
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            Plataforma comercial inteligente
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 32,
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 24 }}>
            Entrar na plataforma
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={{
                  width: '100%', background: 'var(--bg4)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '9px 12px', color: 'var(--text)',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', background: 'var(--bg4)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    padding: '9px 36px 9px 12px', color: 'var(--text)',
                    fontSize: 13, fontFamily: 'var(--font-body)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text3)', padding: 2, display: 'flex',
                  }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <p style={{
                fontSize: 12, color: 'var(--red)',
                background: 'rgba(240,92,92,0.08)',
                border: '1px solid rgba(240,92,92,0.2)',
                borderRadius: 8, padding: '8px 12px',
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? 'var(--bg3)' : 'var(--accent)',
                color: loading ? 'var(--text3)' : '#fff',
                border: 'none', borderRadius: 8,
                padding: '10px 16px', fontSize: 13, fontWeight: 500,
                cursor: loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'var(--font-body)',
                transition: 'background 0.15s',
                marginTop: 4,
              }}
            >
              {loading ? (
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid var(--border2)',
                  borderTopColor: 'var(--accent2)',
                  animation: 'spin 0.7s linear infinite',
                  display: 'inline-block',
                }} />
              ) : (
                <LogIn size={14} />
              )}
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Dev user cards — only in development */}
        {import.meta.env.DEV && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginBottom: 10 }}>
              Acesso rápido (ambiente de desenvolvimento)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MOCK_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => quickLogin(u)}
                  style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                    transition: 'border-color 0.13s, background 0.13s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.background  = 'var(--bg3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background  = 'var(--bg2)';
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--accent-bg)',
                    color: 'var(--accent2)', fontSize: 11, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {u.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{u.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)' }}>{ROLES[u.role]}</p>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>
                    {u.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
