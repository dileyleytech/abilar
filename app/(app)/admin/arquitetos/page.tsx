import { requireRole } from '@/lib/auth/session';
import { listArchitectsAdmin } from '@/lib/admin/architects';
import { ArchitectsManager } from './_components/ArchitectsManager';

export const metadata = { title: 'Arquitetos — Admin Abilar' };

export default async function AdminArquitetosPage() {
  await requireRole('ADMIN');
  const architects = await listArchitectsAdmin();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">Arquitetos parceiros</h1>
      <p className="mb-6 text-sm text-muted">
        Cadastre arquitetos e defina a comissão (sai da fatia da plataforma). Eles aparecem na vitrine pública.
      </p>
      <ArchitectsManager initial={architects} />
    </main>
  );
}
