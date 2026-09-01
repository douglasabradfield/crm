-- Migration: adiciona "seguidores líquidos" e "interações" a redes_metricas.
-- O engajamento passa a ser um número derivado no app: (interações / alcance) × 100,
-- gravado na coluna `engajamento` que já existia (nada que lê esse dado quebra).
--
-- Colunas nuláveis de propósito: lançamentos antigos não têm esses números e
-- não podem quebrar.
--
-- redes_metricas nasceu de migration versionada
-- (20260729010000_redes_contas_metricas.sql). Mesmo assim registramos o schema
-- atual de forma não-destrutiva (create table if not exists), seguindo o padrão
-- usado nas tabelas da Régua, para o caso de o ambiente ter recriado a tabela
-- pelo painel sem migration.

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

alter table public.redes_metricas
  add column if not exists seguidores_liquidos integer,
  add column if not exists interacoes          integer;

comment on column public.redes_metricas.seguidores_liquidos is
  'Ganho líquido de seguidores no período (novos - perdidos). Pode ser negativo.';
comment on column public.redes_metricas.interacoes is
  'Soma de curtidas, comentários, salvamentos e compartilhamentos do período (>= 0).';
comment on column public.redes_metricas.engajamento is
  'Percentual calculado pelo app: (interacoes / alcance) * 100.';
