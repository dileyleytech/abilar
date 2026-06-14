import Link from 'next/link';
import { requireRole } from '@/lib/auth/session';
import { listMaterials } from '@/lib/carpenter/materials';
import { Page, PageHeader } from '@/components/ui';
import { MaterialsManager, type MaterialView } from './_components/MaterialsManager';

export const metadata = { title: 'Catálogo de custo — Abilar' };

export default async function CatalogoPage() {
  const profile = await requireRole('CARPENTER');
  const materials = await listMaterials(profile.id);
  const view: MaterialView[] = materials.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    unit: m.unit,
    unitCostCents: m.unitCostCents,
    sku: m.sku,
    supplier: m.supplier,
    active: m.active,
    updatedAt: m.updatedAt.toISOString(),
  }));

  return (
    <Page width="lg">
      <PageHeader
        title="Catálogo de custo"
        description="Cadastre o que você usa (chapas, ferragens, serviços, frete). Depois é só montar o orçamento puxando daqui."
        back={
          <Link href="/marceneiro" className="text-small text-muted hover:underline">
            ← Minha área
          </Link>
        }
      />
      <MaterialsManager initial={view} />
    </Page>
  );
}
