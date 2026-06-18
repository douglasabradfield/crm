-- Migration: cria tabela diagnostico_icp (Perfil de Cliente Ideal)
-- Um registro por empresa (unique empresa_id).
-- empresa_id preenchido via DEFAULT por empresa_do_usuario() — nunca enviado no INSERT comum.

create table if not exists public.diagnostico_icp (
  id                 uuid        primary key default gen_random_uuid(),
  empresa_id         uuid        not null default public.empresa_do_usuario()
                                  references public.empresas(id) on delete cascade,

  -- Bloco 1: Critérios firmográficos
  atividade          text,
  porte              text,
  capital_social     jsonb,       -- { "min": "...", "max": "..." }
  uf                 text,
  municipio          text,
  natureza_juridica  text,

  -- Bloco 2: Critérios qualitativos
  dor_principal      text,
  gatilho_compra     text,
  decisor            text,
  ticket_medio       text,

  atualizado_em      timestamptz not null default now(),

  unique (empresa_id)
);

-- RLS
alter table public.diagnostico_icp enable row level security;

create policy "icp: select da própria empresa"
  on public.diagnostico_icp for select
  using (empresa_id = public.empresa_do_usuario());

create policy "icp: insert na própria empresa"
  on public.diagnostico_icp for insert
  with check (empresa_id = public.empresa_do_usuario());

create policy "icp: update da própria empresa"
  on public.diagnostico_icp for update
  using  (empresa_id = public.empresa_do_usuario())
  with check (empresa_id = public.empresa_do_usuario());

create policy "icp: delete da própria empresa"
  on public.diagnostico_icp for delete
  using (empresa_id = public.empresa_do_usuario());
