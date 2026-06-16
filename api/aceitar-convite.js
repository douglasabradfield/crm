import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { codigo, nome, email, senha } = req.body ?? {};

  if (!codigo || !nome || !email || !senha) {
    return res.status(400).json({
      error: 'Campos obrigatórios: codigo, nome, email, senha.',
    });
  }

  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // 1. Buscar e validar o convite
  const { data: convite, error: conviteErr } = await admin
    .from('convites')
    .select('*')
    .eq('codigo', codigo)
    .maybeSingle();

  if (conviteErr) {
    console.error('[aceitar-convite] busca convite:', conviteErr);
    return res.status(500).json({ error: 'Erro ao verificar o convite.' });
  }

  if (!convite) {
    return res.status(404).json({ error: 'Convite inválido.' });
  }

  if (convite.status === 'usado') {
    return res.status(409).json({ error: 'Este convite já foi usado.' });
  }

  if (convite.status === 'expirado') {
    return res.status(409).json({ error: 'Este convite expirou.' });
  }

  if (convite.expira_em && new Date(convite.expira_em) < new Date()) {
    // Marcar como expirado no banco antes de rejeitar
    await admin
      .from('convites')
      .update({ status: 'expirado' })
      .eq('id', convite.id);
    return res.status(409).json({ error: 'Este convite expirou.' });
  }

  // empresa_id e papel vêm EXCLUSIVAMENTE do convite salvo no banco.
  const { empresa_id, papel } = convite;

  // 2. Criar usuário no Auth
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (authErr) {
    console.error('[aceitar-convite] criar usuário:', authErr);
    if (authErr.message?.toLowerCase().includes('already registered') ||
        authErr.message?.toLowerCase().includes('already exists')) {
      return res.status(409).json({ error: 'Este e-mail já tem conta. Faça login.' });
    }
    return res.status(500).json({ error: 'Não foi possível criar a conta. Tente novamente.' });
  }

  const novoUserId = authData.user.id;

  // 3. Criar perfil
  const { error: perfilErr } = await admin
    .from('perfis')
    .insert({ id: novoUserId, empresa_id, nome, email, papel });

  if (perfilErr) {
    console.error('[aceitar-convite] criar perfil:', perfilErr);
    // Reverter: deletar o usuário criado para não deixar lixo
    const { error: deleteErr } = await admin.auth.admin.deleteUser(novoUserId);
    if (deleteErr) {
      console.error('[aceitar-convite] rollback deleteUser falhou:', deleteErr);
    }
    return res.status(500).json({ error: 'Não foi possível criar o perfil. Tente novamente.' });
  }

  // 4. Marcar o convite como usado
  const { error: updateErr } = await admin
    .from('convites')
    .update({ status: 'usado', usado_por: novoUserId, usado_em: new Date().toISOString() })
    .eq('id', convite.id);

  if (updateErr) {
    // Não é crítico o suficiente para reverter; apenas logar.
    console.error('[aceitar-convite] marcar convite usado:', updateErr);
  }

  return res.status(200).json({ ok: true, email });
}
