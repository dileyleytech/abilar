// prompt.ts — Construção do prompt de imagem (§8.5). Puro.
// REGRA DE OURO (§8.3): medidas NUNCA entram no prompt — a imagem é ilustrativa,
// a verdade é o estado estruturado. O builder só usa material/acabamento/ferragem/luz.
import type { WorkType } from '@abilar/shared';
import type { DesignCommand } from './dsl';
import type { DesignModule } from './state';

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

  const verb = ctx.workType === 'REPLACE_EXISTING'
    ? `Replace the existing furniture with a ${unit}`
    : `Install a ${unit}`;

  const prompt = [
    `Interior photo of ${room}.`,
    `${verb}${specsText ? `, ${specsText}` : ''}.`,
    `Keep the room's walls, floor, lighting and perspective unchanged.`,
    `Photorealistic, natural lighting, Brazilian residential style.`,
    `Modify ONLY the furniture area.`,
  ].join(' ');

  return { prompt };
}
