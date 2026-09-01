-- ─────────────────────────────────────────────────────────────────────────────
-- MULTI-EMPRESA · ETAPA 1 · parte 4/5  (CRÍTICO — controle de acesso)
-- Troca de empresa ativa VALIDADA + blindagem contra escalada de privilégio.
--
-- (A) public.trocar_empresa_ativa(p_empresa_id uuid): única via para trocar a
--     empresa ativa. Só troca para empresa em que o perfil TEM vínculo em
--     public.perfis_empresas; caso contrário RAISE EXCEPTION (acesso negado).
--
-- (B) Blindagem: um UPDATE direto em public.perfis NÃO pode alterar
--     empresa_ativa_id nem empresa_id.
--
--     Por que trigger e não policy: uma policy RLS de UPDATE não consegue
--     comparar o valor ANTIGO com o NOVO da linha (WITH CHECK só enxerga a
--     linha nova), logo não há como expressar "esta coluna é imutável" em
--     policy. A imutabilidade é garantida por trigger BEFORE UPDATE.
--
--     Nenhuma policy existente de public.perfis é alterada ou removida — o
--     bloco DO abaixo apenas as LISTA no log para auditoria.
--
-- Idempotente e NÃO-destrutivo.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Auditoria: registra as policies atuais de public.perfis no log ──────────
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

-- ─── (A) Função de troca validada ───────────────────────────────────────────
create or replace function public.trocar_empresa_ativa(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.perfis_empresas
    where perfil_id  = auth.uid()
      and empresa_id = p_empresa_id
  ) then
    raise exception 'Acesso negado: o usuario nao tem vinculo com a empresa %', p_empresa_id
      using errcode = 'insufficient_privilege';
  end if;

  update public.perfis
     set empresa_ativa_id = p_empresa_id
   where id = auth.uid();
end $$;

revoke all     on function public.trocar_empresa_ativa(uuid) from public;
grant  execute on function public.trocar_empresa_ativa(uuid) to authenticated;

-- ─── (B) Trigger que torna empresa_ativa_id / empresa_id imutáveis ───────────
--     via UPDATE direto de usuário final.
create or replace function public.perfis_protege_empresa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Só os papéis de usuário final do PostgREST são barrados. Qualquer outro
  -- chamador (service_role, dono do banco, e a função SECURITY DEFINER
  -- public.trocar_empresa_ativa, que roda como o dono) passa direto.
  -- Um usuário 'authenticated' não consegue trocar de role, então este teste
  -- não é forjável.
  if current_user in ('authenticated', 'anon') then
    if new.empresa_ativa_id is distinct from old.empresa_ativa_id then
      raise exception
        'empresa_ativa_id so pode ser trocada via public.trocar_empresa_ativa()'
        using errcode = 'insufficient_privilege';
    end if;
    if new.empresa_id is distinct from old.empresa_id then
      raise exception
        'empresa_id do perfil nao pode ser alterada por UPDATE direto'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_perfis_protege_empresa on public.perfis;
create trigger trg_perfis_protege_empresa
  before update on public.perfis
  for each row
  execute function public.perfis_protege_empresa();
