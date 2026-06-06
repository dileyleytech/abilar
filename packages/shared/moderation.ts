// moderation.ts — anti-disintermediação (§7.8): mascara telefone, e-mail e links
// nas mensagens do chat, para o negócio acontecer dentro da plataforma (garantia
// do escrow). Função pura e testável.

const deaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Números por extenso (PT-BR) → quantos dígitos cada um representa. Cobre a
// evasão comum de escrever o telefone com palavras ("nove oito quatro...").
const NUMBER_WORDS: Record<string, number> = {
  zero: 1, um: 1, uma: 1, dois: 1, duas: 1, tres: 1, quatro: 1, cinco: 1,
  seis: 1, meia: 1, sete: 1, oito: 1, nove: 1,
  dez: 2, onze: 2, doze: 2, treze: 2, quatorze: 2, catorze: 2, quinze: 2,
  dezesseis: 2, dezessete: 2, dezoito: 2, dezenove: 2,
  vinte: 2, trinta: 2, quarenta: 2, cinquenta: 2, sessenta: 2, setenta: 2,
  oitenta: 2, noventa: 2,
};

const PHONE_MIN_DIGITS = 8; // 8+ dígitos "equivalentes" = parece telefone
const MAX_WORD_GAP = 2; // tolera até 2 palavras não-numéricas entre os números

type Tok = { start: number; end: number; isNum: boolean; digits: number };

/** Mascara sequências que parecem telefone, contando dígitos E números por
 *  extenso, tolerando palavras (inclusive com erro de digitação) no meio. */
function maskPhones(text: string): string {
  const tokenRe = /\d+|[A-Za-zÀ-ÿ]+/g;
  const toks: Tok[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(text))) {
    const t = m[0];
    if (/^\d+$/.test(t)) {
      toks.push({ start: m.index, end: m.index + t.length, isNum: true, digits: t.length });
    } else {
      const val = NUMBER_WORDS[deaccent(t.toLowerCase())];
      toks.push({ start: m.index, end: m.index + t.length, isNum: val != null, digits: val ?? 0 });
    }
  }

  // Agrupa números próximos (separados por no máx MAX_WORD_GAP palavras) e mascara
  // o trecho inteiro se a soma de dígitos atingir o limiar de telefone.
  const spans: { start: number; end: number }[] = [];
  let i = 0;
  while (i < toks.length) {
    if (!toks[i]!.isNum) {
      i++;
      continue;
    }
    let digits = toks[i]!.digits;
    let lastNum = i;
    let gap = 0;
    let k = i + 1;
    while (k < toks.length) {
      if (toks[k]!.isNum) {
        digits += toks[k]!.digits;
        lastNum = k;
        gap = 0;
      } else if (++gap > MAX_WORD_GAP) {
        break;
      }
      k++;
    }
    if (digits >= PHONE_MIN_DIGITS) {
      let start = toks[i]!.start;
      while (start > 0 && '+('.includes(text[start - 1]!)) start--; // inclui "+(" inicial
      spans.push({ start, end: toks[lastNum]!.end });
    }
    i = lastNum + 1;
  }

  if (spans.length === 0) return text;
  let out = text;
  for (let s = spans.length - 1; s >= 0; s--) {
    out = out.slice(0, spans[s]!.start) + '[telefone oculto]' + out.slice(spans[s]!.end);
  }
  return out;
}

/** Substitui e-mails, links e telefones por marcadores. */
export function maskContact(text: string): string {
  let out = text;
  // E-mail
  out = out.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, '[contato oculto]');
  // Links (http/https/www)
  out = out.replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link oculto]');
  // Telefone (dígitos e/ou números por extenso)
  out = maskPhones(out);
  return out;
}

/** True se o texto contém contato (após mascarar mudou) — útil p/ avisos. */
export function hasContact(text: string): boolean {
  return maskContact(text) !== text;
}
