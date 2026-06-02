import { requireRole } from '@/lib/auth/session';
import { getPricingConfigForm } from '@/lib/pricing/config';
import { PricingForm } from './_components/PricingForm';

export const metadata = { title: 'Taxas e promoções — Admin Abilar' };

export default async function AdminPrecosPage() {
  await requireRole('ADMIN');
  const form = await getPricingConfigForm();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">Taxas e promoções</h1>
      <p className="mb-6 text-sm text-muted">
        Configuração financeira global (§5). Tudo é recalculado no servidor a partir daqui.
      </p>
      {form ? (
        <PricingForm initial={form} />
      ) : (
        <p className="rounded-2xl border border-subtle bg-surface p-6 text-muted">
          Config GLOBAL não encontrada. Rode as migrations/seed.
        </p>
      )}
    </main>
  );
}
