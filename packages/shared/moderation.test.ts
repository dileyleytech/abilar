import { describe, it, expect } from 'vitest';
import { maskContact, hasContact } from './moderation';
import { canMessage, reportInputSchema } from './domain';

describe('moderation — mascaramento de contato (§7.8)', () => {
  it('mascara e-mail', () => {
    expect(maskContact('me chama no joao@exemplo.com')).toBe('me chama no [contato oculto]');
  });

  it('mascara telefone com e sem separadores', () => {
    expect(maskContact('zap (11) 99999-8888')).toBe('zap [telefone oculto]');
    expect(maskContact('11999998888')).toBe('[telefone oculto]');
    expect(maskContact('+55 31 98471-2984')).toBe('[telefone oculto]');
  });

  it('mascara links', () => {
    expect(maskContact('olha https://wa.me/5511999998888')).toBe('olha [link oculto]');
    expect(maskContact('site www.marcenaria.com')).toBe('site [link oculto]');
  });

  it('não mascara texto normal nem medidas', () => {
    expect(maskContact('o armário tem 240 cm de largura')).toBe('o armário tem 240 cm de largura');
    expect(maskContact('Combinado, começo segunda!')).toBe('Combinado, começo segunda!');
  });

  it('hasContact detecta', () => {
    expect(hasContact('liga 11999998888')).toBe(true);
    expect(hasContact('tudo certo')).toBe(false);
  });

  it('mascara telefone escrito por extenso / com ruído entre os números', () => {
    // dígitos + números por extenso + palavras no meio (inclusive com erro de digitação)
    expect(hasContact('9 oito quadro 71 vinte nova 84')).toBe(true);
    expect(hasContact('meu zap é nove oito quatro sete um dois zero nove')).toBe(true);
    expect(maskContact('me liga 11 nove 9999 8888')).toContain('[telefone oculto]');
  });

  it('não mascara números pequenos do dia a dia', () => {
    expect(maskContact('trabalho vinte e quatro horas')).toBe('trabalho vinte e quatro horas');
    expect(maskContact('o armário tem 240 cm e 4 portas')).toBe('o armário tem 240 cm e 4 portas');
    expect(maskContact('faço em 3 a 4 dias, com 6 dobradiças')).toBe('faço em 3 a 4 dias, com 6 dobradiças');
  });
});

describe('moderação — conversa e denúncia (§7.8)', () => {
  it('só conversa ATIVA aceita mensagem', () => {
    expect(canMessage('ACTIVE')).toBe(true);
    expect(canMessage('CLOSED')).toBe(false);
    expect(canMessage('BLOCKED')).toBe(false);
  });

  it('denúncia exige razão válida; detalhe é opcional', () => {
    expect(reportInputSchema.safeParse({ reason: 'SCAM' }).success).toBe(true);
    expect(reportInputSchema.safeParse({ reason: 'OTHER', detail: 'tentou pagar por fora' }).success).toBe(true);
    expect(reportInputSchema.safeParse({ reason: 'INEXISTENTE' }).success).toBe(false);
    expect(reportInputSchema.safeParse({}).success).toBe(false);
  });

  it('detalhe muito longo é rejeitado', () => {
    expect(reportInputSchema.safeParse({ reason: 'SPAM', detail: 'x'.repeat(1001) }).success).toBe(false);
  });
});
