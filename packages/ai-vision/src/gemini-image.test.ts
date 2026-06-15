import { describe, it, expect } from 'vitest';
import { createGeminiImageProvider, resolveImageProvider } from './index';

const imgResponse = (data: string, mimeType = 'image/png') =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] } }] }), { status: 200 });

describe('createGeminiImageProvider — edição de imagem (Nano Banana 2)', () => {
  it('mapeia a imagem inline da resposta para o resultado', async () => {
    const fetchImpl: typeof fetch = async () => imgResponse('R0lGODlh', 'image/png');
    const p = createGeminiImageProvider({ apiKey: 'k', fetchImpl });
    const r = await p.editImage({ prompt: 'cozinha verde', imageBase64: 'QUJD', mimeType: 'image/jpeg' });
    expect(r.provider).toBe('gemini');
    expect(r.imageBase64).toBe('R0lGODlh');
    expect(r.mimeType).toBe('image/png');
  });

  it('envia o prompt e a imagem base inline (inlineData) para o modelo', async () => {
    type Part = { text?: string; inlineData?: { data?: string } };
    type Body = { contents: { parts: Part[] }[] };
    let captured: { url: string; body: Body } | null = null;
    const fetchImpl: typeof fetch = async (url, init) => {
      captured = { url: String(url), body: JSON.parse((init as RequestInit).body as string) as Body };
      return imgResponse('AAAA');
    };
    const p = createGeminiImageProvider({ apiKey: 'secret', model: 'img-x', fetchImpl });
    await p.editImage({ prompt: 'troca pra carvalho', imageBase64: 'BASE64IMG', mimeType: 'image/jpeg' });
    expect(captured!.url).toContain('img-x');
    expect(captured!.url).toContain('secret');
    const parts = captured!.body.contents[0]!.parts;
    expect(parts.some((x) => x.text === 'troca pra carvalho')).toBe(true);
    expect(parts.some((x) => x.inlineData?.data === 'BASE64IMG')).toBe(true);
  });

  it('erro HTTP do modelo de imagem lança (falha deve ser tratada pelo chamador)', async () => {
    const fetchImpl: typeof fetch = async () => new Response('quota', { status: 429 });
    const p = createGeminiImageProvider({ apiKey: 'k', fetchImpl });
    await expect(p.editImage({ prompt: 'x' })).rejects.toThrow();
  });

  it('resposta sem imagem lança erro claro', async () => {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'sem imagem' }] } }] }), { status: 200 });
    const p = createGeminiImageProvider({ apiKey: 'k', fetchImpl });
    await expect(p.editImage({ prompt: 'x' })).rejects.toThrow();
  });
});

describe('resolveImageProvider — trocável (só Gemini)', () => {
  it('sem chave usa o echo (CI/dev); com chave usa o gemini', () => {
    expect(resolveImageProvider({}).name).toBe('echo');
    expect(resolveImageProvider({ GEMINI_API_KEY: 'k' }).name).toBe('gemini');
  });
});
