-- Rastreia a origem de um documento do Diretório e, quando criado a partir de uma
-- tarefa do Guia Estratégico, a qual tarefa ele corresponde.
--
-- origem = 'diretorio' → criado diretamente no módulo Diretório Interno (padrão)
-- origem = 'guia'      → criado por uma tarefa do Guia Estratégico (ToolsForm/RichTextForm)
--
-- guia_task_id guarda o id da tarefa do Guia (ex: 'c3-5', 'c4-1', 'c5-4', 'c6-4') quando
-- origem = 'guia'. Usado para localizar e atualizar o mesmo documento ao invés de duplicar
-- quando o usuário reabre e resalva a tarefa, e para a detecção automática de conclusão.

alter table public.diretorio_documentos
  add column if not exists origem       text default 'diretorio',
  add column if not exists guia_task_id text;
