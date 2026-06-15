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
  return { ok: true, state: { ...state, modules }, message: cmd.echo };
}

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
    case 'ADD_ITEM':
      return p.item ? { ...m, items: addItem(m.items, p.item) } : m;
    case 'REMOVE_ITEM':
      return p.item ? { ...m, items: m.items.filter((i) => !(i.type === p.item!.type && i.position === p.item!.position)) } : m;
    default:
      return m; // CHANGE_LAYOUT: sem efeito estrutural por enquanto (afeta só o prompt)
  }
}

function addItem(items: DesignItem[], item: { type: ItemType; qty: number; position?: ItemPosition }): DesignItem[] {
  const idx = items.findIndex((i) => i.type === item.type && i.position === item.position);
  if (idx === -1) return [...items, { type: item.type, qty: item.qty, position: item.position }];
  return items.map((i, k) => (k === idx ? { ...i, qty: i.qty + item.qty } : i));
}
