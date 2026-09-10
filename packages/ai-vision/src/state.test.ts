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

  it('CHANGE_LAYOUT grava o arranjo interno pedido (deixa de ser no-op)', () => {
    const r = applyCommand(
      baseState(),
      parseDesignCommand({ intent: 'CHANGE_LAYOUT', targetModuleId: M, params: { layout: { description: 'gavetas embaixo e portas em cima' } } }),
    );
    expect(r.ok).toBe(true);
    expect(r.state.modules[0]!.layout).toBe('gavetas embaixo e portas em cima');
    expect(r.state.modules[0]!.finish).toBe('Branco TX'); // não mexe no resto
  });

  it('CHANGE_LAYOUT sem descrição é rejeitado (não confirma o que não fez)', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'CHANGE_LAYOUT', targetModuleId: M, params: {} }));
    expect(r.ok).toBe(false);
    expect(r.state.modules[0]!.layout).toBeUndefined();
    expect(r.message).toMatch(/organiz|arranj|divid|como/i);
  });

  it("CHANGE_LAYOUT com 'ALL' aplica em todos os módulos", () => {
    const state: DesignState = {
      modules: [baseState().modules[0]!, { ...baseState().modules[0]!, id: '22222222-2222-2222-2222-222222222222' }],
    };
    const r = applyCommand(state, parseDesignCommand({ intent: 'CHANGE_LAYOUT', targetModuleId: 'ALL', params: { layout: { description: 'tudo em prateleiras abertas' } } }));
    expect(r.state.modules.every((m) => m.layout === 'tudo em prateleiras abertas')).toBe(true);
  });

  it('REMOVE_ITEM de algo que o móvel não tem NÃO finge sucesso', () => {
    const semGaveta: DesignState = { modules: [{ ...baseState().modules[0]!, items: [] }] };
    const r = applyCommand(semGaveta, parseDesignCommand({ intent: 'REMOVE_ITEM', targetModuleId: M, params: { item: { type: 'GAVETA', qty: 1 } } }));
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/n[ãa]o tem|j[áa] (est[áa]|n[ãa]o)/i);
  });

  it('"tira as portas" num móvel sem itens cadastrados ainda ABRE a frente', () => {
    // Caso real: o cliente cadastrou só as medidas, mas a IMAGEM veio com portas.
    // O pedido tem de virar mudança de estado, senão a prévia nunca muda.
    const semItens: DesignState = { modules: [{ ...baseState().modules[0]!, items: [] }] };
    const r = applyCommand(semItens, parseDesignCommand({ intent: 'REMOVE_ITEM', targetModuleId: M, params: { item: { type: 'PORTA', qty: 1 } } }));
    expect(r.ok).toBe(true);
    expect(r.state.modules[0]!.openFront).toBe(true);
  });

  it('remover PORTA deixa a frente ABERTA (é isso que o cliente quer dizer)', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'REMOVE_ITEM', targetModuleId: M, params: { item: { type: 'PORTA', qty: 1 } } }));
    expect(r.ok).toBe(true);
    expect(r.state.modules[0]!.openFront).toBe(true);
    expect(r.state.modules[0]!.items.some((i) => i.type === 'PORTA')).toBe(false);
  });

  it('voltar a adicionar PORTA fecha a frente de novo', () => {
    const aberto = applyCommand(baseState(), parseDesignCommand({ intent: 'REMOVE_ITEM', targetModuleId: M, params: { item: { type: 'PORTA', qty: 1 } } })).state;
    const r = applyCommand(aberto, parseDesignCommand({ intent: 'ADD_ITEM', targetModuleId: M, params: { item: { type: 'PORTA', qty: 2 } } }));
    expect(r.state.modules[0]!.openFront).toBe(false);
  });

  it('CHANGE_LAYOUT com grade guarda linhas × colunas (a sapateira de nichos)', () => {
    const r = applyCommand(
      baseState(),
      parseDesignCommand({ intent: 'CHANGE_LAYOUT', targetModuleId: M, params: { layout: { description: 'nichos quadrados para sapatos', rows: 3, columns: 3, openFront: true } } }),
    );
    expect(r.ok).toBe(true);
    const m = r.state.modules[0]!;
    expect(m.grid).toEqual({ rows: 3, columns: 3 });
    expect(m.openFront).toBe(true);
    expect(m.items.some((i) => i.type === 'PORTA')).toBe(false); // grade aberta não tem porta
  });

  it('CHANGE_LAYOUT aceita só a descrição (sem grade) — texto livre continua valendo', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'CHANGE_LAYOUT', targetModuleId: M, params: { layout: { description: 'gavetas embaixo e portas em cima' } } }));
    expect(r.ok).toBe(true);
    expect(r.state.modules[0]!.layout).toBe('gavetas embaixo e portas em cima');
    expect(r.state.modules[0]!.grid).toBeUndefined();
  });

  it('ADD_ITEM aceita NICHO (vocabulário de marcenaria, não só porta/gaveta)', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'ADD_ITEM', targetModuleId: M, params: { item: { type: 'NICHO', qty: 9 } } }));
    expect(r.ok).toBe(true);
    expect(r.state.modules[0]!.items.find((i) => i.type === 'NICHO')?.qty).toBe(9);
  });

  it('comando que não muda NADA é rejeitado (a ABI não confirma o que não fez)', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'CHANGE_FINISH', targetModuleId: M, params: { finish: 'Branco TX' } }));
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/j[áa]/i);
  });

  it('UNDO/ASK_HELP não alteram o estado (tratados na camada de sessão)', () => {
    const r = applyCommand(baseState(), parseDesignCommand({ intent: 'ASK_HELP' }));
    expect(r.ok).toBe(true);
    expect(r.state.modules[0]!.finish).toBe('Branco TX');
  });
});
