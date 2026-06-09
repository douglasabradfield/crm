import { useState, useCallback } from 'react';

const BASE_SYSTEM_PROMPT = `Você é um assistente especializado em estratégia comercial e marketing \
para PMEs brasileiras. Dê respostas práticas, diretas e acionáveis. \
Use linguagem brasileira informal mas profissional. Máx 200 palavras \
por resposta, mas muito úteis. Crie templates e scripts quando pedido.`;

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-20250514';

/* ─── Standalone fetch function ─────────────────────────────────────────────── */
export async function callClaude(userMessage, pageContext = '', history = []) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Configure VITE_ANTHROPIC_API_KEY no arquivo .env.local para usar o assistente.');
  }

  const systemPrompt = pageContext
    ? `${BASE_SYSTEM_PROMPT}\n\nContexto da página atual:\n${pageContext}`
    : BASE_SYSTEM_PROMPT;

  const messages = [
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: userMessage },
  ];

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 800, system: systemPrompt, messages }),
  });

  if (!res.ok) {
    const { status } = res;
    if (status === 401) throw new Error('API key inválida. Verifique o VITE_ANTHROPIC_API_KEY no .env.local.');
    if (status === 429) throw new Error('Muitas requisições seguidas. Aguarde alguns segundos e tente novamente.');
    if (status >= 500) throw new Error('Serviço temporariamente indisponível. Tente novamente em instantes.');
    throw new Error('Erro ao conectar com o assistente. Verifique sua conexão e tente novamente.');
  }

  const data = await res.json();
  return data.content[0].text;
}

/* ─── React hook ─────────────────────────────────────────────────────────────── */
export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const send = useCallback(async (userMessage, pageContext, history) => {
    setLoading(true);
    setError(null);
    try {
      const text = await callClaude(userMessage, pageContext, history);
      return text;
    } catch (err) {
      setError(err.message ?? 'Erro inesperado. Tente novamente.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { send, loading, error };
}
