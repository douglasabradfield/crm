-- ─────────────────────────────────────────────────────────────────────────────
-- MULTI-EMPRESA · ETAPA 1 · parte 5/5
-- Provisionamento de vínculo para perfis novos (dono e convidado).
--
-- O gatilho on_auth_user_created → handle_new_user() continua INTOCADO: nos
-- dois ramos (dono que cria empresa nova / convidado que traz empresa_id e
-- papel em raw_user_meta_data) ele termina fazendo INSERT em public.perfis.
-- O fluxo de convite acabou de ser corrigido em produção e não pode regredir,
-- por isso NÃO reescrevemos aquele corpo — apenas penduramos dois gatilhos
-- companheiros em public.perfis que cobrem AMBOS os ramos:
--
--   • BEFORE INSERT  → empresa_ativa_id := empresa_id quando vier nula
--   • AFTER  INSERT  → grava o vínculo em public.perfis_empresas
--
-- Idempotente e NÃO-destrutivo.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── BEFORE INSERT: define a empresa ativa inicial ──────────────────────────
create or replace function public.perfis_define_empresa_ativa()
returns trigger
language plpgsql
as $$
begin
  if new.empresa_ativa_id is null then
    new.empresa_ativa_id := new.empresa_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_perfis_define_empresa_ativa on public.perfis;
create trigger trg_perfis_define_empresa_ativa
  before insert on public.perfis
  for each row
  execute function public.perfis_define_empresa_ativa();

-- ─── AFTER INSERT: grava o vínculo perfil ↔ empresa ─────────────────────────
create or replace function public.perfis_provisiona_vinculo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.empresa_id is not null then
    insert into public.perfis_empresas (perfil_id, empresa_id, papel)
    values (new.id, new.empresa_id, coalesce(new.papel, 'admin'))
    on conflict (perfil_id, empresa_id) do nothing;
  end if;
  return null;
end $$;

drop trigger if exists trg_perfis_provisiona_vinculo on public.perfis;
create trigger trg_perfis_provisiona_vinculo
  after insert on public.perfis
  for each row
  execute function public.perfis_provisiona_vinculo();

-- ─── Rede de segurança: reconcilia qualquer perfil que ainda não tenha ──────
--     vínculo nem empresa ativa (ex.: perfis criados entre as migrations).
insert into public.perfis_empresas (perfil_id, empresa_id, papel, criado_em)
select p.id, p.empresa_id, p.papel, coalesce(p.criado_em, now())
from public.perfis p
where p.empresa_id is not null
on conflict (perfil_id, empresa_id) do nothing;

update public.perfis
   set empresa_ativa_id = empresa_id
 where empresa_ativa_id is null
   and empresa_id is not null;
