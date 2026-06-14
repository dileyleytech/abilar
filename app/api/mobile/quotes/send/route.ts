import { quoteInputSchema } from '@abilar/shared';
import { quotePricing, maxClientInstallments, computeItemsBase } from '@abilar/pricing';
import { quotes, projects, eq, and, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getCarpenterProfile } from '@/lib/carpenter/profile';
import { getProjectForCarpenter } from '@/lib/carpenter/feed';
import { getActivePricingConfig } from '@/lib/pricing/config';
import { notify } from '@/lib/notifications/notify';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Marceneiro envia/atualiza orçamento. Servidor recalcula o pricing (regra #8).
// Espelha lib/quotes/actions.ts:sendQuote. JSON: { projectId, ...quoteInput }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth || auth.role !== 'CARPENTER') return json({ error: 'Apenas marceneiros.' }, 403);

  const body = (await req.json().catch(() => ({}))) as { projectId?: string } & Record<string, unknown>;
  const projectId = body.projectId;
  if (!projectId) return json({ error: 'Pedido inválido.' }, 400);

  const carpenter = await getCarpenterProfile(auth.userId);
  if (!carpenter) return json({ error: 'Complete seu cadastro primeiro.' }, 400);

  const db = getDb();
  const [existing] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.projectId, projectId), eq(quotes.carpenterId, auth.userId)))
    .limit(1);

  let notifyClientId: string | null = null;
  if (existing) {
    const [proj] = await db.select({ status: projects.status }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!proj) return json({ error: 'Pedido não encontrado.' }, 404);
    if (proj.status !== 'OPEN_FOR_QUOTES' && proj.status !== 'IN_NEGOTIATION') {
      return json({ error: 'Este pedido não está mais em negociação.' }, 409);
    }
  } else {
    const eligible = await getProjectForCarpenter(projectId, carpenter);
    if (!eligible) return json({ error: 'Pedido indisponível para orçamento.' }, 409);
    notifyClientId = eligible.project.clientId;
  }

  const parsed = quoteInputSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, 400);
  const d = parsed.data;

  const config = await getActivePricingConfig();
  if (!config) return json({ error: 'Configuração de preço indisponível.' }, 503);

  const hasItems = (d.lineItems?.length ?? 0) > 0;
  const items = hasItems ? computeItemsBase(d.lineItems!, d.marginPct ?? 0) : null;
  const baseValueCents = items ? items.baseValueCents : d.baseValueCents;
  const carpenterCostCents = items ? items.subtotalCostCents : (d.carpenterCostCents ?? null);
  if (baseValueCents <= 0) return json({ error: 'Informe o valor do serviço.' }, 400);

  const subsidizes = d.maxInstallments > 1;
  if (subsidizes && d.dilutionSharePct < config.dilutionMinCarpenterSharePct) {
    return json({ error: `A diluição mínima é ${config.dilutionMinCarpenterSharePct}%.` }, 400);
  }

  const nClient = maxClientInstallments(config);
  const worst = quotePricing({
    baseValueCents,
    config,
    installments: subsidizes ? d.maxInstallments : 1,
    clientInstallments: nClient,
    method: nClient > 1 ? 'CARD' : 'PIX',
    carpenterDilutionSharePct: subsidizes ? d.dilutionSharePct : 0,
    carpenterCostCents: carpenterCostCents ?? undefined,
  });
  if (!worst.valid) return json({ error: worst.warnings[0] ?? 'Orçamento inválido.' }, 400);

  const lineItems = d.lineItems ?? [];
  await db
    .insert(quotes)
    .values({
      projectId,
      carpenterId: auth.userId,
      baseValueCents,
      carpenterCostCents,
      maxInstallments: d.maxInstallments,
      dilutionSharePct: String(d.dilutionSharePct),
      note: d.note ?? null,
      lineItems,
      status: 'SENT',
    })
    .onConflictDoUpdate({
      target: [quotes.projectId, quotes.carpenterId],
      set: {
        baseValueCents,
        carpenterCostCents,
        maxInstallments: d.maxInstallments,
        dilutionSharePct: String(d.dilutionSharePct),
        note: d.note ?? null,
        lineItems,
        status: 'SENT',
        updatedAt: sql`now()`,
      },
    });

  if (notifyClientId) {
    await notify(notifyClientId, {
      title: 'Novo orçamento recebido 📩',
      body: `${carpenter.name} enviou uma proposta para o seu pedido.`,
      link: `/pedidos/${projectId}`,
    });
  }
  return json({ ok: true });
}
