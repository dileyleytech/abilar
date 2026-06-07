// project-schemas.ts — validação (zod) de projeto e módulos. cm (UI) → mm (servidor).
import { z } from 'zod';
import { WORK_TYPES, SOURCE_TYPES, quoteLineItemSchema } from './domain';
import { cmToMm } from './dimension';

/** Dimensão vinda da UI em cm → mm inteiro positivo. Sem limite de tamanho. */
export const cmDimensionSchema = z
  .number({ invalid_type_error: 'Informe um número' })
  .positive('Informe a medida')
  .transform((cm) => cmToMm(cm));

/** Projeto = container com NOME (categoria/workType vivem nos móveis).
 *  Local da obra (cidade/CEP/coords) alimenta o matching com o marceneiro. */
export const createProjectSchema = z.object({
  title: z.string().trim().min(2, 'Dê um nome ao pedido').max(120),
  sourceType: z.enum(SOURCE_TYPES).default('AI_GENERATED'),
  city: z.string().trim().min(2).optional(),
  cep: z.string().trim().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** Edição do local da obra (cidade/CEP/coords) — alimenta o matching. */
export const updateProjectLocationSchema = z.object({
  city: z.string().trim().min(2, 'Informe a cidade'),
  cep: z.string().trim().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type UpdateProjectLocationInput = z.infer<typeof updateProjectLocationSchema>;

/** Orçamento do marceneiro (§5/§7). Valor em centavos; servidor recalcula o preço. */
export const quoteInputSchema = z.object({
  baseValueCents: z.number().int().positive('Informe o valor do serviço'),
  maxInstallments: z.number().int().min(1, 'Mínimo 1x').max(24, 'Máximo 24x'),
  dilutionSharePct: z.number().min(0).max(100),
  carpenterCostCents: z.number().int().min(0).optional(),
  note: z.string().trim().max(600).optional(),
  // Construtor por itens (§7.6): se vier, o servidor recalcula V = custo + margem.
  lineItems: z.array(quoteLineItemSchema).max(100).optional(),
  marginPct: z.number().min(0).max(1000).optional(),
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;

/** Orçamento avulso do marceneiro (§4.3d) — cliente fora da plataforma.
 *  V = custo + margem (sem taxas da plataforma); servidor recalcula. */
export const externalQuoteInputSchema = z.object({
  clientName: z.string().trim().min(1, 'Informe o nome do cliente').max(120),
  title: z.string().trim().min(1, 'Dê um título ao orçamento').max(120),
  lineItems: z.array(quoteLineItemSchema).min(1, 'Adicione ao menos um item').max(200),
  marginPct: z.number().min(0).max(1000),
  note: z.string().trim().max(600).optional(),
  status: z.enum(['SENT', 'ACCEPTED', 'REJECTED']).optional(),
});
export type ExternalQuoteInput = z.infer<typeof externalQuoteInputSchema>;

/** Módulo (móvel): a UI envia cm; o schema entrega *Mm prontos para o banco. */
export const moduleInputSchema = z.object({
  ambiente: z.string().trim().max(60).optional(), // cômodo (ex.: "Cozinha")
  type: z.string().trim().min(1, 'Informe o tipo da peça'),
  workType: z.enum(WORK_TYPES).optional(), // novo vs substituição (por móvel)
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
