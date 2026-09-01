import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, LogIn, Eye, EyeOff, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../store/auth.js';
import { supabase } from '../../services/supabase.js';
import { MOCK_USERS, ROLES } from '../../data/users.js';

/* Lê erros que o Supabase devolve no #hash ao voltar de um magic link
   expirado/inválido (ex.: #error=access_denied&error_code=otp_expired). */
function lerErroDoHash() {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  if (!hash) return '';
  const params = new URLSearchParams(hash);
  const err = params.get('error') || params.get('error_code');
  if (!err) return '';
  const code = params.get('error_code') || '';
  if (code === 'otp_expired' || err === 'otp_expired') {
    return 'Esse link de acesso expirou. Peça um novo link abaixo.';
  }
  if (err === 'access_denied') {
    return 'Não foi possível validar o link de acesso. Peça um novo link abaixo.';
  }
  return params.get('error_description')?.replace(/\+/g, ' ')
    || 'Não foi possível entrar pelo link. Tente novamente.';
}

const INP_BASE = {
  width: '100%', background: 'var(--bg4)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '9px 12px', color: 'var(--text)',
  fontSize: 13, fontFamily: 'var(--font-body)',
  outline: 'none', boxSizing: 'border-box',
};

// Erro do magic link lido uma vez, no primeiro render (não em efeito → sem
// setState em efeito e sem "flash" do formulário de senha).
const ERRO_INICIAL_HASH = typeof window !== 'undefined' ? lerErroDoHash() : '';

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [modo, setModo]         = useState(ERRO_INICIAL_HASH ? 'link' : 'senha'); // 'senha' | 'link'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Fluxo do magic link
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkEnviado, setLinkEnviado] = useState(false);
  const [linkErro, setLinkErro]       = useState(ERRO_INICIAL_HASH);

  useEffect(() => {
    // Limpa o #hash de erro para ele não "grudar" em recarregamentos.
    if (ERRO_INICIAL_HASH) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

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

  async function handleEnviarLink(e) {
    e.preventDefault();
    const alvo = email.trim();
    if (!alvo) { setLinkErro('Informe seu e-mail.'); return; }
    setLinkErro('');
    setLinkLoading(true);
    // shouldCreateUser: false — o acesso do cliente é criado pelo superadmin em
    // Configurações → Empresas → "Convidar cliente". A tela de login não cria
    // contas novas. Equipe (login por senha) não é afetada.
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: alvo,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLinkLoading(false);
    if (otpErr) {
      const m = (otpErr.message || '').toLowerCase();
      if (m.includes('signups not allowed') || m.includes('not found') || m.includes('user not found')) {
        setLinkErro('Não encontramos um acesso com esse e-mail. Peça ao responsável para te convidar.');
      } else if (m.includes('rate') || m.includes('too many')) {
        setLinkErro('Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.');
      } else {
        setLinkErro('Não foi possível enviar o link agora. Tente novamente em instantes.');
      }
      return;
    }
    setLinkEnviado(true);
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

          {modo === 'senha' && (
            <>
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
                    style={INP_BASE}
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
                      style={{ ...INP_BASE, padding: '9px 36px 9px 12px' }}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 14px' }}>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>ou</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <button
                type="button"
                onClick={() => { setModo('link'); setError(''); setLinkErro(''); }}
                style={{
                  width: '100%', background: 'transparent',
                  border: '1px solid var(--border2)', borderRadius: 8,
                  padding: '9px 16px', fontSize: 13, fontWeight: 500,
                  color: 'var(--text2)', cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Mail size={14} /> Entrar com link por e-mail
              </button>
            </>
          )}

          {modo === 'link' && (
            linkEnviado ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(45,212,160,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  <CheckCircle2 size={22} style={{ color: 'var(--green)' }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                  Link enviado
                </p>
                <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 20 }}>
                  Enviamos um link de acesso para <strong style={{ color: 'var(--text2)' }}>{email.trim()}</strong>.
                  Abra o e-mail neste mesmo dispositivo e clique no link para entrar.
                  Ele vale por tempo limitado.
                </p>
                <button
                  type="button"
                  onClick={() => { setLinkEnviado(false); setModo('senha'); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--accent2)', fontSize: 13, fontFamily: 'var(--font-body)',
                  }}
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnviarLink} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                  Digite seu e-mail e enviaremos um link para entrar sem senha.
                </p>
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
                    autoFocus
                    style={INP_BASE}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                    onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
                  />
                </div>

                {linkErro && (
                  <p style={{
                    fontSize: 12, color: 'var(--red)',
                    background: 'rgba(240,92,92,0.08)',
                    border: '1px solid rgba(240,92,92,0.2)',
                    borderRadius: 8, padding: '8px 12px',
                  }}>
                    {linkErro}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={linkLoading}
                  style={{
                    background: linkLoading ? 'var(--bg3)' : 'var(--accent)',
                    color: linkLoading ? 'var(--text3)' : '#fff',
                    border: 'none', borderRadius: 8,
                    padding: '10px 16px', fontSize: 13, fontWeight: 500,
                    cursor: linkLoading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontFamily: 'var(--font-body)', transition: 'background 0.15s', marginTop: 4,
                  }}
                >
                  {linkLoading ? (
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '2px solid var(--border2)',
                      borderTopColor: 'var(--accent2)',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }} />
                  ) : (
                    <Mail size={14} />
                  )}
                  {linkLoading ? 'Enviando…' : 'Enviar link de acesso'}
                </button>

                <button
                  type="button"
                  onClick={() => { setModo('senha'); setLinkErro(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--font-body)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <ArrowLeft size={12} /> Entrar com e-mail e senha
                </button>
              </form>
            )
          )}
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
