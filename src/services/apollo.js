const API_KEY = import.meta.env.VITE_APOLLO_API_KEY;
const BASE    = 'https://api.apollo.io/v1';

export const apolloAvailable = !!API_KEY;

/**
 * Enrich a company by domain — returns people list with phones, emails, LinkedIn.
 * Falls back to mock data when no API key is present.
 */
export async function enrichByDomain(domain) {
  if (!domain) return [];

  if (API_KEY) {
    const res = await fetch(`${BASE}/people/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    API_KEY,
      },
      body: JSON.stringify({
        q_organization_domains: [domain],
        page: 1,
        per_page: 5,
        person_titles: ['CEO', 'Founder', 'Director', 'Manager', 'Commercial'],
      }),
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('Apollo.io: chave de API inválida.');
      if (res.status === 429) throw new Error('Apollo.io: limite de requisições atingido.');
      throw new Error(`Apollo.io: erro ${res.status}`);
    }

    const json  = await res.json();
    return (json.people ?? []).map(normalisePerson);
  }

  // Mock enrichment
  await new Promise((r) => setTimeout(r, 800));
  const base = domain.split('.')[0];
  return [
    {
      name:      'Ana Beatriz Silva',
      title:     'CEO',
      email:     `ana@${domain}`,
      phone:     '(11) 98000-1234',
      linkedin:  `https://linkedin.com/in/anabeatriz-${base}`,
      verified:  true,
    },
    {
      name:      'Marcos Oliveira',
      title:     'Gerente Comercial',
      email:     `marcos@${domain}`,
      phone:     '(11) 97000-5678',
      linkedin:  `https://linkedin.com/in/marcos-oliveira-${base}`,
      verified:  false,
    },
  ];
}

function normalisePerson(p) {
  const phone = p.phone_numbers?.[0]?.sanitized_number ?? '';
  return {
    name:     [p.first_name, p.last_name].filter(Boolean).join(' '),
    title:    p.title ?? '',
    email:    p.email ?? '',
    phone:    phone,
    linkedin: p.linkedin_url ?? '',
    verified: !!p.email_status && p.email_status === 'verified',
  };
}
