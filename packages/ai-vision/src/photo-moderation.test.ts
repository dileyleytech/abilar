import { describe, it, expect } from 'vitest';
import { createGeminiPhotoModerator, resolvePhotoModerator } from './index';

const fnResp = (args: unknown) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ functionCall: { name: 'report_photo', args } }] } }] }), { status: 200 });

describe('moderação de foto (Gemini vision) — §8.7', () => {
  it('aceita foto relevante (cômodo/parede)', async () => {
    const m = createGeminiPhotoModerator({ apiKey: 'k', fetchImpl: async () => fnResp({ relevant: true }) });
    const r = await m.check('BASE64', 'image/jpeg');
    expect(r.relevant).toBe(true);
  });

  it('rejeita foto irrelevante com motivo amigável', async () => {
    const m = createGeminiPhotoModerator({ apiKey: 'k', fetchImpl: async () => fnResp({ relevant: false, reason: 'A foto não mostra um cômodo.' }) });
    const r = await m.check('BASE64', 'image/jpeg');
    expect(r.relevant).toBe(false);
    expect(r.reason).toMatch(/cômodo/i);
  });

  it('FAIL-OPEN: erro de API não bloqueia o upload (relevant=true)', async () => {
    const m = createGeminiPhotoModerator({ apiKey: 'k', fetchImpl: async () => new Response('boom', { status: 500 }) });
    const r = await m.check('BASE64', 'image/jpeg');
    expect(r.relevant).toBe(true);
  });

  it('envia a imagem inline para o modelo', async () => {
    let body: { contents: { parts: { inlineData?: { data?: string } }[] }[] } | null = null;
    const m = createGeminiPhotoModerator({
      apiKey: 'k',
      fetchImpl: async (_u, init) => { body = JSON.parse((init as RequestInit).body as string); return fnResp({ relevant: true }); },
    });
    await m.check('IMG64', 'image/png');
    expect(body!.contents[0]!.parts.some((p) => p.inlineData?.data === 'IMG64')).toBe(true);
  });

  it('resolvePhotoModerator: sem chave é permissivo; com chave usa o gemini', async () => {
    expect((await resolvePhotoModerator({}).check('x', 'image/jpeg')).relevant).toBe(true);
    expect(resolvePhotoModerator({ GEMINI_API_KEY: 'k' }).name).toBe('gemini');
  });
});
