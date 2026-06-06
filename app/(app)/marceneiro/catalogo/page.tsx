import Link from 'next/link';
import { requireRole } from '@/lib/auth/session';
import { listMaterials } from '@/lib/carpenter/materials';
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
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/marceneiro" className="text-sm text-muted hover:text-charcoal">
        ← Minha área
      </Link>
      <header className="mt-3 mb-6">
        <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">Catálogo de custo</h1>
        <p className="text-sm text-muted">
          Cadastre o que você usa (chapas, ferragens, serviços, frete). Depois é só montar o orçamento puxando daqui.
        </p>
      </header>
      <MaterialsManager initial={view} />
    </main>
  );
}
