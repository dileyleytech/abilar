import { describe, it, expect } from 'vitest';
import { buildImagePrompt, editScope } from './prompt';
import type { DesignModule } from './state';
import { parseDesignCommand } from './dsl';

const mod: DesignModule = {
  id: '11111111-1111-1111-1111-111111111111',
  type: 'COZINHA',
  widthMm: 2400,
  heightMm: 700,
  depthMm: 600,
  material: 'MDF 18mm',
  finish: 'Carvalho Hanover',
  hardware: 'SOFT_CLOSE',
  lighting: 'FITA_LED_PRATELEIRAS',
  items: [{ type: 'GAVETA', qty: 3, position: 'INFERIOR' }],
};

describe('buildImagePrompt — §8.5 (a imagem é ilustrativa; medidas NÃO entram, §8.3)', () => {
  it('inclui material, acabamento, ferragem e iluminação', () => {
    const { prompt } = buildImagePrompt(mod, { roomType: 'cozinha', workType: 'NEW_INSTALL' });
    expect(prompt).toContain('MDF 18mm');
    expect(prompt).toContain('Carvalho Hanover');
    expect(prompt.toLowerCase()).toContain('soft');
    expect(prompt.toLowerCase()).toContain('led');
  });

  it('REGRA DE OURO (§8.3): as dimensões do módulo NÃO entram no prompt', () => {
    // A espessura no nome do material (ex.: "MDF 18mm") é parte do material, não
    // uma medida do móvel — o que não pode vazar são largura/altura/profundidade.
    const { prompt } = buildImagePrompt(mod, { roomType: 'cozinha' });
    expect(prompt).not.toContain('2400'); // widthMm
    expect(prompt).not.toContain('700');  // heightMm
    expect(prompt).not.toContain('600');  // depthMm
    expect(prompt).not.toMatch(/\b(width|height|depth|altura|largura|profundidade)\b/i);
  });

  it('preserva o ambiente (paredes/piso/perspectiva) e edita só o móvel', () => {
    const { prompt } = buildImagePrompt(mod, { roomType: 'cozinha' });
    const low = prompt.toLowerCase();
    expect(low).toContain('keep');
    expect(low).toMatch(/perspective|walls|floor/);
    expect(low).toContain('only');
  });

  it('NEW_INSTALL fala em instalar; REPLACE_EXISTING fala em substituir', () => {
    const novo = buildImagePrompt(mod, { workType: 'NEW_INSTALL' }).prompt.toLowerCase();
    const troca = buildImagePrompt(mod, { workType: 'REPLACE_EXISTING' }).prompt.toLowerCase();
    expect(novo).toMatch(/install|add/);
    expect(troca).toMatch(/replace/);
  });

  it('usa o RÓTULO do cliente no prompt (ex.: "Sapateira" em type OUTRO)', () => {
    const sapateira: DesignModule = { ...mod, type: 'OUTRO', label: 'Sapateira' };
    const { prompt } = buildImagePrompt(sapateira, { roomType: 'hall' });
    expect(prompt).toContain('Sapateira');
    expect(prompt).not.toMatch(/TV panel/i);
  });

  it('editScope: cor/material/ferragem = local (inpainting); layout = global', () => {
    expect(editScope(parseDesignCommand({ intent: 'CHANGE_FINISH' }))).toBe('local');
    expect(editScope(parseDesignCommand({ intent: 'CHANGE_MATERIAL' }))).toBe('local');
    expect(editScope(parseDesignCommand({ intent: 'CHANGE_HARDWARE' }))).toBe('local');
    expect(editScope(parseDesignCommand({ intent: 'CHANGE_LAYOUT' }))).toBe('global');
    expect(editScope(parseDesignCommand({ intent: 'ADD_ITEM' }))).toBe('global');
  });
});
