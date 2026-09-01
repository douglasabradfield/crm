import { createClient } from '@supabase/supabase-js';

/**
 * Criação de empresa-cliente por superadmin (multi-empresa · etapa 3).
 *
 * A Novafield (agência) cria uma empresa no sistema para cada cliente que
 * atende e passa a lançar as métricas dele ali. Este endpoint cria a empresa
 * e vincula o superadmin requisitante a ela como 'admin'.
 *
 * AUTORIZAÇÃO — nada vindo do corpo da requisição é confiável. O papel é
 * conferido contra a fonte de verdade no banco (public.perfis.papel), não
 * contra claims de user_metadata (que o próprio usuário pode editar).
 *
 * PROVISIONAMENTO — os gatilhos da etapa 1 (trg_perfis_define_empresa_ativa,
 * trg_perfis_provisiona_vinculo, trg_perfis_protege_empresa) disparam apenas
 * em INSERT/UPDATE de public.perfis. Este fluxo insere em public.empresas e
 * public.perfis_empresas e NÃO toca em public.perfis — logo não duplica
 * vínculo nem mexe no empresa_ativa_id de quem está logado. O requisitante
 * continua na empresa em que já estava; a troca é uma escolha explícita na UI.
 */
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

  const nomeBruto = (req.body?.nome ?? '').toString();
  const nome = nomeBruto.trim().replace(/\s+/g, ' ');

  if (nome.length < 2) {
    return res.status(400).json({ error: 'Informe um nome de empresa com pelo menos 2 caracteres.' });
  }
  if (nome.length > 120) {
    return res.status(400).json({ error: 'O nome da empresa é longo demais (máx. 120 caracteres).' });
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
    console.error('[criar-empresa] buscar perfil:', perfilErr);
    return res.status(500).json({ error: 'Erro ao verificar suas permissões.' });
  }

  if (!perfil || perfil.papel !== 'superadmin') {
    return res.status(403).json({ error: 'Apenas um superadministrador pode criar empresas.' });
  }

  // ─── 4. Idempotência: já existe empresa com esse nome nos vínculos dele? ────
  const { data: vinculos, error: vinculosErr } = await admin
    .from('perfis_empresas')
    .select('empresa_id, empresas(nome)')
    .eq('perfil_id', requisitanteId);

  if (vinculosErr) {
    console.error('[criar-empresa] listar vínculos:', vinculosErr);
    return res.status(500).json({ error: 'Erro ao verificar suas empresas.' });
  }

  const jaExiste = (vinculos ?? []).some(
    (v) => (v.empresas?.nome ?? '').trim().toLowerCase() === nome.toLowerCase(),
  );
  if (jaExiste) {
    return res.status(409).json({ error: 'Você já tem uma empresa com esse nome.' });
  }

  // ─── 5. Criar a empresa ───────────────────────────────────────────────────
  const { data: empresa, error: empresaErr } = await admin
    .from('empresas')
    .insert({ nome })
    .select('id, nome')
    .single();

  if (empresaErr || !empresa) {
    console.error('[criar-empresa] criar empresa:', empresaErr);
    return res.status(500).json({ error: 'Não foi possível criar a empresa. Tente novamente.' });
  }

  // ─── 6. Vincular o requisitante como 'admin' (atômico c/ rollback) ─────────
  const { error: vinculoErr } = await admin
    .from('perfis_empresas')
    .insert({ perfil_id: requisitanteId, empresa_id: empresa.id, papel: 'admin' });

  if (vinculoErr) {
    console.error('[criar-empresa] criar vínculo:', {
      code: vinculoErr.code,
      message: vinculoErr.message,
      empresaId: empresa.id,
      requisitanteId,
    });
    // Reverter a empresa criada para não deixar empresa órfã (mesmo padrão do
    // rollback de aceitar-convite).
    const { error: delErr } = await admin.from('empresas').delete().eq('id', empresa.id);
    if (delErr) {
      console.error('[criar-empresa] rollback da empresa falhou:', delErr);
    }
    return res.status(500).json({
      error: 'Empresa criada, mas não foi possível vincular seu acesso. Nada foi salvo — tente novamente.',
    });
  }

  return res.status(201).json({
    ok: true,
    empresa: { id: empresa.id, nome: empresa.nome, papel: 'admin' },
  });
}
