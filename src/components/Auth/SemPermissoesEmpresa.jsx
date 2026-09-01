import { useState } from 'react';
import { ShieldOff, ArrowLeft, Settings, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../../store/auth.js';

/**
 * Tela de recuperação: aparece quando o usuário tem uma empresa ativa mas o
 * papel dele nela não pôde ser resolvido (role === null) — sem isto a sidebar
 * fica vazia, todas as rotas negam acesso e a pessoa fica presa.
 *
 * Não depende de nenhum componente que possa não renderizar (sidebar, seletor
 * de empresa): os botões usam só useAuth (localStorage + RPC validada).
 */
export default function SemPermissoesEmpresa() {
  const { empresaAnterior, voltarEmpresaAnterior, logout, isSuperadmin } = useAuth();
  const [acao, setAcao] = useState(null);   // 'voltar' | 'config' | 'sair'
  const [erro, setErro] = useState('');

  async function handleVoltar() {
    setErro('');
    setAcao('voltar');
    const { ok, semDestino } = await voltarEmpresaAnterior();
    if (!ok) {
      setAcao(null);
      setErro(
        semDestino
          ? 'Não há uma empresa anterior registrada neste navegador.'
          : 'Não foi possível voltar para a empresa anterior. Você pode não ter mais acesso a ela.',
      );
    }
    // Deu certo: voltarEmpresaAnterior já dispara o reload.
  }

  function handleConfig() {
    setAcao('config');
    window.location.assign('/configuracoes');
  }

  async function handleSair() {
    setAcao('sair');
    await logout();
    window.location.assign('/login');
  }

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '10px 16px', borderRadius: 8,
    fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
    cursor: acao ? 'default' : 'pointer', transition: 'background 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 32, textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(240,92,92,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <ShieldOff size={22} style={{ color: 'var(--red)' }} />
          </div>

          <h1 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
            Não foi possível carregar suas permissões nesta empresa
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 22 }}>
            Sua conta está ativa, mas não conseguimos confirmar seu papel na empresa
            selecionada. Volte para a empresa anterior e tente de novo.
          </p>

          {erro && (
            <p style={{
              fontSize: 12, color: 'var(--red)',
              background: 'rgba(240,92,92,0.08)',
              border: '1px solid rgba(240,92,92,0.2)',
              borderRadius: 8, padding: '8px 12px', marginBottom: 14,
            }}>
              {erro}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleVoltar}
              disabled={!!acao}
              style={{ ...btnBase, background: 'var(--accent)', color: '#fff', border: 'none' }}
            >
              {acao === 'voltar'
                ? <Loader2 size={14} style={{ animation: 'spin 0.9s linear infinite' }} />
                : <ArrowLeft size={14} />}
              {empresaAnterior
                ? `Voltar para ${empresaAnterior.nome}`
                : 'Voltar para a empresa anterior'}
            </button>

            {isSuperadmin && (
              <button
                onClick={handleConfig}
                disabled={!!acao}
                style={{
                  ...btnBase, background: 'transparent',
                  border: '1px solid var(--border2)', color: 'var(--text2)',
                }}
              >
                <Settings size={14} />
                Ir para Configurações → Empresas
              </button>
            )}

            <button
              onClick={handleSair}
              disabled={!!acao}
              style={{
                ...btnBase, background: 'transparent', border: 'none',
                color: 'var(--text3)', fontWeight: 400,
              }}
            >
              <LogOut size={13} />
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
