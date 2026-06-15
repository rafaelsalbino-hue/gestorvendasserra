import type { Tables } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;

/**
 * Dias completos entre uma data ISO e agora.
 */
export function daysSince(iso?: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

/**
 * Última movimentação considerada para "dias parado".
 * Fallback para contratos antigos sem o campo: usa etapa_updated_at / updated_at.
 */
export function getUltimaMovimentacaoAt(c: Partial<Contrato> & Record<string, any>): string | null {
  return (
    (c as any).ultima_movimentacao_at ??
    (c as any).etapa_updated_at ??
    (c as any).updated_at ??
    null
  );
}

export function getDiasParado(c: Partial<Contrato> & Record<string, any>): number {
  return daysSince(getUltimaMovimentacaoAt(c));
}

/**
 * Limite de dias na etapa Proposta/CRM, em dias corridos.
 * SESI Saúde (todas), SENAI e SESI Educação (Contraturno/ACE) = 4 dias.
 * Demais = 7 dias.
 */
export function getPropostaSlaLimit(c: Partial<Contrato> & Record<string, any>): number {
  const ent = (c as any).entidade as string | undefined;
  const sub = (c as any).subdivisao as string | undefined;
  if (ent === "SESI Saúde") return 4;
  if (ent === "SENAI") return 4;
  if (ent === "SESI" && (sub === "Contraturno" || sub === "ACE")) return 4;
  return 7;
}

/**
 * Dias decorridos na etapa Proposta (usa data_entrada_etapa_proposta, com fallback).
 */
export function getDiasNaProposta(c: Partial<Contrato> & Record<string, any>): number {
  const ref =
    (c as any).data_entrada_etapa_proposta ??
    (c as any).etapa_updated_at ??
    null;
  return daysSince(ref);
}

export function isPropostaVencida(c: Partial<Contrato> & Record<string, any>): boolean {
  if ((c as any).etapa_atual !== "proposta") return false;
  return getDiasNaProposta(c) > getPropostaSlaLimit(c);
}

export function isPropostaProximaVencimento(c: Partial<Contrato> & Record<string, any>): boolean {
  if ((c as any).etapa_atual !== "proposta") return false;
  const d = getDiasNaProposta(c);
  const limit = getPropostaSlaLimit(c);
  return d >= limit - 1 && d <= limit;
}

/**
 * Limite de dias na etapa Supervisor, em dias corridos.
 * SESI Saúde, SENAI e SESI Educação (Contraturno/ACE) = 4 dias.
 * Demais = 7 dias.
 */
export function getSupervisorSlaLimit(c: Partial<Contrato> & Record<string, any>): number {
  const ent = (c as any).entidade as string | undefined;
  const sub = (c as any).subdivisao as string | undefined;
  if (ent === "SESI Saúde") return 4;
  if (ent === "SENAI") return 4;
  if (ent === "SESI" && (sub === "Contraturno" || sub === "ACE")) return 4;
  return 7;
}

/**
 * Dias decorridos na etapa Supervisor.
 * Usa apenas etapa_updated_at — sem fallback para updated_at (que é bumpado por
 * qualquer edição de campo e inflaria os dias parados artificialmente).
 */
export function getDiasNoSupervisor(c: Partial<Contrato> & Record<string, any>): number {
  const ref = (c as any).etapa_updated_at ?? null;
  return daysSince(ref);
}

export function isSupervisorVencida(c: Partial<Contrato> & Record<string, any>): boolean {
  if ((c as any).etapa_atual !== "supervisor") return false;
  return getDiasNoSupervisor(c) > getSupervisorSlaLimit(c);
}

/**
 * Genérico: contrato "em atenção" = parado acima do limite da etapa.
 * Para Proposta e Supervisor usa limite por área; demais etapas usam 5 dias.
 */
export function isEmAtencao(c: Partial<Contrato> & Record<string, any>): boolean {
  if ((c as any).etapa_atual === "faturamento") return false;
  if ((c as any).etapa_atual === "proposta") return isPropostaVencida(c);
  if ((c as any).etapa_atual === "supervisor") return isSupervisorVencida(c);
  return getDiasParado(c) > 5;
}