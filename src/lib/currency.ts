/**
 * Helpers de formatação BRL (R$).
 * - formatBRL: número -> "1.234,56"
 * - formatBRLInput: string digitada -> "1.234,56"
 * - parseBRL: string formatada -> número
 */
export function formatBRL(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatBRLInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseBRL(formatted: string): number {
  if (!formatted) return 0;
  const clean = String(formatted).replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}