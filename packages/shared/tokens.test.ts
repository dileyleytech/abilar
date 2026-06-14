import { describe, it, expect } from 'vitest';
import { radius, space, type as typeScale, shadow, container } from './tokens';

describe('tokens — escala de fundação (Fase A do redesign)', () => {
  it('raio é monotônico crescente (sm < md < lg < xl)', () => {
    expect(radius.sm).toBeLessThan(radius.md);
    expect(radius.md).toBeLessThan(radius.lg);
    expect(radius.lg).toBeLessThan(radius.xl);
    expect(radius.pill).toBeGreaterThan(radius.xl);
  });

  it('escala de espaçamento existe, é distinta e múltipla de 2px', () => {
    const values = Object.values(space);
    expect(values.length).toBeGreaterThan(0);
    expect(new Set(values).size).toBe(values.length); // sem duplicatas
    for (const v of values) expect(v % 2).toBe(0);
    const sorted = [...values].sort((a, b) => a - b);
    sorted.reduce((prev, cur) => {
      expect(cur).toBeGreaterThan(prev);
      return cur;
    }, -Infinity);
  });

  it('escala de tipografia cobre os papéis e decresce de display a caption', () => {
    for (const key of ['display', 'h1', 'h2', 'h3', 'body', 'small', 'caption'] as const) {
      expect(typeScale[key]).toBeTruthy();
      expect(typeScale[key].size).toBeGreaterThan(0);
      expect(typeScale[key].line).toBeGreaterThanOrEqual(typeScale[key].size);
    }
    expect(typeScale.display.size).toBeGreaterThan(typeScale.h1.size);
    expect(typeScale.h1.size).toBeGreaterThan(typeScale.h2.size);
    expect(typeScale.h2.size).toBeGreaterThan(typeScale.h3.size);
    expect(typeScale.body.size).toBeGreaterThan(typeScale.small.size);
    expect(typeScale.small.size).toBeGreaterThan(typeScale.caption.size);
  });

  it('sombras semânticas existem', () => {
    expect(shadow.card).toBeTruthy();
    expect(shadow.raised).toBeTruthy();
    expect(shadow.overlay).toBeTruthy();
  });

  it('larguras de container são crescentes', () => {
    expect(container.sm).toBeLessThan(container.md);
    expect(container.md).toBeLessThan(container.lg);
    expect(container.lg).toBeLessThan(container.xl);
  });
});
