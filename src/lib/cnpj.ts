export function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calc = (digits: string, weights: number[]) =>
    weights.reduce((sum, w, i) => sum + parseInt(digits[i]) * w, 0);

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let r = calc(cnpj, w1) % 11;
  const d1 = r < 2 ? 0 : 11 - r;
  if (parseInt(cnpj[12]) !== d1) return false;

  r = calc(cnpj, w2) % 11;
  const d2 = r < 2 ? 0 : 11 - r;
  if (parseInt(cnpj[13]) !== d2) return false;

  return true;
}

export function formatarCNPJ(value: string): string {
  const digits = value.replace(/[^\d]/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
