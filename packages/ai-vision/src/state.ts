// state.ts — ESTADO ESTRUTURADO do projeto: a FONTE DE VERDADE (§8.3).
// As medidas vivem só aqui (mm inteiros), nunca saem da imagem. `applyCommand`
// é puro e imutável: recebe estado + comando validado e devolve o novo estado.
import type { Category } from '@abilar/shared';
import type { DesignCommand, Hardware, ItemPosition, ItemType } from './dsl';

/** Medida mínima de um módulo (mm). Abaixo disso, RESIZE é rejeitado. */
export const MIN_DIMENSION_MM = 10;

export type DesignItem = { type: ItemType; qty: number; position?: ItemPosition };

export type DesignModule = {
  id: string;
  type: Category;
  /** Rótulo dado pelo cliente (ex.: "Sapateira") — usado no prompt quando type=OUTRO. */
  label?: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  material?: string;
  finish?: string;
  hardware?: Hardware;
  lighting?: string;
  /** Arranjo interno pedido pelo cliente (CHANGE_LAYOUT), em PT-BR. Entra no prompt
   *  da imagem já higienizado; NUNCA carrega medida (a medida vive nos campos mm). */
  layout?: string;
  /** Grade de nichos (ex.: 3 andares × 3 colunas) — a "colmeia" da sapateira. */
  grid?: { rows: number; columns: number };
  /** Frente aberta: o móvel NÃO tem portas. Precisa ser explícito porque o modelo
   *  de imagem desenha um armário fechado quando ninguém diz o contrário. */
  openFront?: boolean;
  items: DesignItem[];
};

export type DesignState = { modules: DesignModule[] };

export type ApplyResult = {
  ok: boolean;
  state: DesignState;
  /** "o que entendi" / motivo do erro — pronto para mostrar no chat. */
  message: string;
};

const AXIS_FIELD = { WIDTH: 'widthMm', HEIGHT: 'heightMm', DEPTH: 'depthMm' } as const;

/** Aplica um comando validado ao estado. Puro e imutável. */
export function applyCommand(state: DesignState, cmd: DesignCommand): ApplyResult {
  // Intents que não mexem no estado estruturado (tratados na camada de sessão).
  if (cmd.intent === 'UNDO' || cmd.intent === 'ASK_HELP') {
    return { ok: true, state, message: cmd.echo };
  }

  const targets = selectTargets(state, cmd.targetModuleId);
  if (targets.length === 0) {
    return { ok: false, state, message: 'Não encontrei o móvel para alterar.' };
  }

  // CHANGE_LAYOUT sem nada dentro não muda nada: melhor perguntar do que ecoar
  // um "pronto!" por cima de uma imagem idêntica.
  const layout = cmd.params.layout;
  const layoutVazio = !layout || (!layout.description?.trim() && !layout.rows && !layout.columns && layout.openFront === undefined);
  if (cmd.intent === 'CHANGE_LAYOUT' && layoutVazio) {
    return { ok: false, state, message: 'Como você quer organizar o móvel? Ex.: "3 andares de nichos com 3 colunas".' };
  }

  // Remover o que o móvel não tem: avisar, nunca confirmar em falso.
  if (cmd.intent === 'REMOVE_ITEM' && cmd.params.item) {
    const tipo = cmd.params.item.type;
    const temAlgum = targets.some((m) => m.items.some((i) => i.type === tipo));
    const abriria = tipo === 'PORTA' && targets.some((m) => !m.openFront);
    if (!temAlgum && !abriria) {
      return { ok: false, state, message: `Esse móvel já não tem ${LABEL_PT[tipo] ?? tipo.toLowerCase()}.` };
    }
  }

  // RESIZE precisa validar ANTES de aplicar para não corromper o estado.
  if (cmd.intent === 'RESIZE') {
    const dim = cmd.params.dimension;
    if (!dim) return { ok: false, state, message: 'Faltou a medida a ajustar.' };
    const field = AXIS_FIELD[dim.axis];
    for (const m of targets) {
      const next = dim.absoluteMm ?? m[field] + (dim.deltaMm ?? 0);
      if (!Number.isInteger(next) || next < MIN_DIMENSION_MM) {
        return { ok: false, state, message: 'Essa medida ficaria pequena demais.' };
      }
    }
  }

  const ids = new Set(targets.map((m) => m.id));
  const modules = state.modules.map((m) => (ids.has(m.id) ? mutate(m, cmd) : m));

  // Comando que não mudou NADA não pode virar "pronto!": era assim que a ABI
  // confirmava mudanças que a imagem nunca refletia.
  if (JSON.stringify(modules) === JSON.stringify(state.modules)) {
    return { ok: false, state, message: 'Esse móvel já está assim — me diga o que mudar que eu ajusto.' };
  }
  return { ok: true, state: { ...state, modules }, message: cmd.echo };
}

const LABEL_PT: Record<string, string> = {
  GAVETA: 'gavetas', PORTA: 'portas', PRATELEIRA: 'prateleiras', CABIDEIRO: 'cabideiro', NICHO: 'nichos',
};

function selectTargets(state: DesignState, target: string | null): DesignModule[] {
  if (target === 'ALL') return state.modules;
  if (target == null) return state.modules.length === 1 ? state.modules : [];
  return state.modules.filter((m) => m.id === target);
}

function mutate(m: DesignModule, cmd: DesignCommand): DesignModule {
  const p = cmd.params;
  switch (cmd.intent) {
    case 'CHANGE_FINISH':
      return p.finish ? { ...m, finish: p.finish } : m;
    case 'CHANGE_MATERIAL':
      return p.material ? { ...m, material: p.material } : m;
    case 'CHANGE_HARDWARE':
      return p.hardware ? { ...m, hardware: p.hardware } : m;
    case 'ADD_LIGHTING':
      return p.lighting ? { ...m, lighting: p.lighting } : m;
    case 'RESIZE': {
      const dim = p.dimension!;
      const field = AXIS_FIELD[dim.axis];
      const next = dim.absoluteMm ?? m[field] + (dim.deltaMm ?? 0);
      return { ...m, [field]: next };
    }
    case 'ADD_ITEM': {
      if (!p.item) return m;
      const comItem = { ...m, items: addItem(m.items, p.item) };
      // Pôr porta de volta fecha a frente.
      return p.item.type === 'PORTA' ? { ...comItem, openFront: false } : comItem;
    }
    case 'REMOVE_ITEM': {
      if (!p.item) return m;
      const semItem = { ...m, items: m.items.filter((i) => !(i.type === p.item!.type && i.position === p.item!.position)) };
      // "tira as portas" quer dizer frente ABERTA — não só apagar da lista.
      return p.item.type === 'PORTA' ? { ...semItem, openFront: true } : semItem;
    }
    case 'CHANGE_LAYOUT': {
      if (!p.layout) return m;
      const { description, rows, columns, openFront } = p.layout;
      const next: DesignModule = { ...m };
      if (description?.trim()) next.layout = description.trim();
      if (rows && columns) next.grid = { rows, columns };
      if (openFront !== undefined) next.openFront = openFront;
      // Grade de nichos é aberta por definição: sem portas na frente.
      if (next.grid && next.openFront !== false) {
        next.openFront = true;
        next.items = next.items.filter((i) => i.type !== 'PORTA');
      }
      return next;
    }
    default:
      return m;
  }
}

function addItem(items: DesignItem[], item: { type: ItemType; qty: number; position?: ItemPosition }): DesignItem[] {
  const idx = items.findIndex((i) => i.type === item.type && i.position === item.position);
  if (idx === -1) return [...items, { type: item.type, qty: item.qty, position: item.position }];
  return items.map((i, k) => (k === idx ? { ...i, qty: i.qty + item.qty } : i));
}
