-- ─────────────────────────────────────────────────────────────────────────────
-- MULTI-EMPRESA · ETAPA 1 · parte 2/5
-- Coluna "empresa ativa" no perfil.
--
-- Define qual empresa o usuário enxerga na sessão. Todas as policies do projeto
-- continuam usando `empresa_id = public.empresa_do_usuario()` — na parte 3 essa
-- função passa a devolver a empresa ATIVA, sem mudar de assinatura.
--
-- perfis.empresa_id NÃO é removida nesta etapa — ainda há código lendo essa
-- coluna (src/store/auth.js, src/pages/Configuracoes.jsx). A remoção é decisão
-- de uma etapa futura, depois que tudo estiver migrado.
--
-- Idempotente e NÃO-destrutivo.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.perfis
  add column if not exists empresa_ativa_id uuid
    references public.empresas(id) on delete set null;

-- Backfill: quem já tinha empresa passa a tê-la como ativa.
update public.perfis
   set empresa_ativa_id = empresa_id
 where empresa_ativa_id is null
   and empresa_id is not null;
