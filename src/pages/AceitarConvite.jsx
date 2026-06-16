import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sparkles, UserPlus, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabase.js';

function pwStrength(pw) {
  if (!pw) return 0;
  return [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
}

const STRENGTH_COLOR = ['', 'var(--red)', 'var(--amber)', 'var(--accent2)', 'var(--green)'];
const STRENGTH_LABEL = ['', 'Fraca', 'Razoável', 'Forte', 'Muito forte'];

const INP_BASE = {
  width: '100%', background: 'var(--bg4)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '9px 12px', color: 'var(--text)',
  fontSize: 13, fontFamily: 'var(--font-body)',
  outline: 'none', boxSizing: 'border-box',
};

function Logo() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
        <Sparkles size={22} style={{ color: 'var(--accent2)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text)', letterSpacing: '-0.5px' }}>
          Comercial PME
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text3)' }}>Plataforma comercial inteligente</p>
    </div>
  );
}

export default function AceitarConvite() {
  const { codigo } = useParams();
  const navigate   = useNavigate();

  const [nome,     setNome]     = useState('');
  const [email,    setEmail]    = useState('');
  const [senha,    setSenha]    = useState('');
  const [confirma, setConfirma] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [erro,     setErro]     = useState('');

  const emailValido      = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const senhaOk          = !senha || senha.length >= 8;
  const confirmaMismatch = !!confirma && senha !== confirma;
  const strength         = pwStrength(senha);

  const canSubmit =
    nome.trim() && email.trim() && emailValido &&
    senha.length >= 8 && senha === confirma && !loading;

  /* ── Link inválido ── */
  if (!codigo) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <Logo />
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Link de convite inválido</p>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>
              Este link não é válido ou está incompleto.
            </p>
            <Link to="/login" style={{ fontSize: 13, color: 'var(--accent2)', textDecoration: 'none' }}>
              Ir para o login →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setErro('');
    setLoading(true);

    try {
      const res = await fetch('/api/aceitar-convite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ codigo, nome: nome.trim(), email: email.trim(), senha }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErro(data.error || 'Ocorreu um erro. Tente novamente.');
        setLoading(false);
        return;
      }

      /* Login automático */
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email:    email.trim(),
        password: senha,
      });

      if (loginErr) {
        /* Conta criada, mas login automático falhou por razão inesperada */
        navigate('/login?conta=criada', { replace: true });
        return;
      }

      navigate('/', { replace: true });
    } catch {
      setErro('Não foi possível conectar. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <Logo />

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
          <h1 style={{ fontSize: 17, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, marginBottom: 6 }}>
            Você foi convidado para uma equipe no Comercial PME
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 26 }}>
            Preencha seus dados para criar sua conta.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Nome */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>
                Nome completo
              </label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                style={INP_BASE}
                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={e  => { e.target.style.borderColor = 'var(--border)'; }}
              />
            </div>

            {/* E-mail */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                style={INP_BASE}
                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={e  => { e.target.style.borderColor = !emailValido ? 'var(--red)' : 'var(--border)'; }}
              />
              {!emailValido && (
                <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 5 }}>E-mail inválido.</p>
              )}
            </div>

            {/* Senha */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  style={{ ...INP_BASE, padding: '9px 36px 9px 12px' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={e  => { e.target.style.borderColor = !senhaOk ? 'var(--red)' : 'var(--border)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {!senhaOk && (
                <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 5 }}>
                  A senha precisa ter pelo menos 8 caracteres.
                </p>
              )}
              {senha && senhaOk && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, transition: 'background .2s', background: i <= strength ? STRENGTH_COLOR[strength] : 'var(--bg4)' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: STRENGTH_COLOR[strength] }}>{STRENGTH_LABEL[strength]}</span>
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>
                Confirmar senha
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirma}
                onChange={e => setConfirma(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                style={INP_BASE}
                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={e  => { e.target.style.borderColor = confirmaMismatch ? 'var(--red)' : 'var(--border)'; }}
              />
              {confirmaMismatch && (
                <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 5 }}>As senhas não coincidem.</p>
              )}
            </div>

            {/* Erro global */}
            {erro && (
              <p style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(240,92,92,0.08)', border: '1px solid rgba(240,92,92,0.2)', borderRadius: 8, padding: '9px 12px' }}>
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                background: canSubmit ? 'var(--accent)' : 'var(--bg3)',
                color: canSubmit ? '#fff' : 'var(--text3)',
                border: 'none', borderRadius: 8,
                padding: '10px 16px', fontSize: 13, fontWeight: 500,
                cursor: canSubmit ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'var(--font-body)', transition: 'background 0.15s', marginTop: 4,
              }}
            >
              {loading ? (
                <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border2)', borderTopColor: 'var(--accent2)', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              ) : (
                <UserPlus size={14} />
              )}
              {loading ? 'Criando conta…' : 'Criar minha conta e entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text3)' }}>
          Já tenho conta.{' '}
          <Link to="/login" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>
            Fazer login →
          </Link>
        </p>
      </div>
    </div>
  );
}
