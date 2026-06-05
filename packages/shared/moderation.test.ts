import { describe, it, expect } from 'vitest';
import { maskContact, hasContact } from './moderation';

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
});
