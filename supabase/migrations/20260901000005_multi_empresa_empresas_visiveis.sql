-- ─────────────────────────────────────────────────────────────────────────────
-- MULTI-EMPRESA · ETAPA 2 (UI do seletor) · suporte de dados
-- Tornar visível o NOME das empresas em que o perfil tem vínculo.
--
-- O seletor de empresa no topo (src/components/Layout/EmpresaSwitcher.jsx) faz
--   perfis_empresas -> empresas(id, nome)
-- para listar as empresas do usuário. Sem uma policy de SELECT que enxergue
-- TODAS as empresas vinculadas (e não só a ativa), o nome das demais viria nulo.
--
-- Esta policy é ADITIVA e restritiva ao vínculo: o usuário só lê empresas em que
-- consta em public.perfis_empresas. Nenhuma policy existente é alterada.
--
-- Idempotente e NÃO-destrutivo.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.empresas enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'empresas'
      and policyname = 'empresas: select das empresas vinculadas ao perfil'
  ) then
    execute $p$create policy "empresas: select das empresas vinculadas ao perfil"
      on public.empresas for select
      using (
        exists (
          select 1 from public.perfis_empresas pe
          where pe.empresa_id = empresas.id
            and pe.perfil_id  = auth.uid()
        )
      )$p$;
  end if;
end $$;

grant select on public.empresas to authenticated;
