import { describe, it, expect } from 'vitest';
import { mockNluProvider, resolveNluProvider } from './nlu';

const run = (utterance: string) => mockNluProvider.interpret({ utterance });

describe('mockNluProvider — NLU determinístico para CI/dev sem chave', () => {
  it('"muda pra verde" → CHANGE_FINISH', async () => {
    const c = await run('muda pra verde');
    expect(c.intent).toBe('CHANGE_FINISH');
    expect(c.params.finish).toBeTruthy();
    expect(c.echo).toBeTruthy();
  });

  it('"aumenta a altura em 10 cm" → RESIZE no eixo HEIGHT com deltaMm=100', async () => {
    const c = await run('aumenta a altura em 10 cm');
    expect(c.intent).toBe('RESIZE');
    expect(c.params.dimension?.axis).toBe('HEIGHT');
    expect(c.params.dimension?.deltaMm).toBe(100);
  });

  it('"adiciona uma gaveta embaixo" → ADD_ITEM GAVETA', async () => {
    const c = await run('adiciona uma gaveta embaixo');
    expect(c.intent).toBe('ADD_ITEM');
    expect(c.params.item?.type).toBe('GAVETA');
  });

  it('"coloca ferragem soft close" → CHANGE_HARDWARE SOFT_CLOSE', async () => {
    const c = await run('coloca ferragem soft close');
    expect(c.intent).toBe('CHANGE_HARDWARE');
    expect(c.params.hardware).toBe('SOFT_CLOSE');
  });

  it('"põe uma fita de led nas prateleiras" → ADD_LIGHTING', async () => {
    const c = await run('põe uma fita de led nas prateleiras');
    expect(c.intent).toBe('ADD_LIGHTING');
    expect(c.params.lighting).toBeTruthy();
  });

  it('frase ambígua → ASK_HELP com clarificationNeeded e baixa confiança', async () => {
    const c = await run('sei lá, faz aí bonito');
    expect(c.intent).toBe('ASK_HELP');
    expect(c.clarificationNeeded).toBe(true);
    expect(c.confidence).toBeLessThan(0.5);
  });

  it('sempre devolve um comando válido pelo schema (echo presente)', async () => {
    const c = await run('muda o material pra MDF 25mm');
    expect(c.intent).toBe('CHANGE_MATERIAL');
    expect(typeof c.echo).toBe('string');
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
