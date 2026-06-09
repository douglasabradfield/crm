const BASE = 'https://receitaws.com.br/v1/cnpj';

// Rate-limit: receitaws.com.br allows 3 req/min on the free tier.
// We queue requests with a 22-second spacing to stay safe.
let lastCall = 0;

async function throttledFetch(cnpj) {
  const now   = Date.now();
  const gap   = now - lastCall;
  const delay = gap < 22_000 ? 22_000 - gap : 0;
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  lastCall = Date.now();

  const res = await fetch(`${BASE}/${cnpj}`, {
    headers: { Accept: 'application/json' },
  });

  if (res.status === 429) throw new Error('Limite de requisições atingido. Aguarde 1 minuto.');
  if (!res.ok)            throw new Error(`Erro ao consultar CNPJ ${cnpj}: ${res.status}`);

  const data = await res.json();
  if (data.status === 'ERROR') throw new Error(data.message ?? 'CNPJ inválido ou não encontrado.');
  return data;
}

/**
 * Look up a single CNPJ.
 * Returns a normalised company object or throws with a PT-BR message.
 */
export async function fetchCNPJ(cnpj) {
  const raw = cnpj.replace(/\D/g, '');
  if (raw.length !== 14) throw new Error('CNPJ deve ter 14 dígitos.');

  const data = await throttledFetch(raw);

  return {
    cnpj:          formatCNPJ(raw),
    razaoSocial:   data.nome ?? '',
    nomeFantasia:  data.fantasia ?? '',
    cnae:          data.cnae_fiscal ? String(data.cnae_fiscal) : '',
    cnaeDesc:      data.cnae_fiscal_descricao ?? '',
    municipio:     data.municipio ?? '',
    uf:            data.uf ?? '',
    situacao:      data.situacao ?? '',
    capitalSocial: parseFloat(String(data.capital_social ?? '0').replace(/\./g, '').replace(',', '.')) || 0,
    porte:         data.porte ?? '',
    telefone:      data.telefone ?? '',
    email:         data.email ?? '',
    abertura:      data.abertura ?? '',
  };
}

/**
 * Simulate a CNAE-based search by looking up a list of known CNPJs.
 * In a real scenario this would call a paid API (e.g. CNPJA, Econodata).
 * Here we return the mock result list enriched with any real CNPJ lookups.
 */
export async function searchByCNAE({ cnae, uf, cidade, porte, capitalMin }, mockList) {
  // Filter mock list by the requested criteria
  return mockList.filter((co) => {
    if (cnae   && !co.cnae.includes(cnae.replace(/\D/g, '').slice(0, 4))) return false;
    if (uf     && co.uf !== uf)       return false;
    if (cidade && !co.municipio.toLowerCase().includes(cidade.toLowerCase())) return false;
    if (porte  && co.porte !== porte) return false;
    if (capitalMin && co.capitalSocial < Number(capitalMin)) return false;
    return true;
  });
}

function formatCNPJ(raw) {
  return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
