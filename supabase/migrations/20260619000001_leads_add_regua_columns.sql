-- Migration: adiciona colunas de vínculo com a Régua na tabela leads.
-- em_regua       → flag para badge "Em régua" no card do funil (Etapa B)
-- regua_fluxo_id → qual fluxo o lead está percorrendo
-- Ambas nullable-safe: em_regua tem DEFAULT false; regua_fluxo_id é nullable FK.

alter table public.leads
  add column if not exists em_regua       boolean not null default false,
  add column if not exists regua_fluxo_id uuid
    references public.regua_fluxos(id) on delete set null;
