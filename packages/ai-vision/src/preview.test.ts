import { describe, it, expect } from 'vitest';
import { previewJobSchema, pickPrimaryModule } from './preview';
import type { DesignState } from './state';

describe('preview — contrato do job de geração e escolha do módulo', () => {
  it('previewJobSchema valida o payload do job (produtor ↔ consumidor)', () => {
    const job = previewJobSchema.parse({
      projectId: '11111111-1111-1111-1111-111111111111',
      prompt: 'Interior photo…',
      baseImagePath: 'p/x.jpg',
      mimeType: 'image/jpeg',
    });
    expect(job.prompt).toContain('Interior');
    expect(job.baseImagePath).toBe('p/x.jpg');
  });

  it('previewJobSchema aceita baseImagePath nulo (geração do zero)', () => {
    const job = previewJobSchema.parse({ projectId: '11111111-1111-1111-1111-111111111111', prompt: 'x' });
    expect(job.baseImagePath).toBeNull();
  });

  it('previewJobSchema rejeita projectId inválido ou prompt vazio', () => {
    expect(() => previewJobSchema.parse({ projectId: 'nope', prompt: 'x' })).toThrow();
    expect(() => previewJobSchema.parse({ projectId: '11111111-1111-1111-1111-111111111111', prompt: '' })).toThrow();
  });

  it('pickPrimaryModule devolve o primeiro módulo (ou null se vazio)', () => {
    const state: DesignState = { modules: [
      { id: 'a', type: 'COZINHA', widthMm: 2000, heightMm: 700, depthMm: 600, items: [] },
      { id: 'b', type: 'ESTANTE', widthMm: 1000, heightMm: 2000, depthMm: 300, items: [] },
    ] };
    expect(pickPrimaryModule(state)?.id).toBe('a');
    expect(pickPrimaryModule({ modules: [] })).toBeNull();
  });
});
