import { supabase } from './supabase.js';

/**
 * Adds a contact to a communication flow (régua).
 * Handles 3 origins: 'funil' (CRM lead), 'cliente', 'avulso' (standalone).
 * Returns { ok: true, row } or { ok: false, motivo, error? }.
 */
export async function addContatoAoFluxo({
  fluxoId,
  fluxoSteps,
  origem,
  leadId,
  clienteId,
  company,
  contact,
  email,
  responsavel = '',
}) {
  if (!fluxoSteps?.length) return { ok: false, motivo: 'fluxo_sem_passos' };

  // Duplicate check per origin type
  if (origem === 'funil') {
    const { data: l } = await supabase
      .from('leads')
      .select('em_regua, regua_fluxo_id')
      .eq('id', leadId)
      .single();
    if (l?.em_regua) return { ok: false, motivo: 'duplicata', reguaFluxoId: l.regua_fluxo_id };
  } else if (origem === 'cliente') {
    const { data: existing } = await supabase
      .from('regua_fluxo_leads')
      .select('fluxo_id')
      .eq('cliente_id', clienteId)
      .eq('status', 'ativo')
      .limit(1)
      .single();
    if (existing) return { ok: false, motivo: 'duplicata', reguaFluxoId: existing.fluxo_id };
  } else if (origem === 'avulso') {
    if (!email?.trim()) return { ok: false, motivo: 'email_obrigatorio' };
    const { count } = await supabase
      .from('regua_fluxo_leads')
      .select('id', { count: 'exact', head: true })
      .eq('email', email.trim())
      .eq('status', 'ativo');
    if ((count ?? 0) > 0) return { ok: false, motivo: 'duplicata' };
  }

  const firstDelay = fluxoSteps[0].delay ?? 0;
  const nextStepDueAt = new Date(Date.now() + firstDelay * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from('regua_fluxo_leads')
    .insert({
      fluxo_id:          fluxoId,
      origem,
      lead_id:           origem === 'funil'    ? (leadId    ?? null) : null,
      cliente_id:        origem === 'cliente'  ? (clienteId ?? null) : null,
      email:             email     ?? null,
      company:           company   ?? null,
      contact:           contact   ?? null,
      responsavel:       responsavel ?? null,
      status:            'ativo',
      step_idx:          0,
      days_in_step:      0,
      next_step_due_at:  nextStepDueAt,
    })
    .select()
    .single();

  if (error) return { ok: false, motivo: 'erro_insert', error: error.message };

  // Mark CRM lead as em_regua only for 'funil' origin
  if (origem === 'funil' && leadId) {
    await supabase
      .from('leads')
      .update({ em_regua: true, regua_fluxo_id: fluxoId })
      .eq('id', leadId);
  }

  return { ok: true, row: data };
}
