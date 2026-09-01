-- ─────────────────────────────────────────────────────────────────────────────
-- MULTI-EMPRESA · ETAPA 3 (correção de raiz) · perfil próprio sempre visível
--
-- CAUSA DO BUG DE TROCA DE EMPRESA
-- As policies de SELECT em public.perfis filtram por
--   empresa_id = public.empresa_do_usuario()
-- Desde a parte 3 da etapa 1 (migration ...000002) essa função devolve a
-- empresa ATIVA (coalesce(empresa_ativa_id, empresa_id)). Já perfis.empresa_id
-- continua apontando para a empresa ORIGINAL — o trigger trg_perfis_protege_empresa
-- (migration ...000003) impede alterá-la.
--
-- Resultado: ao trocar para outra empresa, empresa_do_usuario() passa a devolver
-- a empresa nova, deixa de bater com o perfis.empresa_id do próprio usuário, e a
-- pessoa PERDE A VISÃO DA PRÓPRIA LINHA DE PERFIL. Sem perfil legível, o
-- front-end não resolvia o papel e o usuário ficava sem nenhuma rota.
--
-- CORREÇÃO
-- Policy ADITIVA de SELECT permitindo `id = auth.uid()`: todo usuário sempre
-- enxerga o próprio perfil, independente da empresa ativa. Mesma lógica da
-- migration ...000005, que fez isso para public.empresas.
--
-- ADITIVA: nenhuma policy existente é alterada ou removida. A policy que permite
-- ver colegas da mesma empresa continua valendo — como policies de SELECT são
-- OR entre si, esta só ACRESCENTA a própria linha ao conjunto visível.
--
-- Idempotente (padrão DO $$ / IF NOT EXISTS em pg_policies) e NÃO-destrutivo.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.perfis enable row level security;

-- ─── Auditoria: lista as policies atuais de public.perfis no log ─────────────
--     (nenhuma será alterada — só registramos o estado antes da adição).
do $$
declare r record;
begin
  raise notice 'Policies atuais em public.perfis (nenhuma sera alterada):';
  for r in
    select cmd, policyname,
           coalesce(qual,       '-') as using_expr,
           coalesce(with_check, '-') as check_expr
    from pg_policies
    where schemaname = 'public' and tablename = 'perfis'
    order by cmd, policyname
  loop
    raise notice '  [%] % | USING=%  CHECK=%', r.cmd, r.policyname, r.using_expr, r.check_expr;
  end loop;
end $$;

-- ─── Policy aditiva: o próprio perfil é sempre legível ──────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'perfis'
      and policyname = 'perfis: select do proprio perfil'
  ) then
    execute $p$create policy "perfis: select do proprio perfil"
      on public.perfis for select
      using (id = auth.uid())$p$;
  end if;
end $$;

grant select on public.perfis to authenticated;
