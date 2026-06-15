import { describe, it, expect } from 'vitest';
import { seedFromModules, applyTurn } from './session';
import { parseDesignCommand } from './dsl';

const mods = [
  { id: '11111111-1111-1111-1111-111111111111', type: 'COZINHA' as const, widthMm: 2000, heightMm: 700, depthMm: 600, material: 'MDF 18mm', finish: 'Branco TX' },
];

describe('sessão de design — estado + histórico + mensagens', () => {
  it('seedFromModules cria a sessão a partir dos módulos do projeto', () => {
    const s = seedFromModules(mods);
    expect(s.state.modules[0]!.finish).toBe('Branco TX');
    expect(s.messages).toEqual([]);
    expect(s.history).toEqual([]);
  });

  it('applyTurn aplica o comando, guarda histórico e registra as mensagens (usuário + ABI)', () => {
    const s0 = seedFromModules(mods);
    const cmd = parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: mods[0]!.id, params: { finish: 'Carvalho Hanover' }, echo: 'Troquei para Carvalho Hanover' });
    const s1 = applyTurn(s0, 'muda pra carvalho', cmd);
    expect(s1.state.modules[0]!.finish).toBe('Carvalho Hanover');
    expect(s1.history).toHaveLength(1); // estado anterior guardado
    expect(s1.messages.map((m) => m.role)).toEqual(['USER', 'ABI']);
    expect(s1.messages[1]!.text).toBe('Troquei para Carvalho Hanover');
  });

  it('UNDO restaura o estado anterior usando o histórico', () => {
    const s0 = seedFromModules(mods);
    const s1 = applyTurn(s0, 'verde', parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: mods[0]!.id, params: { finish: 'Verde' }, echo: 'ok' }));
    const s2 = applyTurn(s1, 'desfaz', parseDesignCommand({ intent: 'UNDO', echo: 'Desfiz' }));
    expect(s2.state.modules[0]!.finish).toBe('Branco TX'); // voltou
    expect(s2.history).toHaveLength(0);
  });

  it('UNDO sem histórico não quebra (no-op) e avisa', () => {
    const s0 = seedFromModules(mods);
    const s1 = applyTurn(s0, 'desfaz', parseDesignCommand({ intent: 'UNDO', echo: 'Desfiz' }));
    expect(s1.state.modules[0]!.finish).toBe('Branco TX');
    expect(s1.messages.at(-1)!.role).toBe('ABI');
  });

  it('comando que falha (medida pequena demais) registra o erro como ABI e não altera o estado', () => {
    const s0 = seedFromModules(mods);
    const s1 = applyTurn(s0, 'diminui muito', parseDesignCommand({ intent: 'RESIZE', targetModuleId: mods[0]!.id, params: { dimension: { axis: 'HEIGHT', deltaMm: -5000 } }, echo: 'ok' }));
    expect(s1.state.modules[0]!.heightMm).toBe(700); // intacto
    expect(s1.messages.at(-1)!.role).toBe('ABI');
    expect(s1.history).toHaveLength(0); // não empilha em comando falho
  });

  it('é imutável: não muta a sessão de entrada', () => {
    const s0 = seedFromModules(mods);
    applyTurn(s0, 'x', parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: mods[0]!.id, params: { finish: 'Z' }, echo: 'z' }));
    expect(s0.messages).toHaveLength(0);
    expect(s0.state.modules[0]!.finish).toBe('Branco TX');
  });
});
