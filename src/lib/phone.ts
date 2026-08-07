/** Formata número BR para exibição: (49) 99999-9999 */
export function formatWhatsapp(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Apenas dígitos (DDD + número), como armazenado no banco */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Valida celular BR: 10 ou 11 dígitos com DDD */
export function isValidWhatsapp(value: string): boolean {
  const d = onlyDigits(value);
  return d.length === 10 || d.length === 11;
}