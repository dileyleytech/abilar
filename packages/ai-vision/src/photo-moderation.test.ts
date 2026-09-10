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

describe('moderação por PROPÓSITO — foto de referência não é foto de parede', () => {
  it('REFERENCE aceita foto de móvel/catálogo (não exige cômodo)', async () => {
    let enviado = '';
    const fake = (async (_u: string, init: { body: string }) => {
      enviado = JSON.parse(init.body).contents[0].parts[0].text;
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ functionCall: { args: { relevant: true } } }] } }] }) };
    }) as unknown as typeof fetch;
    const mod = createGeminiPhotoModerator({ apiKey: 'k', fetchImpl: fake });
    const r = await mod.check('abc', 'image/jpeg', 'REFERENCE');
    expect(r.relevant).toBe(true);
    expect(enviado.toLowerCase()).toMatch(/refer[êe]ncia|m[óo]vel|marcenaria/);
    expect(enviado.toLowerCase()).not.toMatch(/deve mostrar um c[ôo]modo/i);
  });

  it('ROOM continua exigindo cômodo/parede (default)', async () => {
    let enviado = '';
    const fake = (async (_u: string, init: { body: string }) => {
      enviado = JSON.parse(init.body).contents[0].parts[0].text;
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ functionCall: { args: { relevant: true } } }] } }] }) };
    }) as unknown as typeof fetch;
    await createGeminiPhotoModerator({ apiKey: 'k', fetchImpl: fake }).check('abc', 'image/jpeg');
    expect(enviado.toUpperCase()).toMatch(/C[ÔO]MODO|PAREDE/);
  });
});
