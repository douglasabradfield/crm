const API_KEY = import.meta.env.VITE_HUNTER_API_KEY;
const BASE    = 'https://api.hunter.io/v2';

export const hunterAvailable = !!API_KEY;

/**
 * Find emails for a domain.
 * Returns array of { email, score, firstName, lastName, position, confidence }
 * Falls back to a plausible mock when no API key is set.
 */
export async function findEmailsByDomain(domain) {
  if (!domain) return [];

  if (API_KEY) {
    const res = await fetch(
      `${BASE}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${API_KEY}&limit=5`,
    );
    if (!res.ok) {
      if (res.status === 401) throw new Error('Hunter.io: chave de API inválida.');
      if (res.status === 429) throw new Error('Hunter.io: limite de requisições atingido.');
      throw new Error(`Hunter.io: erro ${res.status}`);
    }
    const json = await res.json();
    return (json.data?.emails ?? []).map((e) => ({
      email:      e.value,
      score:      e.confidence ?? 0,
      firstName:  e.first_name ?? '',
      lastName:   e.last_name  ?? '',
      position:   e.position   ?? '',
      confidence: scoreToLabel(e.confidence ?? 0),
    }));
  }

  // Mock — derive a plausible email from the domain
  await new Promise((r) => setTimeout(r, 600));
  const name = domain.split('.')[0];
  return [
    { email: `contato@${domain}`, score: 72, firstName: '', lastName: '', position: 'Geral',          confidence: 'medio' },
    { email: `comercial@${domain}`, score: 58, firstName: '', lastName: '', position: 'Comercial',    confidence: 'medio' },
    { email: `${name}@${domain}`, score: 41, firstName: name, lastName: '', position: 'Fundador',     confidence: 'baixo' },
  ];
}

/**
 * Verify a single email address.
 * Returns { result, score, confidence } or throws.
 */
export async function verifyEmail(email) {
  if (!email) throw new Error('E-mail não informado.');

  if (API_KEY) {
    const res = await fetch(
      `${BASE}/email-verifier?email=${encodeURIComponent(email)}&api_key=${API_KEY}`,
    );
    if (!res.ok) throw new Error(`Hunter.io verificação: erro ${res.status}`);
    const json = await res.json();
    const d    = json.data ?? {};
    return {
      result:     d.result ?? 'unknown',
      score:      d.score ?? 0,
      confidence: scoreToLabel(d.score ?? 0),
    };
  }

  await new Promise((r) => setTimeout(r, 400));
  const score = Math.floor(Math.random() * 60) + 30;
  return { result: score > 60 ? 'deliverable' : 'risky', score, confidence: scoreToLabel(score) };
}

function scoreToLabel(score) {
  if (score >= 70) return 'alto';
  if (score >= 40) return 'medio';
  return 'baixo';
}
