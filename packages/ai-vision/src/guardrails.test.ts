import { describe, it, expect } from 'vitest';
import { cacheKey, checkRegenLimit, DEFAULT_REGEN_LIMIT } from './guardrails';
import { parseDesignCommand } from './dsl';

describe('guardrails — cache e limite de custo (§8.7)', () => {
  it('cacheKey é estável para o mesmo (imagem base + comando), ignorando ordem dos params', () => {
    const c1 = parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: 'ALL', params: { finish: 'Carvalho', material: 'MDF 18mm' } });
    const c2 = parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: 'ALL', params: { material: 'MDF 18mm', finish: 'Carvalho' } });
    expect(cacheKey('r2://base.png', c1)).toBe(cacheKey('r2://base.png', c2));
  });

  it('cacheKey difere quando muda a imagem base, o intent ou os params', () => {
    const base = parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: 'ALL', params: { finish: 'Carvalho' } });
    const other = parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: 'ALL', params: { finish: 'Branco' } });
    expect(cacheKey('r2://a.png', base)).not.toBe(cacheKey('r2://b.png', base));
    expect(cacheKey('r2://a.png', base)).not.toBe(cacheKey('r2://a.png', other));
  });

  it('cacheKey ignora campos não-determinísticos (confidence/echo)', () => {
    const a = parseDesignCommand({ intent: 'RESIZE', targetModuleId: 'ALL', params: { dimension: { axis: 'WIDTH', deltaMm: 100 } }, confidence: 0.9, echo: 'x' });
    const b = parseDesignCommand({ intent: 'RESIZE', targetModuleId: 'ALL', params: { dimension: { axis: 'WIDTH', deltaMm: 100 } }, confidence: 0.1, echo: 'y' });
    expect(cacheKey('r2://base.png', a)).toBe(cacheKey('r2://base.png', b));
  });

  it('checkRegenLimit libera abaixo do limite e bloqueia ao atingir', () => {
    const ok = checkRegenLimit(0, 3);
    expect(ok.allowed).toBe(true);
    expect(ok.remaining).toBe(3);

    const last = checkRegenLimit(2, 3);
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(1);

    const blocked = checkRegenLimit(3, 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.message).toMatch(/limite|aguarde|máximo/i);
  });

  it('usa um limite padrão sensato quando não informado', () => {
    expect(DEFAULT_REGEN_LIMIT).toBeGreaterThan(0);
    expect(checkRegenLimit(DEFAULT_REGEN_LIMIT).allowed).toBe(false);
  });
});
