'use server';

import { revalidatePath } from 'next/cache';
import { externalQuoteInputSchema } from '@abilar/shared';
import { computeItemsBase } from '@abilar/pricing';
import { externalQuotes, and, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';
import { acceptExternalQuote } from './accept';

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireCarpenter(): Promise<{ id: string } | { error: string }> {
  const profile = await getSessionProfile();
  if (!profile) return { error: 'Faça login.' };
  if (profile.role !== 'CARPENTER') return { error: 'Apenas marceneiros.' };
  return { id: profile.id };
}

/** Cria/edita um orçamento avulso. Servidor recalcula V = custo + margem. */
export async function saveExternalQuote(input: unknown, id?: string): Promise<ActionResult> {
  const auth = await requireCarpenter();
  if ('error' in auth) return { ok: false, error: auth.error };
  const parsed = externalQuoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;
  const { subtotalCostCents, baseValueCents } = computeItemsBase(d.lineItems, d.marginPct);

  const db = getDb();
  const values = {
    clientName: d.clientName,
    title: d.title,
    lineItems: d.lineItems,
    marginPct: Math.round(d.marginPct),
    subtotalCostCents,
    valueCents: baseValueCents,
    note: d.note ?? null,
    status: d.status ?? ('SENT' as const),
  };
  if (id) {
    await db.update(externalQuotes).set({ ...values, updatedAt: sql`now()` }).where(and(eq(externalQuotes.id, id), eq(externalQuotes.carpenterId, auth.id)));
  } else {
    await db.insert(externalQuotes).values({ carpenterId: auth.id, ...values });
  }
  revalidatePath('/marceneiro/avulsos');
  return { ok: true };
}

export async function setExternalQuoteStatus(id: string, status: 'SENT' | 'ACCEPTED' | 'REJECTED'): Promise<ActionResult> {
  const auth = await requireCarpenter();
  if ('error' in auth) return { ok: false, error: auth.error };
  // Aceitar → vira obra externa na agenda (mesmo fluxo do orçamento aprovado).
  if (status === 'ACCEPTED') {
    const r = await acceptExternalQuote(auth.id, id);
    if (!r.ok) return r;
  } else {
    await getDb().update(externalQuotes).set({ status, updatedAt: sql`now()` }).where(and(eq(externalQuotes.id, id), eq(externalQuotes.carpenterId, auth.id)));
  }
  revalidatePath('/marceneiro/avulsos');
  revalidatePath('/marceneiro/agenda');
  return { ok: true };
}

export async function deleteExternalQuote(id: string): Promise<ActionResult> {
  const auth = await requireCarpenter();
  if ('error' in auth) return { ok: false, error: auth.error };
  const db = getDb();
  await db.delete(externalQuotes).where(and(eq(externalQuotes.id, id), eq(externalQuotes.carpenterId, auth.id)));
  revalidatePath('/marceneiro/avulsos');
  return { ok: true };
}
