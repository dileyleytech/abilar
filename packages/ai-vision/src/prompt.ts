// prompt.ts — Construção do prompt de imagem (§8.5). Puro.
// REGRA DE OURO (§8.3): medidas NUNCA entram no prompt — a imagem é ilustrativa,
// a verdade é o estado estruturado. O builder só usa material/acabamento/ferragem/luz.
import type { WorkType } from '@abilar/shared';
import type { DesignCommand } from './dsl';
import type { DesignItem, DesignModule } from './state';

const MODULE_LABEL: Record<string, string> = {
  GUARDA_ROUPA: 'wardrobe',
  COZINHA: 'fitted kitchen cabinetry',
  PAINEL_TV: 'TV panel unit',
  ESTANTE: 'bookshelf unit',
  HOME_OFFICE: 'home-office desk unit',
  BANHEIRO: 'bathroom vanity unit',
  LAVANDERIA: 'laundry cabinetry',
  OUTRO: 'custom furniture unit',
};

const HARDWARE_LABEL: Record<string, string> = {
  PUSH: 'push-to-open doors',
  PUXADOR_CAVA: 'recessed (channel) handles',
  SOFT_CLOSE: 'soft-close hardware',
};

const LIGHTING_LABEL: Record<string, string> = {
  FITA_LED_PRATELEIRAS: 'LED strip lighting on the shelves',
};

const ITEM_LABEL: Record<string, [string, string]> = {
  GAVETA: ['drawer', 'drawers'],
  PORTA: ['door', 'doors'],
  PRATELEIRA: ['shelf', 'shelves'],
  CABIDEIRO: ['hanging rail', 'hanging rails'],
  NICHO: ['open cubby', 'open cubbies'],
};

const POSITION_LABEL: Record<string, string> = {
  INFERIOR: 'at the bottom',
  SUPERIOR: 'at the top',
  ESQUERDA: 'on the left',
  DIREITA: 'on the right',
};

/** Itens do módulo em texto ("3 drawers at the bottom, 2 doors") — sem medidas. */
function describeItems(items: DesignItem[]): string {
  return items
    .filter((i) => i.qty > 0)
    .map((i) => {
      const [one, many] = ITEM_LABEL[i.type] ?? ['unit', 'units'];
      const pos = i.position ? ` ${POSITION_LABEL[i.position] ?? ''}`.trimEnd() : '';
      return `${i.qty} ${i.qty > 1 ? many : one}${pos}`;
    })
    .join(', ');
}

/**
 * REGRA DE OURO (§8.3): medida NÃO entra no prompt. O layout é texto livre do
 * cliente, então pode vir com "gaveta de 40 cm" — tiramos o número (e a unidade)
 * antes de mandar pro modelo. A medida real segue nos campos em mm.
 */
export function sanitizeLayout(layout: string): string {
  return layout
    .replace(/\d+([.,]\d+)?\s*(cm|mm|m|metros?|centi?metros?|milimetros?|milímetros?|centímetros?)?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim();
}

export type EditScope = 'local' | 'global';

/**
 * Decide se a edição é local (troca um atributo, preservando a forma) ou global
 * (mexe na estrutura e o móvel precisa ser redesenhado). §8.5.
 */
export function editScope(cmd: DesignCommand): EditScope {
  return scopeForIntent(cmd.intent);
}

/** Mesmo que `editScope`, a partir só da intenção (o que o pipeline tem em mãos). */
export function scopeForIntent(intent: DesignCommand['intent']): EditScope {
  switch (intent) {
    case 'CHANGE_FINISH':
    case 'CHANGE_MATERIAL':
    case 'CHANGE_HARDWARE':
    case 'ADD_LIGHTING':
      return 'local';
    default:
      return 'global';
  }
}

/** O que enfatizar no prompt a partir do que o cliente acabou de pedir. */
export function emphasisForIntent(intent: DesignCommand['intent']): Emphasis | undefined {
  if (intent === 'CHANGE_FINISH') return 'FINISH';
  if (intent === 'CHANGE_MATERIAL') return 'MATERIAL';
  return scopeForIntent(intent) === 'global' ? 'STRUCTURE' : undefined;
}

/** O que o cliente ACABOU de pedir — o prompt afirma isso com mais força. */
export type Emphasis = 'FINISH' | 'MATERIAL' | 'STRUCTURE';

export type PromptContext = { roomType?: string; workType?: WorkType; emphasize?: Emphasis };

/** Monta o prompt de edição de imagem a partir do estado (sem medidas). */
export function buildImagePrompt(module: DesignModule, ctx: PromptContext = {}): { prompt: string } {
  const room = ctx.roomType?.trim() || 'a Brazilian residential room';
  // O rótulo do cliente (ex.: "Sapateira") manda — sobretudo quando type=OUTRO.
  const generic = MODULE_LABEL[module.type] ?? MODULE_LABEL.OUTRO;
  const label = module.label?.trim();
  const unit = label ? (module.type === 'OUTRO' ? label : `${label} (${generic})`) : generic;

  const specs: string[] = [];
  if (module.material) specs.push(`made of ${module.material}`);
  if (module.finish) specs.push(`finish ${module.finish}`);
  if (module.hardware) specs.push(HARDWARE_LABEL[module.hardware] ?? '');
  if (module.lighting) specs.push(LIGHTING_LABEL[module.lighting] ?? '');
  const specsText = specs.filter(Boolean).join(', ');

  const itemsText = describeItems(module.items ?? []);
  const layoutText = module.layout ? sanitizeLayout(module.layout) : '';

  // Grade de nichos (a "colmeia" de sapateira): o modelo precisa da contagem.
  const gridText = module.grid
    ? `Its front is an open grid of ${module.grid.rows} rows and ${module.grid.columns} columns of square cubbies, all open at the front.`
    : '';

  // NEGATIVAS: sem isso o modelo desenha um armário fechado por padrão — era por
  // isso que "tira as portas" não tirava porta nenhuma.
  const openText = module.openFront
    ? 'The unit is completely open at the front: NO doors, no drawer fronts, no handles, no glass — every compartment is visible and open.'
    : '';

  // A cor some quando a edição parte de uma imagem anterior; quando o pedido FOI a
  // cor, afirmamos sobre todas as superfícies.
  const emphasisText =
    ctx.emphasize === 'FINISH' && module.finish
      ? `The entire unit must be finished in ${module.finish} — every panel, door front and side; it must NOT look wood-toned unless ${module.finish} is a wood tone.`
      : ctx.emphasize === 'MATERIAL' && module.material
        ? `The whole unit is built in ${module.material}, on all surfaces.`
        : '';

  const verb = ctx.workType === 'REPLACE_EXISTING'
    ? `Replace the existing furniture with a ${unit}`
    : `Install a ${unit}`;

  const prompt = [
    `Interior photo of ${room}.`,
    `${verb}${specsText ? `, ${specsText}` : ''}.`,
    // Itens e arranjo: o que o cliente pediu no chat precisa aparecer na prévia.
    itemsText ? `It has ${itemsText}.` : '',
    gridText,
    openText,
    layoutText ? `Internal arrangement, as described by the client: ${layoutText}.` : '',
    emphasisText,
    // Mantém a IDENTIDADE e a PROPORÇÃO do móvel — evita virar "painel gigante".
    `It must stay a single ${unit} with realistic, modest residential proportions; do not change its type, do not enlarge it into a full-wall built-in unit, and add nothing that was not requested${module.openFront ? ' (in particular, do NOT add doors)' : ''}.`,
    `Keep the room's walls, floor, lighting and perspective unchanged.`,
    `Photorealistic, natural lighting, Brazilian residential style.`,
    `Modify ONLY the furniture area.`,
  ].filter(Boolean).join(' ');

  return { prompt };
}

export type EditContext = {
  /** local = troca um atributo (cor/material); global = mexe na ESTRUTURA. */
  scope: EditScope;
  /** true quando a base é uma prévia anterior (e não a foto original do cliente). */
  iterating: boolean;
  /** false = não há imagem base; o prompt vai puro (geração do zero). */
  hasBase?: boolean;
  /** Quantas imagens de referência do cliente seguem a base. */
  references?: number;
};

/**
 * Embrulha o prompt na instrução de EDIÇÃO da imagem (§8.5). O erro clássico aqui é
 * mandar "mantenha todo o resto exatamente igual" para uma mudança ESTRUTURAL: o
 * modelo obedece e devolve a mesma imagem (portas continuam lá, cor não muda).
 * Por isso a instrução varia com o escopo — e o ambiente é preservado nos dois casos.
 */
export function buildEditInstruction(basePrompt: string, ctx: EditContext): string {
  if (ctx.hasBase === false) return basePrompt;

  const ambiente = "Keep the room's walls, floor, lighting, framing and perspective exactly the same.";
  // Referência é inspiração, não colagem: o ambiente continua sendo o do cliente.
  const refs = ctx.references
    ? ` The first attached image is the client's room — that is the scene to edit. The ${ctx.references === 1 ? 'other attached image is a reference' : `other ${ctx.references} attached images are references`} chosen by the client: follow their style, structure and proportions for the furniture, but do NOT copy their room, background, objects or framing.`
    : '';
  if (ctx.scope === 'local') {
    return [
      'Edit the attached image.',
      basePrompt,
      `Keep the same furniture shape, position and structure${ctx.iterating ? ' as in the attached image' : ''} — change only what was asked.`,
      ambiente + refs,
    ].join(' ');
  }
  return [
    'Edit the attached image.',
    'Replace the furniture with the unit described below, redrawing it from scratch in the same place.',
    basePrompt,
    'The new furniture must match this description even where it differs from what is in the attached image.',
    ambiente + refs,
  ].join(' ');
}
