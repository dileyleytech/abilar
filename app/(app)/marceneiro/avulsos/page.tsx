import { requireRole } from '@/lib/auth/session';
import { listExternalQuotes } from '@/lib/external-quotes/queries';
import { listMaterials } from '@/lib/carpenter/materials';
import { Page, PageHeader } from '@/components/ui';
import { AvulsosManager, type CatalogItem, type ExternalQuoteCard, type LineItem } from './_components/AvulsosManager';

export const metadata = { title: 'Orçamentos avulsos — Abilar' };

export default async function AvulsosPage() {
  const profile = await requireRole('CARPENTER');
  const [quotes, materials] = await Promise.all([listExternalQuotes(profile.id), listMaterials(profile.id, { activeOnly: true })]);

  const cards: ExternalQuoteCard[] = quotes.map((q) => ({
    id: q.id,
    clientName: q.clientName,
    title: q.title,
    valueCents: q.valueCents,
    subtotalCostCents: q.subtotalCostCents,
    marginPct: q.marginPct,
    status: q.status,
    note: q.note,
    lineItems: (q.lineItems as LineItem[]) ?? [],
  }));
  const catalog: CatalogItem[] = materials.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    unit: m.unit,
    unitCostCents: m.unitCostCents,
  }));

  return (
    <Page width="lg">
      <PageHeader
        title="Orçamentos avulsos"
        description="Para clientes fora da plataforma. Monte pelo seu catálogo; o valor é custo + sua margem (sem taxas)."
      />
      <AvulsosManager initialQuotes={cards} catalog={catalog} />
    </Page>
  );
}
