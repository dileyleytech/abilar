// moderation.ts — anti-disintermediação (§7.8): mascara telefone, e-mail e links
// nas mensagens do chat, para o negócio acontecer dentro da plataforma (garantia
// do escrow). Função pura e testável.

/** Substitui e-mails, links e telefones por marcadores. */
export function maskContact(text: string): string {
  let out = text;
  // E-mail
  out = out.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, '[contato oculto]');
  // Links (http/https/www)
  out = out.replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link oculto]');
  // Telefone: sequência com 8+ dígitos, podendo ter separadores comuns
  // (inclui um "(" ou "+" inicial, ex.: "(11) 99999-8888").
  out = out.replace(/[+(]?\d[\d\s().-]{6,}\d/g, (m) => {
    const digits = m.replace(/\D/g, '');
    return digits.length >= 8 ? '[telefone oculto]' : m;
  });
  return out;
}

/** True se o texto contém contato (após mascarar mudou) — útil p/ avisos. */
export function hasContact(text: string): boolean {
  return maskContact(text) !== text;
}
