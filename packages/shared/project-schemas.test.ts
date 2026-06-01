import { describe, it, expect } from 'vitest';
import { createProjectSchema, moduleInputSchema, guidedMeasuresSchema } from './project-schemas';

describe('project-schemas (zod)', () => {
  it('createProject aplica default de sourceType', () => {
    const p = createProjectSchema.parse({ category: 'COZINHA', workType: 'NEW_INSTALL' });
    expect(p.sourceType).toBe('AI_GENERATED');
  });

  it('rejeita categoria/workType inválidos', () => {
    expect(() => createProjectSchema.parse({ category: 'X', workType: 'NEW_INSTALL' })).toThrow();
    expect(() => createProjectSchema.parse({ category: 'COZINHA', workType: 'NOVA' })).toThrow();
  });

  it('módulo converte cm → mm e valida sanidade', () => {
    const m = moduleInputSchema.parse({
      type: 'guarda-roupa',
      widthMm: 240, // cm → 2400 mm
      heightMm: 260,
      depthMm: 55,
    });
    expect(m.widthMm).toBe(2400);
    expect(m.heightMm).toBe(2600);
    expect(m.depthMm).toBe(550);
  });

  it('rejeita medida fora da faixa de sanidade', () => {
    expect(() =>
      moduleInputSchema.parse({ type: 'x', widthMm: 1, heightMm: 100, depthMm: 50 }),
    ).toThrow(); // 1 cm = 10 mm < 50 mm
    expect(() =>
      moduleInputSchema.parse({ type: 'x', widthMm: 700, heightMm: 100, depthMm: 50 }),
    ).toThrow(); // 700 cm = 7000 mm > 6000 mm
  });

  it('guidedMeasures entrega mm', () => {
    const g = guidedMeasuresSchema.parse({ widthMm: 200, heightMm: 250, depthMm: 60 });
    expect(g).toEqual({ widthMm: 2000, heightMm: 2500, depthMm: 600 });
  });
});
