import { describe, it, expect } from 'vitest';
import { createProjectSchema, moduleInputSchema, guidedMeasuresSchema } from './project-schemas';

describe('project-schemas (zod)', () => {
  it('createProject exige nome e aplica default de sourceType', () => {
    const p = createProjectSchema.parse({ title: 'Reforma apê' });
    expect(p.title).toBe('Reforma apê');
    expect(p.sourceType).toBe('AI_GENERATED');
  });

  it('rejeita projeto sem nome', () => {
    expect(() => createProjectSchema.parse({})).toThrow();
    expect(() => createProjectSchema.parse({ title: 'a' })).toThrow();
  });

  it('módulo converte cm → mm, valida sanidade e aceita workType', () => {
    const m = moduleInputSchema.parse({
      type: 'GUARDA_ROUPA',
      workType: 'NEW_INSTALL',
      widthMm: 240, // cm → 2400 mm
      heightMm: 260,
      depthMm: 55,
    });
    expect(m.widthMm).toBe(2400);
    expect(m.heightMm).toBe(2600);
    expect(m.depthMm).toBe(550);
    expect(m.workType).toBe('NEW_INSTALL');
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
