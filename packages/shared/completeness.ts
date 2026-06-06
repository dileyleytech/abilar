// completeness.ts — verificador de completude do orçamento (§7.6). Regras
// determinísticas: NUNCA bloqueia, só SUGERE o que costuma faltar. Função pura.
import type { MaterialCategory } from './domain';

/** Sugestões com base no que normalmente compõe um móvel planejado.
 *  Recebe as categorias dos itens já lançados e devolve avisos amigáveis. */
export function checkCompleteness(itemCategories: MaterialCategory[]): string[] {
  const has = (c: MaterialCategory) => itemCategories.includes(c);
  const out: string[] = [];

  if (!has('CHAPA') && !has('ESPELHO')) {
    out.push('Sem chapa (MDF/MDP) — confira a matéria-prima da peça.');
  }
  if (!has('FITA_BORDA')) {
    out.push('Faltou fita de borda?');
  }
  if (!has('FERRAGEM') && !has('ACESSORIO')) {
    out.push('Sem ferragens (dobradiças, corrediças, puxadores)?');
  }
  if (!has('SERVICO')) {
    out.push('Sem mão de obra / montagem?');
  }
  if (!has('FRETE')) {
    out.push('Sem frete / entrega?');
  }
  return out;
}
