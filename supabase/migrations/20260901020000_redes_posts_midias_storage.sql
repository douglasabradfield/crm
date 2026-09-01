-- Migration: mídia de posts de Redes Sociais migrada para Supabase Storage.
--
-- ANTES: redes_posts.imagem_url guardava a imagem inteira como data URI base64
-- (texto). Uma imagem por post. Carrossel (até 10 imagens) e vídeo de Reels
-- estouram o tamanho prático da linha e deixam o SELECT * do calendário pesado
-- (todo o base64 trafega a cada carregamento da página).
--
-- DEPOIS: os arquivos vão para o bucket privado 'redes-midia' e a linha guarda
-- só a lista ORDENADA de ponteiros em redes_posts.midias (jsonb):
--   [{ "path": "<empresa_id>/<arquivo>", "tipo": "imagem"|"video", "mime": "..." }]
-- imagem_url fica para trás apenas para compatibilidade com posts antigos que
-- ainda não foram reeditados.
--
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.

-- ─── coluna midias ──────────────────────────────────────────────────────────
alter table public.redes_posts
  add column if not exists midias jsonb not null default '[]'::jsonb;

-- ─── bucket privado ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'redes-midia',
  'redes-midia',
  false,
  209715200, -- 200 MB (vídeo de Reels)
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─── policies de storage.objects (isolamento por empresa) ───────────────────
-- Mesma regra do bucket diretorio-arquivos: o 1º segmento do path é o
-- empresa_id; só quem pertence àquela empresa lê/escreve.
-- Tenant-only, sem distinção de papel — o 'cliente' somente-leitura é barrado
-- na escrita pelo app (PermissionGate redes/edit), igual às tabelas redes_*.

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'redes-midia: select da propria empresa'
  ) then
    execute $p$create policy "redes-midia: select da propria empresa"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'redes-midia'
        and (storage.foldername(name))[1] = public.empresa_do_usuario()::text
      )$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'redes-midia: insert na propria empresa'
  ) then
    execute $p$create policy "redes-midia: insert na propria empresa"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'redes-midia'
        and (storage.foldername(name))[1] = public.empresa_do_usuario()::text
      )$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'redes-midia: update da propria empresa'
  ) then
    execute $p$create policy "redes-midia: update da propria empresa"
      on storage.objects for update to authenticated
      using (
        bucket_id = 'redes-midia'
        and (storage.foldername(name))[1] = public.empresa_do_usuario()::text
      )
      with check (
        bucket_id = 'redes-midia'
        and (storage.foldername(name))[1] = public.empresa_do_usuario()::text
      )$p$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'redes-midia: delete da propria empresa'
  ) then
    execute $p$create policy "redes-midia: delete da propria empresa"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'redes-midia'
        and (storage.foldername(name))[1] = public.empresa_do_usuario()::text
      )$p$;
  end if;
end $$;
