-- Migration: tabelas para lançamento manual de métricas de Redes Sociais.
-- Não há integração automática com as APIs das redes ainda — o usuário
-- cadastra as contas que administra (redes_contas) e lança números por
-- período manualmente (redes_metricas), formando um histórico real.

-- ─── redes_contas ───────────────────────────────────────────────────────────

create table if not exists public.redes_contas (
  id              uuid        primary key default gen_random_uuid(),
  empresa_id      uuid        not null default public.empresa_do_usuario()
                               references public.empresas(id) on delete cascade,
  plataforma      text        not null,
  nome            text        not null default '',
  handle          text        default '',
  meta_seguidores integer,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

alter table public.redes_contas enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redes_contas' and cmd = 'SELECT'
  ) then
    execute $p$create policy "redes_contas: select da propria empresa"
      on public.redes_contas for select
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redes_contas' and cmd = 'INSERT'
  ) then
    execute $p$create policy "redes_contas: insert na propria empresa"
      on public.redes_contas for insert
      with check (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redes_contas' and cmd = 'UPDATE'
  ) then
    execute $p$create policy "redes_contas: update da propria empresa"
      on public.redes_contas for update
      using  (empresa_id = public.empresa_do_usuario())
      with check (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redes_contas' and cmd = 'DELETE'
  ) then
    execute $p$create policy "redes_contas: delete da propria empresa"
      on public.redes_contas for delete
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

-- ─── redes_metricas ─────────────────────────────────────────────────────────

create table if not exists public.redes_metricas (
  id               uuid        primary key default gen_random_uuid(),
  empresa_id       uuid        not null default public.empresa_do_usuario()
                                references public.empresas(id) on delete cascade,
  conta_id         uuid        not null references public.redes_contas(id) on delete cascade,
  data_referencia  date        not null default current_date,
  seguidores       integer,
  alcance          integer,
  impressoes       integer,
  engajamento      numeric,
  posts_publicados integer,
  criado_em        timestamptz not null default now()
);

alter table public.redes_metricas enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redes_metricas' and cmd = 'SELECT'
  ) then
    execute $p$create policy "redes_metricas: select da propria empresa"
      on public.redes_metricas for select
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redes_metricas' and cmd = 'INSERT'
  ) then
    execute $p$create policy "redes_metricas: insert na propria empresa"
      on public.redes_metricas for insert
      with check (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redes_metricas' and cmd = 'UPDATE'
  ) then
    execute $p$create policy "redes_metricas: update da propria empresa"
      on public.redes_metricas for update
      using  (empresa_id = public.empresa_do_usuario())
      with check (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redes_metricas' and cmd = 'DELETE'
  ) then
    execute $p$create policy "redes_metricas: delete da propria empresa"
      on public.redes_metricas for delete
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

create index if not exists redes_metricas_conta_id_data_idx
  on public.redes_metricas (conta_id, data_referencia desc);
