/** Link de "voltar" seguro: usa o `from` (origem interna) quando válido, senão o
 *  fallback. Permite voltar à conversa quando o usuário veio do chat. */
export function backFrom(from: string | undefined, fallback: string): { href: string; label: string } {
  if (from && from.startsWith('/') && !from.startsWith('//')) {
    return { href: from, label: from.startsWith('/conversas') ? '← Voltar à conversa' : '← Voltar' };
  }
  return { href: fallback, label: '← Voltar' };
}
