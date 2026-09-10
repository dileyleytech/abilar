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
 * Decide se a edição é local (inpainting na região do móvel, preservando o resto)
 * ou global (muda o estilo geral). §8.5.
 */
export function editScope(cmd: DesignCommand): EditScope {
  switch (cmd.intent) {
    case 'CHANGE_FINISH':
    case 'CHANGE_MATERIAL':
    case 'CHANGE_HARDWARE':
    case 'ADD_LIGHTING':
      return 'local';
    default:
      return 'global';
  }
}

export type PromptContext = { roomType?: string; workType?: WorkType };

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

  const verb = ctx.workType === 'REPLACE_EXISTING'
    ? `Replace the existing furniture with a ${unit}`
    : `Install a ${unit}`;

  const prompt = [
    `Interior photo of ${room}.`,
    `${verb}${specsText ? `, ${specsText}` : ''}.`,
    // Itens e arranjo: o que o cliente pediu no chat precisa aparecer na prévia.
    itemsText ? `It has ${itemsText}.` : '',
    layoutText ? `Internal arrangement, as described by the client: ${layoutText}.` : '',
    // Mantém a IDENTIDADE e a PROPORÇÃO do móvel — evita virar "painel gigante".
    `It must stay a single ${unit} with realistic, modest residential proportions; do not change its type, do not enlarge it into a full-wall built-in unit, and add nothing that was not requested.`,
    `Keep the room's walls, floor, lighting and perspective unchanged.`,
    `Photorealistic, natural lighting, Brazilian residential style.`,
    `Modify ONLY the furniture area.`,
  ].filter(Boolean).join(' ');

  return { prompt };
}
