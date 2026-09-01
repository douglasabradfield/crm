-- ─────────────────────────────────────────────────────────────────────────────
-- MULTI-EMPRESA · ETAPA 1 (fundação de dados) · parte 1/5
-- Tabela de vínculos perfil ↔ empresa.
--
-- Um perfil pode pertencer a N empresas, com papel próprio em cada uma.
-- Caso de uso: agência que atende vários clientes.
--
-- Idempotente e NÃO-destrutivo: nada é removido, nenhuma policy existente muda.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.perfis_empresas (
  perfil_id   uuid        not null references public.perfis(id)   on delete cascade,
  empresa_id  uuid        not null references public.empresas(id) on delete cascade,
  papel       text        not null,
  criado_em   timestamptz not null default now(),
  primary key (perfil_id, empresa_id)
);

alter table public.perfis_empresas enable row level security;

-- Leitura: o usuário só enxerga os PRÓPRIOS vínculos.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'perfis_empresas'
      and policyname = 'perfis_empresas: select dos proprios vinculos'
  ) then
    execute $p$create policy "perfis_empresas: select dos proprios vinculos"
      on public.perfis_empresas for select
      using (perfil_id = auth.uid())$p$;
  end if;
end $$;

-- Sem policies de INSERT / UPDATE / DELETE para o usuário comum:
-- vínculos são geridos por service role (etapa futura de administração).
grant select on public.perfis_empresas to authenticated;

-- ─── Backfill a partir do estado atual (hoje: 1 perfil = 1 empresa) ───────────
-- Ninguém pode perder acesso ao que já tinha.
insert into public.perfis_empresas (perfil_id, empresa_id, papel, criado_em)
select p.id, p.empresa_id, p.papel, coalesce(p.criado_em, now())
from public.perfis p
where p.empresa_id is not null
on conflict (perfil_id, empresa_id) do nothing;
