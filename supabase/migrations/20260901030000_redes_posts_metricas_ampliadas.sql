-- Migration: métricas ampliadas por post em redes_posts.
--
-- ANTES: cada post guardava só alcance, curtidas e comentários — dentro do
-- jsonb redes_posts.metricas.
--
-- DEPOIS: o modal do calendário passa a registrar, por post, o conjunto maior
-- de números que as plataformas (Instagram/Meta etc.) já entregam prontos:
--
--   visualizacoes         total de vezes que o post foi visto
--   visualizadores        contas únicas que viram (<= visualizacoes)
--   visitas_perfil        visitas ao perfil geradas a partir do post
--   seguidores_ganhos     seguidores ganhos a partir do post
--   pct_nao_seguidores    % do alcance vindo de quem não segue (entrada direta)
--   tempo_medio_assistido tempo médio assistido em SEGUNDOS (só Reels/Vídeo/Shorts)
--
-- São colunas de verdade (e não novas chaves no jsonb) para poderem ser
-- consultadas e agregadas depois. Alcance/curtidas/comentários continuam no
-- jsonb metricas — não há motivo para mexer no que já funciona.
--
-- Todas NULÁVEIS de propósito: post agendado/ideia ainda não tem métrica e
-- posts antigos não têm esses dados. Nada pode exigir preenchimento nem
-- quebrar em post sem esses valores.
--
-- Idempotente: add column if not exists em cada campo.

alter table public.redes_posts
  add column if not exists visualizacoes         integer,
  add column if not exists visualizadores        integer,
  add column if not exists visitas_perfil        integer,
  add column if not exists seguidores_ganhos     integer,
  add column if not exists pct_nao_seguidores    numeric,
  add column if not exists tempo_medio_assistido integer;

comment on column public.redes_posts.visualizacoes is
  'Total de vezes que o post foi visto (>= visualizadores). Nulável.';
comment on column public.redes_posts.visualizadores is
  'Contas únicas que viram o post (<= visualizacoes). Nulável.';
comment on column public.redes_posts.visitas_perfil is
  'Visitas ao perfil geradas a partir do post. Nulável.';
comment on column public.redes_posts.seguidores_ganhos is
  'Seguidores ganhos a partir do post. Nulável.';
comment on column public.redes_posts.pct_nao_seguidores is
  'Percentual do alcance vindo de quem não segue a conta (0-100). Entrada direta da plataforma. Nulável.';
comment on column public.redes_posts.tempo_medio_assistido is
  'Tempo médio assistido, em segundos. Só faz sentido para Reels/Vídeo/Shorts. Nulável.';

-- RLS: redes_posts já filtra por empresa (tenant-only). O papel "cliente"
-- somente-leitura já enxerga a linha inteira — as colunas novas vêm junto sem
-- policy adicional.
