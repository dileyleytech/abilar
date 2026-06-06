import { describe, it, expect } from 'vitest';
import { checkCompleteness } from './completeness';

describe('checkCompleteness — sugestões do orçamento (§7.6, nunca bloqueia)', () => {
  it('orçamento completo não gera sugestões', () => {
    expect(
      checkCompleteness(['CHAPA', 'FITA_BORDA', 'FERRAGEM', 'SERVICO', 'FRETE']),
    ).toEqual([]);
  });

  it('aponta o que falta', () => {
    const out = checkCompleteness(['CHAPA']);
    expect(out.join(' ')).toMatch(/fita de borda/i);
    expect(out.join(' ')).toMatch(/ferragens/i);
    expect(out.join(' ')).toMatch(/m[ãa]o de obra/i);
    expect(out.join(' ')).toMatch(/frete/i);
  });

  it('espelho conta como matéria-prima (não cobra chapa)', () => {
    const out = checkCompleteness(['ESPELHO', 'FITA_BORDA', 'ACESSORIO', 'SERVICO', 'FRETE']);
    expect(out.join(' ')).not.toMatch(/chapa/i);
  });
});
