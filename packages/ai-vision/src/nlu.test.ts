import { describe, it, expect } from 'vitest';
import { mockNluProvider, resolveNluProvider } from './nlu';

const run = (utterance: string) => mockNluProvider.interpret({ utterance });

describe('mockNluProvider — NLU determinístico (lote) para CI/dev sem chave', () => {
  it('"muda pra verde" → 1 comando CHANGE_FINISH', async () => {
    const b = await run('muda pra verde');
    expect(b.commands).toHaveLength(1);
    expect(b.commands[0]!.intent).toBe('CHANGE_FINISH');
    expect(b.commands[0]!.params.finish).toBeTruthy();
    expect(b.echo).toBeTruthy();
  });

  it('"aumenta a altura em 10 cm" → RESIZE HEIGHT deltaMm=100', async () => {
    const b = await run('aumenta a altura em 10 cm');
    expect(b.commands[0]!.intent).toBe('RESIZE');
    expect(b.commands[0]!.params.dimension?.axis).toBe('HEIGHT');
    expect(b.commands[0]!.params.dimension?.deltaMm).toBe(100);
  });

  it('"adiciona uma gaveta embaixo" → ADD_ITEM GAVETA', async () => {
    const b = await run('adiciona uma gaveta embaixo');
    expect(b.commands[0]!.intent).toBe('ADD_ITEM');
    expect(b.commands[0]!.params.item?.type).toBe('GAVETA');
  });

  it('"coloca ferragem soft close" → CHANGE_HARDWARE SOFT_CLOSE', async () => {
    const b = await run('coloca ferragem soft close');
    expect(b.commands[0]!.intent).toBe('CHANGE_HARDWARE');
    expect(b.commands[0]!.params.hardware).toBe('SOFT_CLOSE');
  });

  it('frase ambígua → lote vazio + clarificationNeeded', async () => {
    const b = await run('sei lá, faz aí bonito');
    expect(b.commands).toHaveLength(0);
    expect(b.clarificationNeeded).toBe(true);
    expect(b.confidence).toBeLessThan(0.5);
  });

  it('sempre devolve um lote válido (echo presente)', async () => {
    const b = await run('muda o material pra MDF 25mm');
    expect(b.commands[0]!.intent).toBe('CHANGE_MATERIAL');
    expect(typeof b.echo).toBe('string');
  });
});

describe('resolveNluProvider — provider trocável (regra de ouro #6: só Gemini)', () => {
  it('sem GEMINI_API_KEY cai no mock (CI/dev funciona sem chave)', () => {
    expect(resolveNluProvider({}).name).toBe('mock');
    expect(resolveNluProvider({ GEMINI_API_KEY: '' }).name).toBe('mock');
  });

  it('com GEMINI_API_KEY seleciona o provider Gemini', () => {
    expect(resolveNluProvider({ GEMINI_API_KEY: 'abc' }).name).toBe('gemini');
  });
});
