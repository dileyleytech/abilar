// lexicon.ts — VOCABULÁRIO DE MARCENARIA em PT-BR (§8.4). Puro.
//
// Por que existe: o cliente não fala a taxonomia do sistema. Ele diz "colmeia",
// "escaninho", "quadradinhos", "vazado", "grafite", "arara", "abre no toque".
// Se o NLU só entende o jeito de UMA pessoa falar, o chat vira loteria.
//
// Serve a duas pontas:
//  • `GLOSSARY_FOR_PROMPT` entra no system prompt do Gemini (o NLU de verdade);
//  • os mapas alimentam o parser determinístico (mock) usado em CI e sem chave.
//
// Fontes do vocabulário popular: glossários de marcenaria/planejados e o modo como
// o varejo brasileiro nomeia os produtos ("armário colmeia", "sapateira colmeia").

/** Compartimento aberto e seus muitos apelidos populares. */
export const NICHO_WORDS = [
  'nicho', 'ninch', 'nixo', 'colmeia', 'colméia', 'escaninho', 'cubo', 'cubículo',
  'quadrado', 'quadradinho', 'quadriculado', 'vão', 'vao', 'repartição', 'reparticao',
  'divisória', 'divisoria', 'compartimento', 'casinha', 'gaveta aberta',
];

/** Palavras que dizem "sem porta / frente aberta". */
export const OPEN_WORDS = [
  'aberto', 'aberta', 'abertos', 'abertas', 'vazado', 'vazada', 'sem porta',
  'sem portas', 'nada de porta', 'não quero porta', 'nao quero porta', 'tudo aberto',
  'deixa aberto', 'deixar aberto', 'expost', 'à mostra', 'a mostra', 'ver os sapatos',
];

/** Superfície superior (o "tampo" do móvel). */
export const TOP_WORDS = ['bancada', 'tampo', 'tampão', 'tampao', 'superfície lisa', 'superficie lisa', 'assento', 'banquinho', 'banco'];

/** Sinônimos populares → tipo de item da DSL. */
export const ITEM_WORDS: Record<string, string[]> = {
  GAVETA: ['gaveta', 'gavetas', 'gaveteiro', 'gavetão', 'gavetao', 'gaveteirinho'],
  PORTA: ['porta', 'portas', 'portinha', 'portinhola', 'folha de porta', 'de correr', 'basculante', 'veneziana'],
  PRATELEIRA: ['prateleira', 'prateleiras', 'prateleirinha', 'bandeja', 'estante interna', 'ripado', 'ripada'],
  CABIDEIRO: ['cabideiro', 'arara', 'varão', 'varao', 'pendurar roupa', 'pendurar as roupas', 'cabide'],
  NICHO: NICHO_WORDS,
};

/** Sinônimos populares → ferragem. */
export const HARDWARE_WORDS: Record<string, string[]> = {
  SOFT_CLOSE: ['soft close', 'soft-close', 'softclose', 'amortecedor', 'amortecid', 'fecha sozinha', 'fecha sozinho', 'fechamento suave', 'não bate', 'nao bate'],
  PUSH: ['push', 'toque', 'apertar pra abrir', 'aperta e abre', 'abre no toque', 'sem puxador', 'pressão', 'pressao'],
  PUXADOR_CAVA: ['cava', 'puxador cava', 'puxador embutido', 'perfil', 'canaleta', 'puxador escondido', 'puxador aparec', 'sem puxador aparente'],
};

/**
 * Acabamentos: fala solta → nome do acabamento. A ordem importa (o mais específico
 * primeiro), porque "cinza escuro" precisa ganhar de "cinza".
 */
export const FINISH_WORDS: [string, string][] = [
  ['cinza escuro', 'Cinza Escuro'],
  ['cinza claro', 'Cinza Claro'],
  ['grafite', 'Grafite (cinza escuro)'],
  ['chumbo', 'Chumbo (cinza escuro)'],
  ['fendi', 'Fendi (cinza claro)'],
  ['off white', 'Off-white'],
  ['off-white', 'Off-white'],
  ['branco', 'Branco TX'],
  ['preto', 'Preto Fosco'],
  ['cinza', 'Cinza'],
  ['carvalho', 'Carvalho Hanover'],
  ['freijó', 'Freijó'],
  ['freijo', 'Freijó'],
  ['nogueira', 'Nogueira'],
  ['imbuia', 'Imbuia'],
  ['amadeirado', 'Amadeirado'],
  ['madeirado', 'Amadeirado'],
  ['areia', 'Areia'],
  ['bege', 'Bege'],
  ['verde', 'Verde'],
  ['azul', 'Azul'],
  ['vermelho', 'Vermelho'],
  ['amarelo', 'Amarelo'],
];

const NUM_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, doze: 12,
};

function toNumber(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  return NUM_WORDS[t] ?? null;
}

const N = '(\\d+|um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez|doze)';
const ROW_WORD = '(andar(?:es)?|fileira?s?|linha?s?|n[íi]ve(?:l|is)|prateleiras?)';
const COL_WORD = '(coluna?s?|colunas|por linha|em cada|cada)';

/**
 * Extrai uma GRADE (linhas × colunas) da fala: "3 andares com 3 colunas",
 * "3x3", "duas fileiras de cinco nichos", "4 linhas por 2 colunas".
 */
export function detectGrid(utterance: string): { rows: number; columns: number } | null {
  const t = utterance.toLowerCase();

  // "3x3" / "3 x 3" / "3 por 3"
  const cross = t.match(new RegExp(`${N}\\s*(?:x|por)\\s*${N}`, 'i'));
  if (cross) {
    const rows = toNumber(cross[1]!);
    const columns = toNumber(cross[2]!);
    if (rows && columns) return { rows, columns };
  }

  // "3 andares ... 3 colunas" (nesta ordem)
  const rowsMatch = t.match(new RegExp(`${N}\\s+${ROW_WORD}`, 'i'));
  const colsMatch = t.match(new RegExp(`${N}\\s+${COL_WORD}`, 'i'));
  if (rowsMatch && colsMatch) {
    const rows = toNumber(rowsMatch[1]!);
    const columns = toNumber(colsMatch[1]!);
    if (rows && columns) return { rows, columns };
  }

  // "duas fileiras de cinco nichos" → linhas e, depois, quantos por linha
  const pair = t.match(new RegExp(`${N}\\s+${ROW_WORD}\\s+(?:de|com)\\s+${N}`, 'i'));
  if (pair) {
    const rows = toNumber(pair[1]!);
    const columns = toNumber(pair[3]!);
    if (rows && columns) return { rows, columns };
  }
  return null;
}

/** Fala solta → acabamento nomeado (ou null quando não há cor na frase). */
export function normalizeFinish(utterance: string): string | null {
  const t = utterance.toLowerCase();
  const hit = FINISH_WORDS.find(([word]) => t.includes(word));
  return hit ? hit[1] : null;
}

/** A fala pede frente aberta (sem portas)? */
export function wantsOpenFront(utterance: string): boolean {
  const t = utterance.toLowerCase();
  return OPEN_WORDS.some((w) => t.includes(w)) || /(sem|tira|remov|nada de|n[ãa]o quero).{0,20}port/.test(t);
}

/** A fala menciona nicho/colmeia/escaninho? */
export function mentionsNiche(utterance: string): boolean {
  const t = utterance.toLowerCase();
  return NICHO_WORDS.some((w) => t.includes(w));
}

/** A fala pede uma bancada/tampo liso em cima? */
export function mentionsTop(utterance: string): boolean {
  const t = utterance.toLowerCase();
  return TOP_WORDS.some((w) => t.includes(w));
}

/** Primeiro tipo de item citado na fala (o mais específico ganha). */
export function detectItemType(utterance: string): string | null {
  const t = utterance.toLowerCase();
  // NICHO antes de PRATELEIRA: "nicho" costuma vir junto de "prateleira" na fala.
  for (const tipo of ['NICHO', 'GAVETA', 'CABIDEIRO', 'PORTA', 'PRATELEIRA']) {
    if (ITEM_WORDS[tipo]!.some((w) => t.includes(w))) return tipo;
  }
  return null;
}

/** Ferragem citada na fala. */
export function detectHardware(utterance: string): string | null {
  const t = utterance.toLowerCase();
  for (const [kind, words] of Object.entries(HARDWARE_WORDS)) {
    if (words.some((w) => t.includes(w))) return kind;
  }
  return null;
}

/**
 * Glossário que vai DENTRO do system prompt do Gemini. É o que faz o NLU real
 * entender quem fala diferente de nós — o mock abaixo é só a rede de segurança.
 */
export const GLOSSARY_FOR_PROMPT = [
  'GLOSSÁRIO PT-BR (o cliente é leigo; aceite qualquer um destes jeitos de falar):',
  '• NICHO = compartimento aberto. Também chamam de colmeia/colméia, escaninho, cubo, quadrado, quadradinho, vão, divisória, repartição. Uma parede de nichos em grade = "colmeia".',
  '• GAVETA = gaveta, gaveteiro, gavetão.',
  '• PORTA = porta, portinha, folha, porta de correr, basculante, veneziana.',
  '• PRATELEIRA = prateleira, bandeja, ripado.',
  '• CABIDEIRO = cabideiro, arara, varão, "pra pendurar roupa".',
  '• "sem porta", "vazado", "tudo aberto", "à mostra", "quero ver os sapatos" = frente ABERTA → CHANGE_LAYOUT com openFront=true (e REMOVE_ITEM de PORTA se houver portas).',
  '• GRADE: "3 andares com 3 colunas", "3x3", "duas fileiras de cinco" → CHANGE_LAYOUT com rows e columns.',
  '• BANCADA/TAMPO/assento liso em cima = parte do arranjo: descreva em layout.description.',
  '• FERRAGEM: "abre no toque"/"sem puxador" = PUSH; "fecha sozinha devagar"/"amortecida" = SOFT_CLOSE; "puxador embutido"/"cava"/"perfil" = PUXADOR_CAVA.',
  '• COR/ACABAMENTO: grafite, chumbo e fendi são cinzas; off-white é branco; freijó, carvalho, nogueira e imbuia são amadeirados. "MDF cinza escuro" = material MDF + acabamento Cinza Escuro (DOIS comandos).',
  '• TIPOS DE MÓVEL: sapateira, closet, guarda-roupa, rack, painel, estante, torre, balcão, aéreo, gabinete, cristaleira, adega.',
].join('\n');

/** Exemplos few-shot: falas reais → o que o NLU deve emitir. */
export const NLU_EXAMPLES = [
  'EXEMPLOS:',
  '"gostaria que o móvel tivesse nichos e não portas, uns quadrados, e uma bancada lisa em cima, em MDF cinza escuro"',
  '→ CHANGE_LAYOUT {layout:{description:"nichos quadrados com bancada lisa no topo", openFront:true}} + CHANGE_MATERIAL {material:"MDF 18mm"} + CHANGE_FINISH {finish:"Cinza Escuro"}',
  '"Remova todas e coloque 3 andares de nichos com 3 colunas cada andar"',
  '→ CHANGE_LAYOUT {layout:{description:"nichos abertos em grade", rows:3, columns:3, openFront:true}}',
  '"o móvel continua com portas. Remova todas"',
  '→ REMOVE_ITEM {item:{type:"PORTA",qty:1}} (isso deixa a frente aberta)',
  '"aumenta 10 cm a altura e deixa o puxador embutido"',
  '→ RESIZE {dimension:{axis:"HEIGHT",deltaMm:100}} + CHANGE_HARDWARE {hardware:"PUXADOR_CAVA"}',
].join('\n');
