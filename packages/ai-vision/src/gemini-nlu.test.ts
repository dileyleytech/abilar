import { describe, it, expect, vi } from 'vitest';
import { createGeminiNluProvider } from './nlu';

/** Resposta do Gemini com a function call do lote (formato v1beta generateContent). */
const fnResponse = (args: unknown) =>
  new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ functionCall: { name: 'emit_design_commands', args } }] } }] }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

describe('createGeminiNluProvider — NLU em lote (Gemini, function calling)', () => {
  it('mapeia VÁRIOS comandos de uma fala (ex.: 80x120x35 + remover espelho)', async () => {
    const args = {
      commands: [
        { intent: 'RESIZE', params: { dimension: { axis: 'WIDTH', absoluteMm: 800 } } },
        { intent: 'RESIZE', params: { dimension: { axis: 'HEIGHT', absoluteMm: 1200 } } },
        { intent: 'RESIZE', params: { dimension: { axis: 'DEPTH', absoluteMm: 350 } } },
        { intent: 'REMOVE_ITEM', params: { item: { type: 'PRATELEIRA', qty: 1 } } },
      ],
      echo: 'Ajustei para 80×120×35 e removi o espelho.',
      confidence: 0.9,
    };
    const p = createGeminiNluProvider({ apiKey: 'k', fetchImpl: async () => fnResponse(args) });
    const b = await p.interpret({ utterance: 'aumenta pra 80x120x35 e tira o espelho' });
    expect(b.commands).toHaveLength(4);
    expect(b.commands.filter((c) => c.intent === 'RESIZE')).toHaveLength(3);
    expect(b.echo).toContain('80');
  });

  it('força function calling (mode ANY) na função de lote', async () => {
    let captured: { url: string; body: { tools: { functionDeclarations: { name: string }[] }[]; toolConfig: { functionCallingConfig: { mode: string } } } } | null = null;
    const fetchImpl: typeof fetch = async (url, init) => {
      captured = { url: String(url), body: JSON.parse((init as RequestInit).body as string) };
      return fnResponse({ commands: [], echo: 'ok' });
    };
    const p = createGeminiNluProvider({ apiKey: 'secret', model: 'gemini-x', fetchImpl });
    await p.interpret({ utterance: 'oi' });
    expect(captured!.url).toContain('gemini-x');
    expect(captured!.body.toolConfig.functionCallingConfig.mode).toBe('ANY');
    expect(captured!.body.tools[0]!.functionDeclarations[0]!.name).toBe('emit_design_commands');
  });

  it('sem function call → lote vazio com clarificationNeeded', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'desculpa' }] } }] }), { status: 200 }));
    const p = createGeminiNluProvider({ apiKey: 'k', fetchImpl });
    const b = await p.interpret({ utterance: '???' });
    expect(b.commands).toHaveLength(0);
    expect(b.clarificationNeeded).toBe(true);
  });

  it('erro HTTP vira lote vazio (não quebra o chat)', async () => {
    const fetchImpl = vi.fn(async () => new Response('quota', { status: 429 }));
    const p = createGeminiNluProvider({ apiKey: 'k', fetchImpl });
    const b = await p.interpret({ utterance: 'muda a cor' });
    expect(b.commands).toHaveLength(0);
    expect(b.clarificationNeeded).toBe(true);
  });
});
