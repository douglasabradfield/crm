-- ─────────────────────────────────────────────────────────────────────────────
-- PERMISSÕES · overrides POR USUÁRIO no BANCO
--
-- Até aqui os ajustes finos de permissão (Configurações › Usuários) eram
-- gravados em localStorage, no navegador de quem editava — herança do MVP
-- pré-Supabase. Um override salvo por uma pessoa não afetava em NADA o que as
-- outras viam. Esta migration move os overrides por usuário para o Postgres,
-- no padrão multi-tenant do projeto:
--
--   • uma linha por (empresa, perfil, módulo, ação) com o booleano `permitido`
--   • empresa_id com default public.empresa_do_usuario() + RLS por empresa
--   • só quem pode gerir usuários da empresa escreve — validado NO BANCO via
--     public.pode_gerir_usuarios(uuid), não só na UI
--
-- Resolução em hasPermission (front-end):
--   superadmin global → override do usuário NESTA empresa → padrão do papel do
--   vínculo → negado.
--
-- Overrides antigos do localStorage NÃO são migrados — eram locais e de teste.
--
-- Idempotente e NÃO-destrutivo.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Helper: quem pode gerir usuários de uma empresa ────────────────────────
-- Usado tanto pelas policies desta tabela quanto (conceitualmente) pelo
-- endpoint api/membros.js, que replica a mesma regra com service role.
create or replace function public.pode_gerir_usuarios(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    -- superadmin é papel GLOBAL (coluna em public.perfis, não claim de metadata)
    exists (
      select 1 from public.perfis
      where id = auth.uid() and papel = 'superadmin'
    )
    or
    -- admin / superadmin do vínculo com ESTA empresa
    exists (
      select 1 from public.perfis_empresas
      where perfil_id = auth.uid()
        and empresa_id = p_empresa_id
        and papel in ('admin', 'superadmin')
    );
$$;

revoke all     on function public.pode_gerir_usuarios(uuid) from public;
grant  execute on function public.pode_gerir_usuarios(uuid) to authenticated;

-- ─── Tabela de overrides ───────────────────────────────────────────────────
create table if not exists public.perfis_permissoes (
  id            uuid        primary key default gen_random_uuid(),
  empresa_id    uuid        not null default public.empresa_do_usuario()
                             references public.empresas(id) on delete cascade,
  perfil_id     uuid        not null references public.perfis(id) on delete cascade,
  modulo        text        not null,
  acao          text        not null,
  permitido     boolean     not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, perfil_id, modulo, acao)
);

create index if not exists perfis_permissoes_lookup_idx
  on public.perfis_permissoes (empresa_id, perfil_id);

alter table public.perfis_permissoes enable row level security;

-- SELECT: qualquer membro da empresa ativa lê os overrides da empresa.
--   O próprio usuário precisa ler os SEUS para o hasPermission; quem gere
--   usuários precisa ler os de TODOS para montar a tela.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'perfis_permissoes'
      and policyname = 'perfis_permissoes: select da propria empresa'
  ) then
    execute $p$create policy "perfis_permissoes: select da propria empresa"
      on public.perfis_permissoes for select
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

-- INSERT / UPDATE / DELETE: só quem pode gerir usuários da empresa.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'perfis_permissoes'
      and policyname = 'perfis_permissoes: insert por gestor de usuarios'
  ) then
    execute $p$create policy "perfis_permissoes: insert por gestor de usuarios"
      on public.perfis_permissoes for insert
      with check (
        empresa_id = public.empresa_do_usuario()
        and public.pode_gerir_usuarios(empresa_id)
      )$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'perfis_permissoes'
      and policyname = 'perfis_permissoes: update por gestor de usuarios'
  ) then
    execute $p$create policy "perfis_permissoes: update por gestor de usuarios"
      on public.perfis_permissoes for update
      using  (empresa_id = public.empresa_do_usuario()
              and public.pode_gerir_usuarios(empresa_id))
      with check (empresa_id = public.empresa_do_usuario()
              and public.pode_gerir_usuarios(empresa_id))$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'perfis_permissoes'
      and policyname = 'perfis_permissoes: delete por gestor de usuarios'
  ) then
    execute $p$create policy "perfis_permissoes: delete por gestor de usuarios"
      on public.perfis_permissoes for delete
      using (empresa_id = public.empresa_do_usuario()
             and public.pode_gerir_usuarios(empresa_id))$p$;
  end if;
end $$;

grant select, insert, update, delete on public.perfis_permissoes to authenticated;

-- ─── touch atualizado_em ───────────────────────────────────────────────────
create or replace function public.perfis_permissoes_touch()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists trg_perfis_permissoes_touch on public.perfis_permissoes;
create trigger trg_perfis_permissoes_touch
  before update on public.perfis_permissoes
  for each row
  execute function public.perfis_permissoes_touch();
