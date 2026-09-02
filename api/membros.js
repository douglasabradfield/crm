import { createClient } from '@supabase/supabase-js';

/**
 * Membros de uma empresa (multi-empresa · administração de usuários).
 *
 *   • GET   /api/membros?empresaId=<uuid>
 *       Lista quem tem vínculo com a empresa ATIVA (perfis_empresas), com o
 *       papel do VÍNCULO — não o de public.perfis.papel, que aponta para a
 *       empresa original e não muda ao trocar de empresa. É por isso que a
 *       lista antiga (perfis.eq('empresa_id', ...)) deixava de fora quem tem
 *       vínculo com a empresa ativa mas perfil noutra empresa — inclusive o
 *       próprio superadmin da agência.
 *
 *   • PATCH /api/membros   body { empresaId, perfilId, papel }
 *       Altera o papel de um membro NA EMPRESA informada (o vínculo em
 *       perfis_empresas). Nunca por UPDATE direto do cliente.
 *
 * AUTORIZAÇÃO — nada do corpo/query é confiável. Confere, contra o banco, que o
 * requisitante pode gerir usuários da empresa (superadmin global OU admin do
 * vínculo), mesmo padrão de api/criar-empresa.js.
 *
 * REGRAS do PATCH:
 *   • ninguém altera o próprio papel (evita se rebaixar por engano e travar-se);
 *   • 'superadmin' não é atribuível aqui — é papel global;
 *   • a empresa não pode ficar sem NENHUM admin: bloqueia se for o último.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAPEIS_VALIDOS = ['admin', 'gestor', 'vendedor', 'marketing', 'visualizador', 'cliente'];

async function resolverRequisitante(admin, req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return { erro: { status: 401, error: 'Não autenticado.' } };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return { erro: { status: 401, error: 'Sessão inválida ou expirada. Faça login novamente.' } };
  }
  return { userId: data.user.id };
}

async function podeGerir(admin, requisitanteId, empresaId) {
  const { data: perfil } = await admin
    .from('perfis').select('papel').eq('id', requisitanteId).maybeSingle();
  if (perfil?.papel === 'superadmin') return true;
  const { data: vinculo } = await admin
    .from('perfis_empresas').select('papel')
    .eq('perfil_id', requisitanteId).eq('empresa_id', empresaId).maybeSingle();
  return !!vinculo && ['admin', 'superadmin'].includes(vinculo.papel);
}

export default async function handler(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { userId, erro } = await resolverRequisitante(admin, req);
  if (erro) return res.status(erro.status).json({ error: erro.error });

  // ─── GET: listar membros da empresa ────────────────────────────────────────
  if (req.method === 'GET') {
    const empresaId = (req.query?.empresaId ?? '').toString().trim();
    if (!UUID_RE.test(empresaId)) return res.status(400).json({ error: 'Empresa inválida.' });

    if (!(await podeGerir(admin, userId, empresaId))) {
      return res.status(403).json({ error: 'Você não pode gerir usuários dessa empresa.' });
    }

    const { data: vinculos, error: vErr } = await admin
      .from('perfis_empresas')
      .select('perfil_id, papel, perfis(nome, email)')
      .eq('empresa_id', empresaId);

    if (vErr) {
      console.error('[membros] listar vínculos:', vErr);
      return res.status(500).json({ error: 'Não foi possível carregar a equipe.' });
    }

    const membros = (vinculos ?? [])
      .map((v) => ({
        id:    v.perfil_id,
        nome:  v.perfis?.nome || (v.perfis?.email ? v.perfis.email.split('@')[0] : 'Usuário'),
        email: v.perfis?.email || '',
        papel: v.papel,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return res.status(200).json({ membros });
  }

  // ─── PATCH: alterar o papel de um membro ──────────────────────────────────
  const empresaId = (req.body?.empresaId ?? '').toString().trim();
  const perfilId  = (req.body?.perfilId  ?? '').toString().trim();
  const papel     = (req.body?.papel     ?? '').toString().trim();

  if (!UUID_RE.test(empresaId)) return res.status(400).json({ error: 'Empresa inválida.' });
  if (!UUID_RE.test(perfilId))  return res.status(400).json({ error: 'Usuário inválido.' });
  if (!PAPEIS_VALIDOS.includes(papel)) return res.status(400).json({ error: 'Papel inválido.' });

  if (perfilId === userId) {
    return res.status(409).json({ error: 'Você não pode alterar o seu próprio papel.' });
  }

  if (!(await podeGerir(admin, userId, empresaId))) {
    return res.status(403).json({ error: 'Você não pode gerir usuários dessa empresa.' });
  }

  // Alvo precisa ter vínculo com a empresa.
  const { data: alvo, error: alvoErr } = await admin
    .from('perfis_empresas')
    .select('papel')
    .eq('perfil_id', perfilId)
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (alvoErr) {
    console.error('[membros] buscar vínculo alvo:', alvoErr);
    return res.status(500).json({ error: 'Erro ao verificar o usuário.' });
  }
  if (!alvo) {
    return res.status(404).json({ error: 'Esse usuário não tem vínculo com a empresa.' });
  }
  if (alvo.papel === 'superadmin') {
    return res.status(403).json({ error: 'O papel de um superadministrador não é alterado por aqui.' });
  }
  if (alvo.papel === papel) {
    return res.status(200).json({ ok: true, membro: { id: perfilId, papel } });
  }

  // Uma empresa não pode ficar sem NENHUM admin.
  if (alvo.papel === 'admin' && papel !== 'admin') {
    const { count, error: cErr } = await admin
      .from('perfis_empresas')
      .select('perfil_id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('papel', 'admin');

    if (cErr) {
      console.error('[membros] contar admins:', cErr);
      return res.status(500).json({ error: 'Erro ao verificar os administradores da empresa.' });
    }
    if ((count ?? 0) <= 1) {
      return res.status(409).json({
        error: 'Esta empresa ficaria sem nenhum administrador. Promova outra pessoa a administrador antes.',
      });
    }
  }

  const { error: updErr } = await admin
    .from('perfis_empresas')
    .update({ papel })
    .eq('perfil_id', perfilId)
    .eq('empresa_id', empresaId);

  if (updErr) {
    console.error('[membros] atualizar papel:', updErr);
    return res.status(500).json({ error: 'Não foi possível alterar o papel. Tente novamente.' });
  }

  return res.status(200).json({ ok: true, membro: { id: perfilId, papel } });
}
