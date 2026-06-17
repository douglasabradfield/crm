-- =============================================================================
-- Migration: fix RLS de INSERT em diagnostico_personas
-- Causa raiz: coluna empresa_id sem DEFAULT public.empresa_do_usuario()
--             → INSERT chega com empresa_id NULL
--             → policy WITH CHECK (empresa_id = empresa_do_usuario()) falha
--             → "new row violates row-level security policy"
-- =============================================================================

-- 1. Garantir que empresa_id tem o DEFAULT correto (idempotente)
ALTER TABLE public.diagnostico_personas
  ALTER COLUMN empresa_id SET DEFAULT public.empresa_do_usuario();

-- 2. Garantir policy de INSERT (criar se não existir)
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'diagnostico_personas'
      AND cmd        = 'INSERT'
  ) THEN
    EXECUTE
      'CREATE POLICY "personas_insert_own"
         ON public.diagnostico_personas
         FOR INSERT
         WITH CHECK (empresa_id = public.empresa_do_usuario())';
    RAISE NOTICE 'Policy INSERT criada para diagnostico_personas';
  ELSE
    RAISE NOTICE 'Policy INSERT já existe em diagnostico_personas — nenhuma ação necessária';
  END IF;
END;
$migration$;

-- 3. Garantir policy de UPDATE (criar se não existir)
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'diagnostico_personas'
      AND cmd        = 'UPDATE'
  ) THEN
    EXECUTE
      'CREATE POLICY "personas_update_own"
         ON public.diagnostico_personas
         FOR UPDATE
         USING (empresa_id = public.empresa_do_usuario())';
    RAISE NOTICE 'Policy UPDATE criada para diagnostico_personas';
  END IF;
END;
$migration$;

-- 4. Garantir policy de DELETE (criar se não existir)
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'diagnostico_personas'
      AND cmd        = 'DELETE'
  ) THEN
    EXECUTE
      'CREATE POLICY "personas_delete_own"
         ON public.diagnostico_personas
         FOR DELETE
         USING (empresa_id = public.empresa_do_usuario())';
    RAISE NOTICE 'Policy DELETE criada para diagnostico_personas';
  END IF;
END;
$migration$;
