-- Migration: vínculo polimórfico + campos operacionais em regua_fluxo_leads.
--
-- Três origens possíveis para um contato na Régua:
--   origem = 'funil'    → lead_id    preenchido (lead do CRM/funil)
--   origem = 'cliente'  → cliente_id preenchido (cliente ou ex-cliente)
--   origem = 'avulso'   → ambos nulos; email preenchido direto na linha
--
-- days_in_step NÃO é removido — a UI atual ainda lê; será aposentado na Etapa B.
-- next_step_due_at é o novo campo temporal que o cron (Etapa D) vai consultar.

alter table public.regua_fluxo_leads
  -- vínculo polimórfico
  add column if not exists lead_id          uuid references public.leads(id)    on delete set null,
  add column if not exists cliente_id       uuid references public.clientes(id) on delete set null,
  add column if not exists origem           text,         -- 'funil' | 'cliente' | 'avulso'

  -- e-mail direto (necessário para origens avulsas sem lead/cliente)
  add column if not exists email            text,

  -- resultado do último passo registrado manualmente
  add column if not exists outcome          text,         -- 'no_response' | 'interest' | 'callback' | 'no_interest'
  add column if not exists outcome_notes    text,

  -- controle temporal real (substitui days_in_step congelado na Etapa B)
  add column if not exists last_contact_at  timestamptz,
  add column if not exists next_step_due_at timestamptz;
