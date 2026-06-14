import { describe, it, expect, vi } from 'vitest';
import { createGeminiNluProvider } from './nlu';

/** Resposta do Gemini com uma function call (formato v1beta generateContent). */
const fnResponse = (args: unknown) =>
  new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ functionCall: { name: 'emit_design_command', args } }] } }] }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

describe('createGeminiNluProvider — NLU real (Gemini Flash-Lite, function calling)', () => {
  it('mapeia a function call do Gemini para um DesignCommand validado', async () => {
    const fetchImpl = vi.fn(async () => fnResponse({ intent: 'CHANGE_FINISH', params: { finish: 'Verde' }, confidence: 0.9, echo: 'Troquei para verde' }));
    const p = createGeminiNluProvider({ apiKey: 'k', fetchImpl });
    const cmd = await p.interpret({ utterance: 'muda pra verde' });
    expect(cmd.intent).toBe('CHANGE_FINISH');
    expect(cmd.params.finish).toBe('Verde');
    expect(cmd.confidence).toBe(0.9);
    expect(p.name).toBe('gemini');
  });

  it('chama o endpoint com a chave, o modelo e força function calling (mode ANY)', async () => {
    let captured: { url: string; init?: RequestInit } | null = null;
    const fetchImpl: typeof fetch = async (url, init) => {
      captured = { url: String(url), init };
      return fnResponse({ intent: 'ASK_HELP' });
    };
    const p = createGeminiNluProvider({ apiKey: 'secret-key', model: 'gemini-x', fetchImpl });
    await p.interpret({ utterance: 'oi' });
    expect(captured).not.toBeNull();
    const { url, init } = captured!;
    expect(url).toContain('gemini-x');
    expect(url).toContain('secret-key');
    const body = JSON.parse(init!.body as string);
    expect(body.toolConfig.functionCallingConfig.mode).toBe('ANY');
    expect(body.tools[0].functionDeclarations[0].name).toBe('emit_design_command');
  });

  it('sem function call na resposta → ASK_HELP com clarificationNeeded', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'desculpa' }] } }] }), { status: 200 }));
    const p = createGeminiNluProvider({ apiKey: 'k', fetchImpl });
    const cmd = await p.interpret({ utterance: '???' });
    expect(cmd.intent).toBe('ASK_HELP');
    expect(cmd.clarificationNeeded).toBe(true);
  });

  it('erro HTTP do Gemini vira ASK_HELP (não quebra o chat)', async () => {
    const fetchImpl = vi.fn(async () => new Response('quota', { status: 429 }));
    const p = createGeminiNluProvider({ apiKey: 'k', fetchImpl });
    const cmd = await p.interpret({ utterance: 'muda a cor' });
    expect(cmd.intent).toBe('ASK_HELP');
    expect(cmd.clarificationNeeded).toBe(true);
  });
});
