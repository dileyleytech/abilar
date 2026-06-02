// br.ts — validadores/normalizadores brasileiros (puros, testáveis).
// CPF/CNPJ/CEP e telefone E.164 para o OTP (Supabase/Twilio).

const onlyDigits = (s: string) => s.replace(/\D/g, '');

/** Valida CPF pelos dígitos verificadores. */
export function isValidCpf(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

/** Valida CNPJ pelos dígitos verificadores. */
export function isValidCnpj(input: string): boolean {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * weights[i]!;
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

/** Valida CPF ou CNPJ conforme o tipo de pessoa. */
export function isValidDocument(input: string, personType: 'PF' | 'MEI' | 'PJ'): boolean {
  // MEI e PJ usam CNPJ; PF usa CPF. (MEI tem CNPJ próprio.)
  return personType === 'PF' ? isValidCpf(input) : isValidCnpj(input);
}

/** CEP brasileiro = 8 dígitos. */
export function isValidCep(input: string): boolean {
  return onlyDigits(input).length === 8;
}

/** Normaliza um telefone BR para E.164 (+55DDDNUMERO) ou null se inválido.
 *  Aceita celular (11 dígitos com 9) e fixo (10). Exige DDD. */
export function normalizeBrPhone(input: string): string | null {
  let d = onlyDigits(input);
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  if (d.length === 11 && d[2] !== '9') return null; // celular começa com 9
  return `+55${d}`;
}
