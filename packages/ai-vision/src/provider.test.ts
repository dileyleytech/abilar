import { describe, it, expect } from 'vitest';
import { echoProvider, type ImageEditProvider } from './index';

describe('ai-vision — contrato do ImageEditProvider', () => {
  it('echoProvider implementa a interface e devolve a imagem base', async () => {
    const provider: ImageEditProvider = echoProvider;
    const result = await provider.editImage({
      prompt: 'guarda-roupa branco TX, 6 portas',
      imageBase64: 'QUJD',
      mimeType: 'image/jpeg',
    });
    expect(result.provider).toBe('echo');
    expect(result.imageBase64).toBe('QUJD');
    expect(result.mimeType).toBe('image/jpeg');
  });
});
