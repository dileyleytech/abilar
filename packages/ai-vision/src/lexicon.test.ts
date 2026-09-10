import { describe, it, expect } from 'vitest';
import { mockNluProvider } from './nlu';
import { GLOSSARY_FOR_PROMPT, detectGrid, normalizeFinish } from './lexicon';

const run = (utterance: string) => mockNluProvider.interpret({ utterance });

describe('léxico de marcenaria — o cliente fala como quiser (§8.4)', () => {
  it('reconhece a GRADE dita de várias formas', () => {
    expect(detectGrid('3 andares de nichos com 3 colunas cada andar')).toEqual({ rows: 3, columns: 3 });
    expect(detectGrid('quero 3x3')).toEqual({ rows: 3, columns: 3 });
    expect(detectGrid('duas fileiras de cinco nichos')).toEqual({ rows: 2, columns: 5 });
    expect(detectGrid('4 linhas por 2 colunas')).toEqual({ rows: 4, columns: 2 });
    expect(detectGrid('muda a cor pra cinza')).toBeNull();
  });

  it.each([
    'gostaria que o movel tivesse ninchos e não portas',
    'quero uma colmeia pra guardar sapato',
    'faz tipo escaninho, uns quadrados abertos',
    'sem porta nenhuma, tudo vazado',
    'deixa aberto, quero ver os sapatos',
  ])('entende pedido de FRENTE ABERTA: %s', async (fala) => {
    const b = await run(fala);
    const cmd = b.commands.find((c) => c.intent === 'CHANGE_LAYOUT' || c.intent === 'REMOVE_ITEM');
    expect(cmd, `não entendeu: ${fala}`).toBeTruthy();
    const abriu = cmd!.params.layout?.openFront === true || cmd!.params.item?.type === 'PORTA';
    expect(abriu).toBe(true);
  });

  it.each([
    ['cinza escuro', /cinza/i],
    ['quero grafite', /grafite|cinza/i],
    ['pinta de branco', /branco/i],
    ['tom amadeirado, tipo carvalho', /carvalho|amadeirado/i],
    ['preto fosco', /preto/i],
  ])('entende a cor "%s"', async (fala, esperado) => {
    const b = await run(fala);
    const cmd = b.commands.find((c) => c.intent === 'CHANGE_FINISH');
    expect(cmd, `não entendeu a cor: ${fala}`).toBeTruthy();
    expect(cmd!.params.finish).toMatch(esperado);
  });

  it.each([
    ['coloca um gaveteiro embaixo', 'ADD_ITEM', 'GAVETA'],
    ['quero uma arara pra pendurar roupa', 'ADD_ITEM', 'CABIDEIRO'],
    ['põe mais duas prateleiras', 'ADD_ITEM', 'PRATELEIRA'],
    ['tira as gavetas', 'REMOVE_ITEM', 'GAVETA'],
  ])('"%s" → %s %s', async (fala, intent, tipo) => {
    const b = await run(fala);
    expect(b.commands[0]!.intent).toBe(intent);
    expect(b.commands[0]!.params.item?.type).toBe(tipo);
  });

  it('entende ferragem por sinônimos populares', async () => {
    expect((await run('não quero puxador aparecendo')).commands[0]!.params.hardware).toBeTruthy();
    expect((await run('quero que abra no toque')).commands[0]!.params.hardware).toBe('PUSH');
    expect((await run('porta que fecha sozinha devagar')).commands[0]!.params.hardware).toBe('SOFT_CLOSE');
  });

  it('normalizeFinish converte fala solta em acabamento nomeado', () => {
    expect(normalizeFinish('cinza escuro')).toMatch(/cinza/i);
    expect(normalizeFinish('off white')).toMatch(/branco|off/i);
    expect(normalizeFinish('nada com cor')).toBeNull();
  });

  it('o glossário vai para o prompt do Gemini (não fica só no mock)', () => {
    expect(GLOSSARY_FOR_PROMPT).toMatch(/colmeia/i);
    expect(GLOSSARY_FOR_PROMPT).toMatch(/nicho/i);
    expect(GLOSSARY_FOR_PROMPT).toMatch(/gaveteiro/i);
    expect(GLOSSARY_FOR_PROMPT.length).toBeGreaterThan(400);
  });

  it('o caso real que falhou: "Remova todas e coloque 3 andares de nichos com 3 colunas cada andar"', async () => {
    const b = await run('Remova todas e coloque 3 andares de ninchos com 3 colunas cada andar');
    const layout = b.commands.find((c) => c.intent === 'CHANGE_LAYOUT');
    expect(layout).toBeTruthy();
    expect(layout!.params.layout?.rows).toBe(3);
    expect(layout!.params.layout?.columns).toBe(3);
    expect(layout!.params.layout?.openFront).toBe(true);
  });
});
