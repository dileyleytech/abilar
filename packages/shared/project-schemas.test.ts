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

  it('aceita medidas grandes (sem limite) e rejeita não-positivas', () => {
    const big = moduleInputSchema.parse({ type: 'x', widthMm: 1000, heightMm: 800, depthMm: 90 });
    expect(big.widthMm).toBe(10000); // 1000 cm → 10 m, aceito
    expect(() => moduleInputSchema.parse({ type: 'x', widthMm: 0, heightMm: 100, depthMm: 50 })).toThrow();
  });

  it('guidedMeasures entrega mm', () => {
    const g = guidedMeasuresSchema.parse({ widthMm: 200, heightMm: 250, depthMm: 60 });
    expect(g).toEqual({ widthMm: 2000, heightMm: 2500, depthMm: 600 });
  });
});
