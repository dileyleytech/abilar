// project-schemas.ts — validação (zod) de projeto e módulos. cm (UI) → mm (servidor).
import { z } from 'zod';
import { CATEGORIES } from './domain';
import { WORK_TYPES, SOURCE_TYPES } from './domain';
import { cmToMm, isSaneMm } from './dimension';

/** Dimensão vinda da UI em cm → mm inteiro, validada por sanidade (§2.5). */
export const cmDimensionSchema = z
  .number({ invalid_type_error: 'Informe um número' })
  .positive('Informe a medida')
  .transform((cm) => cmToMm(cm))
  .refine(isSaneMm, { message: 'Medida fora do esperado (5 cm a 6 m)' });

export const createProjectSchema = z.object({
  category: z.enum(CATEGORIES),
  workType: z.enum(WORK_TYPES),
  sourceType: z.enum(SOURCE_TYPES).default('AI_GENERATED'),
  title: z.string().trim().min(2, 'Dê um nome ao pedido').max(120).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** Módulo: a UI envia cm; o schema entrega *Mm prontos para o banco. */
export const moduleInputSchema = z.object({
  ambiente: z.string().trim().max(60).optional(), // cômodo (ex.: "Cozinha")
  type: z.string().trim().min(1, 'Informe o tipo da peça'),
  label: z.string().trim().max(80).optional(),
  widthMm: cmDimensionSchema,
  heightMm: cmDimensionSchema,
  depthMm: cmDimensionSchema,
  material: z.string().trim().max(60).optional(),
  finish: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(600).optional(),
});
export type ModuleInput = z.infer<typeof moduleInputSchema>;

/** Medidas guiadas (stepper) — só as três dimensões do vão, em cm → mm. */
export const guidedMeasuresSchema = z.object({
  widthMm: cmDimensionSchema,
  heightMm: cmDimensionSchema,
  depthMm: cmDimensionSchema,
});
export type GuidedMeasures = z.infer<typeof guidedMeasuresSchema>;
