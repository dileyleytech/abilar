import { requireRole } from '@/lib/auth/session';
import { listArchitectsAdmin } from '@/lib/admin/architects';
import { Page, PageHeader } from '@/components/ui';
import { ArchitectsManager } from './_components/ArchitectsManager';

export const metadata = { title: 'Arquitetos — Admin Abilar' };

export default async function AdminArquitetosPage() {
  await requireRole('ADMIN');
  const architects = await listArchitectsAdmin();

  return (
    <Page width="lg">
      <PageHeader
        title="Arquitetos parceiros"
        description="Cadastre arquitetos e defina a comissão (sai da fatia da plataforma). Eles aparecem na vitrine pública."
      />
      <ArchitectsManager initial={architects} />
    </Page>
  );
}
