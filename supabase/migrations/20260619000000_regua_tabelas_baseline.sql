-- Migration: registra as tabelas da Régua de Comunicação no versionamento SQL.
-- As 3 tabelas já existem no banco — CREATE TABLE IF NOT EXISTS não toca dados.
-- Policies criadas via DO-block para não duplicar se já existirem.

-- ─── regua_fluxos ─────────────────────────────────────────────────────────────

create table if not exists public.regua_fluxos (
  id            uuid        primary key default gen_random_uuid(),
  empresa_id    uuid        not null default public.empresa_do_usuario()
                             references public.empresas(id) on delete cascade,
  cor           text,
  nome          text        not null,
  descricao     text,
  trigger_texto text,
  status        text,
  steps         jsonb       not null default '[]'::jsonb,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.regua_fluxos enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_fluxos' and cmd = 'SELECT'
  ) then
    execute $p$create policy "regua_fluxos: select da propria empresa"
      on public.regua_fluxos for select
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_fluxos' and cmd = 'INSERT'
  ) then
    execute $p$create policy "regua_fluxos: insert na propria empresa"
      on public.regua_fluxos for insert
      with check (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_fluxos' and cmd = 'UPDATE'
  ) then
    execute $p$create policy "regua_fluxos: update da propria empresa"
      on public.regua_fluxos for update
      using  (empresa_id = public.empresa_do_usuario())
      with check (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_fluxos' and cmd = 'DELETE'
  ) then
    execute $p$create policy "regua_fluxos: delete da propria empresa"
      on public.regua_fluxos for delete
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

-- ─── regua_fluxo_leads ────────────────────────────────────────────────────────

create table if not exists public.regua_fluxo_leads (
  id            uuid        primary key default gen_random_uuid(),
  empresa_id    uuid        not null default public.empresa_do_usuario()
                             references public.empresas(id) on delete cascade,
  fluxo_id      uuid        not null references public.regua_fluxos(id) on delete cascade,
  step_idx      integer,
  days_in_step  integer,
  status        text,
  company       text,
  contact       text,
  responsavel   text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.regua_fluxo_leads enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_fluxo_leads' and cmd = 'SELECT'
  ) then
    execute $p$create policy "regua_fluxo_leads: select da propria empresa"
      on public.regua_fluxo_leads for select
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_fluxo_leads' and cmd = 'INSERT'
  ) then
    execute $p$create policy "regua_fluxo_leads: insert na propria empresa"
      on public.regua_fluxo_leads for insert
      with check (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_fluxo_leads' and cmd = 'UPDATE'
  ) then
    execute $p$create policy "regua_fluxo_leads: update da propria empresa"
      on public.regua_fluxo_leads for update
      using  (empresa_id = public.empresa_do_usuario())
      with check (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_fluxo_leads' and cmd = 'DELETE'
  ) then
    execute $p$create policy "regua_fluxo_leads: delete da propria empresa"
      on public.regua_fluxo_leads for delete
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

-- ─── regua_templates ──────────────────────────────────────────────────────────

create table if not exists public.regua_templates (
  id            uuid        primary key default gen_random_uuid(),
  empresa_id    uuid        not null default public.empresa_do_usuario()
                             references public.empresas(id) on delete cascade,
  channel       text,
  nome          text        not null,
  assunto       text,
  corpo         text,
  preview       text,
  tags          jsonb       not null default '[]'::jsonb,
  open_rate     integer,
  response_rate integer,
  uses          integer     not null default 0,
  status        text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.regua_templates enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_templates' and cmd = 'SELECT'
  ) then
    execute $p$create policy "regua_templates: select da propria empresa"
      on public.regua_templates for select
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_templates' and cmd = 'INSERT'
  ) then
    execute $p$create policy "regua_templates: insert na propria empresa"
      on public.regua_templates for insert
      with check (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_templates' and cmd = 'UPDATE'
  ) then
    execute $p$create policy "regua_templates: update da propria empresa"
      on public.regua_templates for update
      using  (empresa_id = public.empresa_do_usuario())
      with check (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regua_templates' and cmd = 'DELETE'
  ) then
    execute $p$create policy "regua_templates: delete da propria empresa"
      on public.regua_templates for delete
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;
