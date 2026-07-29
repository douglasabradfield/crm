import { supabase } from './supabase.js';

/* ─── Row mappers (DB snake_case ↔ app camelCase) — compartilhados entre
   DiretorioInterno.jsx e as tarefas do Guia Estratégico que criam documentos ── */

export function ddmmyyyy(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

export function parseBRDate(s) {
  if (!s || !s.includes('/')) return new Date().toISOString();
  const [d, m, y] = s.split('/');
  return new Date(`${y}-${m}-${d}`).toISOString();
}

export function docFromRow(r) {
  return {
    id:          r.id,
    tipo:        r.tipo,
    pasta_id:    r.pasta_id,
    color:       r.cor,
    nome:        r.nome,
    responsavel: r.responsavel,
    versao:      r.versao,
    formato:     r.formato,
    status:      r.status,
    partes:      r.partes,
    passos:      r.passos,
    uso:         r.uso,
    descricao:   r.descricao,
    tags:        r.tags ?? [],
    updatedAt:   ddmmyyyy(r.atualizado_em),
    // origem: 'diretorio' (criado no módulo) | 'guia' (criado por uma tarefa do Guia Estratégico)
    origem:      r.origem ?? 'diretorio',
    guiaTaskId:  r.guia_task_id ?? null,
  };
}

export function docToRow(d, tipo, pasta_id) {
  return {
    tipo, pasta_id,
    cor:           d.color,
    nome:          d.nome,
    responsavel:   d.responsavel ?? null,
    versao:        d.versao ?? null,
    formato:       d.formato ?? null,
    status:        d.status,
    partes:        d.partes ?? null,
    passos:        d.passos ?? null,
    uso:           d.uso ?? null,
    descricao:     d.descricao ?? '',
    tags:          d.tags ?? [],
    atualizado_em: parseBRDate(d.updatedAt),
    origem:        d.origem ?? 'diretorio',
    guia_task_id:  d.guiaTaskId ?? null,
  };
}

/**
 * Cria ou atualiza o documento do Diretório associado a uma tarefa do Guia Estratégico
 * (ToolsForm / RichTextForm). Um único documento por taskId — resalvar a mesma tarefa
 * atualiza o documento existente em vez de duplicar. Retorna { doc } ou { error }.
 */
export async function saveGuiaDoc({ taskId, tipo, nome, descricao, cor = '--accent2' }) {
  const { data: existing } = await supabase
    .from('diretorio_documentos')
    .select('id')
    .eq('guia_task_id', taskId)
    .maybeSingle();

  const row = docToRow(
    { nome, descricao, color: cor, status: tipo === 'template' ? 'atual' : 'ativo', origem: 'guia', guiaTaskId: taskId },
    tipo,
    null,
  );

  if (existing) {
    const { data, error } = await supabase.from('diretorio_documentos').update(row).eq('id', existing.id).select().single();
    if (error) return { error: error.message };
    return { doc: docFromRow(data) };
  }

  const { data, error } = await supabase.from('diretorio_documentos').insert(row).select().single();
  if (error) return { error: error.message };
  return { doc: docFromRow(data) };
}

/**
 * Ids das tarefas do Guia que já têm um documento salvo — usado pela detecção
 * automática de conclusão (tarefas com formulário "richtext"/"tools").
 */
export async function fetchGuiaDocTaskIds() {
  const { data, error } = await supabase
    .from('diretorio_documentos')
    .select('guia_task_id')
    .eq('origem', 'guia')
    .not('guia_task_id', 'is', null);
  if (error) return [];
  return data.map(r => r.guia_task_id);
}
