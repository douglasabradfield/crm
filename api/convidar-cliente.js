import { createClient } from '@supabase/supabase-js';

/**
 * Convite de CLIENTE (multi-empresa · etapa 4).
 *
 * A Novafield (agência) dá a um cliente acesso SOMENTE-LEITURA ao módulo Redes
 * Sociais da empresa dele. O cliente entra por magic link (sem senha) — a tela
 * de login não cria contas, então o acesso precisa existir antes. Este endpoint
 * cria/garante esse acesso:
 *
 *   • usuário novo  → admin.createUser (sem senha; só magic link) com
 *     user_metadata { empresa_id, papel: 'cliente' } — o gatilho handle_new_user
 *     provisiona public.perfis e o gatilho companheiro grava o vínculo em
 *     public.perfis_empresas. Um upsert de salvaguarda reafirma os valores.
 *   • usuário já existente → NÃO tocamos em public.perfis (seria destrutivo para
 *     um membro da equipe). Apenas acrescentamos um vínculo 'cliente' com esta
 *     empresa em public.perfis_empresas.
 *
 * Não usa a tabela `convites` nem o endpoint `aceitar-convite` (aquele fluxo é
 * de senha + página /convite/:codigo e continua intocado para a equipe). Aqui o
 * "aceite" é o próprio clique no magic link.
 *
 * AUTORIZAÇÃO — nada do corpo é confiável. Confere superadmin contra
 * public.perfis.papel (não contra claims de user_metadata) e exige que o
 * requisitante tenha vínculo com a empresa alvo, igual ao padrão de
 * api/criar-empresa.js.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nomeFromEmail(email) {
  const local = String(email).split('@')[0] || 'Cliente';
  const limpo = local.replace(/[._-]+/g, ' ').trim();
  if (!limpo) return 'Cliente';
  return limpo.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80);
}

async function acharUsuarioPorEmail(admin, email) {
  const alvo = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const achado = (data?.users ?? []).find((u) => (u.email || '').toLowerCase() === alvo);
    if (achado) return achado;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // ─── 1. Token do requisitante ──────────────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  const empresaId = (req.body?.empresaId ?? '').toString().trim();
  const email = (req.body?.email ?? '').toString().trim().toLowerCase();

  if (!UUID_RE.test(empresaId)) {
    return res.status(400).json({ error: 'Empresa inválida.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }

  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // ─── 2. Validar o JWT e resolver o usuário ─────────────────────────────────
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
  const requisitanteId = userData.user.id;

  // ─── 3. Conferir superadmin CONTRA O BANCO ─────────────────────────────────
  const { data: perfil, error: perfilErr } = await admin
    .from('perfis')
    .select('papel')
    .eq('id', requisitanteId)
    .maybeSingle();

  if (perfilErr) {
    console.error('[convidar-cliente] buscar perfil:', perfilErr);
    return res.status(500).json({ error: 'Erro ao verificar suas permissões.' });
  }
  if (!perfil || perfil.papel !== 'superadmin') {
    return res.status(403).json({ error: 'Apenas um superadministrador pode convidar clientes.' });
  }

  // ─── 4. O requisitante precisa ter vínculo com a empresa alvo ──────────────
  const { data: vinculoReq, error: vinculoReqErr } = await admin
    .from('perfis_empresas')
    .select('empresa_id')
    .eq('perfil_id', requisitanteId)
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (vinculoReqErr) {
    console.error('[convidar-cliente] verificar vínculo do requisitante:', vinculoReqErr);
    return res.status(500).json({ error: 'Erro ao verificar a empresa.' });
  }
  if (!vinculoReq) {
    return res.status(403).json({ error: 'Você não tem acesso a essa empresa.' });
  }

  // ─── 5. Empresa existe? ───────────────────────────────────────────────────
  const { data: empresa, error: empresaErr } = await admin
    .from('empresas')
    .select('id, nome')
    .eq('id', empresaId)
    .maybeSingle();

  if (empresaErr) {
    console.error('[convidar-cliente] buscar empresa:', empresaErr);
    return res.status(500).json({ error: 'Erro ao verificar a empresa.' });
  }
  if (!empresa) {
    return res.status(404).json({ error: 'Empresa não encontrada.' });
  }

  // ─── 6. Criar o usuário (ou localizar, se já existir) ─────────────────────
  const nome = nomeFromEmail(email);
  let userId;
  let jaExistia = false;

  const { data: criado, error: criarErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome, empresa_id: empresaId, papel: 'cliente' },
  });

  if (criarErr) {
    const m = (criarErr.message || '').toLowerCase();
    const duplicado = m.includes('already registered') || m.includes('already exists')
      || m.includes('already been registered');
    if (!duplicado) {
      console.error('[convidar-cliente] criar usuário:', criarErr);
      return res.status(500).json({ error: 'Não foi possível criar o acesso. Tente novamente.' });
    }
    try {
      const existente = await acharUsuarioPorEmail(admin, email);
      if (!existente) {
        return res.status(409).json({ error: 'Esse e-mail já tem conta, mas não foi possível localizá-la. Contate o suporte.' });
      }
      userId = existente.id;
      jaExistia = true;
    } catch (lookupErr) {
      console.error('[convidar-cliente] localizar usuário existente:', lookupErr);
      return res.status(500).json({ error: 'Não foi possível verificar o e-mail. Tente novamente.' });
    }
  } else {
    userId = criado.user.id;
  }

  // ─── 7. Garantir perfil + vínculo ─────────────────────────────────────────
  if (!jaExistia) {
    // Usuário novo: o gatilho já deve ter criado a linha de perfis a partir do
    // user_metadata. Upsert idempotente de salvaguarda (mesmo padrão do
    // aceitar-convite) — reafirma empresa/papel sem colidir (23505).
    const { error: perfilUpsertErr } = await admin
      .from('perfis')
      .upsert({ id: userId, empresa_id: empresaId, nome, email, papel: 'cliente' }, { onConflict: 'id' });

    if (perfilUpsertErr) {
      console.error('[convidar-cliente] upsert perfil:', {
        code: perfilUpsertErr.code, message: perfilUpsertErr.message, userId, empresaId,
      });
      // Reverte o usuário recém-criado para não deixar lixo.
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) console.error('[convidar-cliente] rollback deleteUser falhou:', delErr);
      return res.status(500).json({ error: 'Acesso não pôde ser configurado. Nada foi salvo — tente novamente.' });
    }
  }

  // Vínculo 'cliente' com a empresa alvo. Para usuário novo o gatilho companheiro
  // já pode ter gravado — on conflict do nothing torna a operação idempotente.
  const { error: vinculoErr } = await admin
    .from('perfis_empresas')
    .upsert({ perfil_id: userId, empresa_id: empresaId, papel: 'cliente' }, { onConflict: 'perfil_id,empresa_id', ignoreDuplicates: true });

  if (vinculoErr) {
    console.error('[convidar-cliente] gravar vínculo:', {
      code: vinculoErr.code, message: vinculoErr.message, userId, empresaId,
    });
    if (!jaExistia) {
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) console.error('[convidar-cliente] rollback deleteUser falhou:', delErr);
    }
    return res.status(500).json({ error: 'Acesso não pôde ser vinculado à empresa. Tente novamente.' });
  }

  return res.status(jaExistia ? 200 : 201).json({
    ok: true,
    jaExistia,
    email,
    empresa: { id: empresa.id, nome: empresa.nome },
  });
}
