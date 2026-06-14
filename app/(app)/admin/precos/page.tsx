import { requireRole } from '@/lib/auth/session';
import { getPricingConfigForm } from '@/lib/pricing/config';
import { Page, PageHeader, Card } from '@/components/ui';
import { PricingForm } from './_components/PricingForm';

export const metadata = { title: 'Taxas e promoções — Admin Abilar' };

export default async function AdminPrecosPage() {
  await requireRole('ADMIN');
  const form = await getPricingConfigForm();

  return (
    <Page width="lg">
      <PageHeader
        title="Taxas e promoções"
        description="Configuração financeira global (§5). Tudo é recalculado no servidor a partir daqui."
      />
      {form ? (
        <PricingForm initial={form} />
      ) : (
        <Card pad="lg" className="text-muted">
          Config GLOBAL não encontrada. Rode as migrations/seed.
        </Card>
      )}
    </Page>
  );
}
