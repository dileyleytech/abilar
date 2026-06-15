// dsl.ts — DSL de comandos de marcenaria (§8.4): a saída estruturada do NLU.
// O NLU (Gemini 3.1 Flash-Lite, function calling) converte fala livre em ESTE JSON,
// validado contra a taxonomia. Nunca confiar no texto livre — só no comando validado.
import { z } from 'zod';

export const DESIGN_INTENTS = [
  'CHANGE_FINISH',
  'CHANGE_MATERIAL',
  'RESIZE',
  'ADD_ITEM',
  'REMOVE_ITEM',
  'CHANGE_HARDWARE',
  'ADD_LIGHTING',
  'CHANGE_LAYOUT',
  'UNDO',
  'ASK_HELP',
] as const;
export const designIntentSchema = z.enum(DESIGN_INTENTS);
export type DesignIntent = z.infer<typeof designIntentSchema>;

export const DIMENSION_AXES = ['WIDTH', 'HEIGHT', 'DEPTH'] as const;
export const dimensionAxisSchema = z.enum(DIMENSION_AXES);
export type DimensionAxis = z.infer<typeof dimensionAxisSchema>;

export const ITEM_TYPES = ['GAVETA', 'PORTA', 'PRATELEIRA', 'CABIDEIRO'] as const;
export const itemTypeSchema = z.enum(ITEM_TYPES);
export type ItemType = z.infer<typeof itemTypeSchema>;

export const ITEM_POSITIONS = ['INFERIOR', 'SUPERIOR', 'ESQUERDA', 'DIREITA'] as const;
export const itemPositionSchema = z.enum(ITEM_POSITIONS);
export type ItemPosition = z.infer<typeof itemPositionSchema>;

export const HARDWARE = ['PUSH', 'PUXADOR_CAVA', 'SOFT_CLOSE'] as const;
export const hardwareSchema = z.enum(HARDWARE);
export type Hardware = z.infer<typeof hardwareSchema>;

/** Alvo do comando: um módulo (uuid), todos ('ALL') ou indefinido (null). */
export const commandTargetSchema = z.union([z.string().uuid(), z.literal('ALL'), z.null()]);

/** Ajuste de dimensão: delta (relativo) OU absoluto, em mm inteiros. */
export const dimensionParamSchema = z.object({
  axis: dimensionAxisSchema,
  deltaMm: z.number().int().optional(),
  absoluteMm: z.number().int().positive().optional(),
});
export type DimensionParam = z.infer<typeof dimensionParamSchema>;

export const itemParamSchema = z.object({
  type: itemTypeSchema,
  qty: z.number().int().positive().default(1),
  position: itemPositionSchema.optional(),
});

export const commandParamsSchema = z.object({
  finish: z.string().min(1).optional(),
  material: z.string().min(1).optional(),
  dimension: dimensionParamSchema.optional(),
  item: itemParamSchema.optional(),
  hardware: hardwareSchema.optional(),
  lighting: z.string().min(1).optional(),
});
export type CommandParams = z.infer<typeof commandParamsSchema>;

/** Comando estruturado completo — a fonte de verdade da intenção do usuário. */
export const designCommandSchema = z.object({
  intent: designIntentSchema,
  targetModuleId: commandTargetSchema.default(null),
  params: commandParamsSchema.default({}),
  confidence: z.number().min(0).max(1).default(0),
  clarificationNeeded: z.boolean().default(false),
  echo: z.string().default(''),
});
export type DesignCommand = z.infer<typeof designCommandSchema>;

/** Faz o parse seguro de um JSON arbitrário (saída do NLU) no comando validado. */
export function parseDesignCommand(input: unknown): DesignCommand {
  return designCommandSchema.parse(input);
}

/** Item de comando dentro de um lote (sem echo/confidence — esses são do lote). */
export const commandItemSchema = z.object({
  intent: designIntentSchema,
  targetModuleId: commandTargetSchema.default(null),
  params: commandParamsSchema.default({}),
});
export type CommandItem = z.infer<typeof commandItemSchema>;

/**
 * Lote de comandos: uma fala pode conter VÁRIAS mudanças (ex.: "aumenta pra
 * 80x120x35 e remove o espelho" = 3 RESIZE + 1 REMOVE_ITEM). O NLU devolve a lista
 * + um único `echo` ("o que entendi") para o usuário.
 */
export const designBatchSchema = z.object({
  commands: z.array(commandItemSchema).default([]),
  confidence: z.number().min(0).max(1).default(0),
  clarificationNeeded: z.boolean().default(false),
  echo: z.string().default(''),
});
export type DesignBatch = z.infer<typeof designBatchSchema>;

export function parseDesignBatch(input: unknown): DesignBatch {
  return designBatchSchema.parse(input);
}
