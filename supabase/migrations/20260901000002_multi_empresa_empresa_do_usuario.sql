-- ─────────────────────────────────────────────────────────────────────────────
-- MULTI-EMPRESA · ETAPA 1 · parte 3/5
-- empresa_do_usuario() passa a devolver a empresa ATIVA.
--
-- Novo corpo:
--   select coalesce(empresa_ativa_id, empresa_id) from public.perfis
--   where id = auth.uid();
--
-- O coalesce garante que ninguém quebre caso empresa_ativa_id esteja nula.
-- A ASSINATURA não muda (returns uuid, sem argumentos) => nenhuma policy que
-- usa `empresa_id = public.empresa_do_usuario()` precisa ser reescrita.
--
-- As propriedades atuais da função (volatilidade, SECURITY DEFINER/INVOKER,
-- search_path e dono) são INSPECIONADAS em pg_proc e PRESERVADAS — não são
-- chutadas. Se a função não existir, a migration aborta sem efeito colateral.
-- ─────────────────────────────────────────────────────────────────────────────

do $do$
declare
  v_secdef    boolean;
  v_volatile  "char";
  v_voltext   text;
  v_config    text[];
  v_setclause text := '';
  v_owner     text;
  c           text;
begin
  select p.prosecdef, p.provolatile, p.proconfig, pg_get_userbyid(p.proowner)
    into v_secdef, v_volatile, v_config, v_owner
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'empresa_do_usuario'
    and pg_get_function_identity_arguments(p.oid) = '';

  if not found then
    raise exception
      'public.empresa_do_usuario() nao encontrada — verifique o schema antes de rodar';
  end if;

  v_voltext := case v_volatile
                 when 'i' then 'immutable'
                 when 's' then 'stable'
                 else 'volatile'
               end;

  -- Reconstrói cada cláusula SET ... = ... a partir de proconfig
  -- (ex.: 'search_path=public, pg_temp'  ->  ' set search_path = public, pg_temp')
  if v_config is not null then
    foreach c in array v_config loop
      v_setclause := v_setclause
        || format(' set %s = %s',
                  split_part(c, '=', 1),
                  substr(c, position('=' in c) + 1));
    end loop;
  end if;

  execute format(
    $f$create or replace function public.empresa_do_usuario()
         returns uuid
         language sql
         %s
         %s
         %s
       as $body$
         select coalesce(empresa_ativa_id, empresa_id)
         from public.perfis
         where id = auth.uid()
       $body$$f$,
    v_voltext,
    case when v_secdef then 'security definer' else 'security invoker' end,
    v_setclause
  );

  -- Preserva o dono original (CREATE OR REPLACE não muda dono, mas garante
  -- em caso de recriação por outro superusuário).
  execute format('alter function public.empresa_do_usuario() owner to %I', v_owner);

  raise notice
    'empresa_do_usuario() atualizada  |  volatilidade=%  security_definer=%  config=[%]  owner=%',
    v_voltext, v_secdef, coalesce(array_to_string(v_config, ', '), ''), v_owner;
end $do$;
