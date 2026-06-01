import { describe, it, expect } from 'vitest';
import { echoProvider, type ImageEditProvider } from './index';

describe('ai-vision — contrato do ImageEditProvider', () => {
  it('echoProvider implementa a interface e devolve a imagem base', async () => {
    const provider: ImageEditProvider = echoProvider;
    const result = await provider.editImage({
      sourceImageUrl: 'https://r2.example/base.jpg',
      prompt: 'guarda-roupa branco TX, 6 portas',
    });
    expect(result.provider).toBe('echo');
    expect(result.imageUrl).toBe('https://r2.example/base.jpg');
  });
});
