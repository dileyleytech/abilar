import { describe, it, expect } from 'vitest';
import { applyCommand, type DesignState, MIN_DIMENSION_MM } from './state';
import { parseDesignCommand } from './dsl';

const baseState = (): DesignState => ({
  modules: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      type: 'COZINHA',
      widthMm: 2000,
      heightMm: 700,
      depthMm: 600,
      material: 'MDF 18mm',
      finish: 'Branco TX',
      items: [{ type: 'PORTA', qty: 2 }],
    },
  ],
});
const M = '11111111-1111-1111-1111-111111111111';

describe('applyCommand — estado estruturado é a fonte de verdade (§8.3)', () => {
  it('CHANGE_FINISH troca só o acabamento do módulo alvo', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: M, params: { finish: 'Carvalho Hanover' } }));
    expect(r.ok).toBe(true);
    expect(r.state.modules[0]!.finish).toBe('Carvalho Hanover');
    expect(r.state.modules[0]!.material).toBe('MDF 18mm'); // inalterado
  });

  it('CHANGE_MATERIAL troca o material', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'CHANGE_MATERIAL', targetModuleId: M, params: { material: 'MDF 25mm' } }));
    expect(r.state.modules[0]!.material).toBe('MDF 25mm');
  });

  it('RESIZE com deltaMm soma na medida certa (mm inteiros)', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'RESIZE', targetModuleId: M, params: { dimension: { axis: 'HEIGHT', deltaMm: 100 } } }));
    expect(r.ok).toBe(true);
    expect(r.state.modules[0]!.heightMm).toBe(800);
    expect(r.state.modules[0]!.widthMm).toBe(2000); // outros eixos intactos
  });

  it('RESIZE com absoluteMm define o valor', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'RESIZE', targetModuleId: M, params: { dimension: { axis: 'WIDTH', absoluteMm: 2500 } } }));
    expect(r.state.modules[0]!.widthMm).toBe(2500);
  });

  it('RESIZE que zeraria/negativaria a medida é rejeitado (não corrompe o estado)', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'RESIZE', targetModuleId: M, params: { dimension: { axis: 'HEIGHT', deltaMm: -1000 } } }));
    expect(r.ok).toBe(false);
    expect(r.state.modules[0]!.heightMm).toBe(700); // intacto
    expect(MIN_DIMENSION_MM).toBeGreaterThan(0);
  });

  it('ADD_ITEM acrescenta itens e soma quantidade do mesmo tipo/posição', () => {
    const r1 = applyCommand(baseState(), parseDesignCommand({ intent: 'ADD_ITEM', targetModuleId: M, params: { item: { type: 'GAVETA', qty: 2, position: 'INFERIOR' } } }));
    expect(r1.state.modules[0]!.items).toEqual(
      expect.arrayContaining([{ type: 'GAVETA', qty: 2, position: 'INFERIOR' }]),
    );
    const r2 = applyCommand(r1.state, parseDesignCommand({ intent: 'ADD_ITEM', targetModuleId: M, params: { item: { type: 'GAVETA', qty: 1, position: 'INFERIOR' } } }));
    const gaveta = r2.state.modules[0]!.items.find((i) => i.type === 'GAVETA' && i.position === 'INFERIOR');
    expect(gaveta!.qty).toBe(3);
  });

  it('REMOVE_ITEM remove o tipo indicado', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'REMOVE_ITEM', targetModuleId: M, params: { item: { type: 'PORTA', qty: 1 } } }));
    expect(r.state.modules[0]!.items.some((i) => i.type === 'PORTA')).toBe(false);
  });

  it('CHANGE_HARDWARE e ADD_LIGHTING ajustam o módulo', () => {
    const r1 = applyCommand(baseState(), parseDesignCommand({ intent: 'CHANGE_HARDWARE', targetModuleId: M, params: { hardware: 'SOFT_CLOSE' } }));
    expect(r1.state.modules[0]!.hardware).toBe('SOFT_CLOSE');
    const r2 = applyCommand(r1.state, parseDesignCommand({ intent: 'ADD_LIGHTING', targetModuleId: M, params: { lighting: 'FITA_LED_PRATELEIRAS' } }));
    expect(r2.state.modules[0]!.lighting).toBe('FITA_LED_PRATELEIRAS');
  });

  it("targetModuleId 'ALL' aplica em todos os módulos", () => {
    const state: DesignState = {
      modules: [baseState().modules[0]!, { ...baseState().modules[0]!, id: '22222222-2222-2222-2222-222222222222' }],
    };
    const r = applyCommand(state, parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: 'ALL', params: { finish: 'Preto Fosco' } }));
    expect(r.state.modules.every((m) => m.finish === 'Preto Fosco')).toBe(true);
  });

  it('módulo alvo inexistente devolve erro sem mudar o estado', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: '99999999-9999-9999-9999-999999999999', params: { finish: 'X' } }));
    expect(r.ok).toBe(false);
    expect(r.state.modules[0]!.finish).toBe('Branco TX');
  });

  it('é imutável: não muta o estado de entrada', () => {
    const input = baseState();
    applyCommand(input, parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: M, params: { finish: 'Z' } }));
    expect(input.modules[0]!.finish).toBe('Branco TX');
  });

  it('UNDO/ASK_HELP não alteram o estado (tratados na camada de sessão)', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'ASK_HELP' }));
    expect(r.ok).toBe(true);
    expect(r.state.modules[0]!.finish).toBe('Branco TX');
  });
});
