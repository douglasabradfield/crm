-- ─────────────────────────────────────────────────────────────────────────────
-- REDES · Comentários do cliente no post
--
-- Até aqui o papel 'cliente' só lia o calendário editorial. Esta migration cria
-- redes_posts_comentarios para que qualquer papel com redes/view — inclusive
-- 'cliente' — registre sugestões e pedidos de alteração em cada post, com
-- histórico. É a exceção deliberada à regra de que 'cliente' não escreve nada.
--
-- autor_nome é gravado (denormalizado) no momento do comentário: nem todo
-- viewer enxerga a linha de public.perfis de quem escreveu (ex.: um 'cliente'
-- de agência tem perfis.empresa_id na empresa de ORIGEM, não na empresa-alvo —
-- ver multi-empresa etapa 4), então depender de um join em perfis quebraria a
-- exibição do nome para esses casos. autor_id continua guardado (FK) para a
-- regra de exclusão abaixo.
--
-- RLS no padrão do projeto: tenant-only (empresa_id = empresa_do_usuario()) em
-- SELECT/INSERT, igual ao resto de redes_* — ver limitação já documentada de
-- que RLS de redes_* é só tenant, não papel. A exclusão é a única regra que
-- precisa saber PAPEL (quem escreveu OU quem tem redes/edit), por isso usa o
-- helper pode_editar_redes(), no mesmo espírito de pode_gerir_usuarios() já
-- usado por perfis_permissoes.
--
-- Idempotente e NÃO-destrutivo.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Helper: replica hasPermission('redes','edit') no banco ─────────────────
-- Precedência igual ao front-end (src/store/auth.js): superadmin global →
-- override do usuário nesta empresa (perfis_permissoes) → padrão do papel do
-- vínculo (perfis_empresas.papel) → negado.
create or replace function public.pode_editar_redes(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when exists (
      select 1 from public.perfis where id = auth.uid() and papel = 'superadmin'
    ) then true
    when exists (
      select 1 from public.perfis_permissoes
      where empresa_id = p_empresa_id and perfil_id = auth.uid()
        and modulo = 'redes' and acao = 'edit'
    ) then (
      select permitido from public.perfis_permissoes
      where empresa_id = p_empresa_id and perfil_id = auth.uid()
        and modulo = 'redes' and acao = 'edit'
      limit 1
    )
    else exists (
      select 1 from public.perfis_empresas
      where perfil_id = auth.uid()
        and empresa_id = p_empresa_id
        and papel in ('admin', 'gestor', 'marketing')
    )
  end;
$$;

revoke all     on function public.pode_editar_redes(uuid) from public;
grant  execute on function public.pode_editar_redes(uuid) to authenticated;

-- ─── Tabela ───────────────────────────────────────────────────────────────
create table if not exists public.redes_posts_comentarios (
  id         uuid        primary key default gen_random_uuid(),
  empresa_id uuid        not null default public.empresa_do_usuario()
                          references public.empresas(id) on delete cascade,
  post_id    uuid        not null references public.redes_posts(id) on delete cascade,
  autor_id   uuid        not null default auth.uid()
                          references public.perfis(id) on delete cascade,
  autor_nome text        not null default '',
  texto      text        not null,
  criado_em  timestamptz not null default now()
);

create index if not exists redes_posts_comentarios_post_id_idx
  on public.redes_posts_comentarios (post_id, criado_em);

alter table public.redes_posts_comentarios enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redes_posts_comentarios' and cmd = 'SELECT'
  ) then
    execute $p$create policy "redes_posts_comentarios: select da propria empresa"
      on public.redes_posts_comentarios for select
      using (empresa_id = public.empresa_do_usuario())$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redes_posts_comentarios' and cmd = 'INSERT'
  ) then
    execute $p$create policy "redes_posts_comentarios: insert na propria empresa"
      on public.redes_posts_comentarios for insert
      with check (
        empresa_id = public.empresa_do_usuario()
        and autor_id = auth.uid()
      )$p$;
  end if;
end $$;

-- Sem UPDATE: comentário não é editável, só apagável.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'redes_posts_comentarios' and cmd = 'DELETE'
  ) then
    execute $p$create policy "redes_posts_comentarios: delete proprio ou por quem edita redes"
      on public.redes_posts_comentarios for delete
      using (
        empresa_id = public.empresa_do_usuario()
        and (autor_id = auth.uid() or public.pode_editar_redes(empresa_id))
      )$p$;
  end if;
end $$;

grant select, insert, delete on public.redes_posts_comentarios to authenticated;
