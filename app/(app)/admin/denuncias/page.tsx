import { requireRole } from '@/lib/auth/session';
import { getReports } from '@/lib/moderation/queries';
import { Page, PageHeader } from '@/components/ui';
import { ReportQueue } from './_components/ReportQueue';

export const metadata = { title: 'Denúncias — Admin Abilar' };

const fmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default async function AdminDenunciasPage() {
  await requireRole('ADMIN');
  const reports = await getReports();
  const open = reports.filter((r) => r.status === 'OPEN').length;

  return (
    <Page width="lg">
      <PageHeader
        title="Denúncias"
        description={`Fila de moderação do chat (§7.8). ${open > 0 ? `${open} aberta(s).` : 'Nenhuma aberta.'}`}
      />
      <ReportQueue
        items={reports.map((r) => ({
          id: r.id,
          reason: r.reason,
          detail: r.detail,
          status: r.status,
          conversationId: r.conversationId,
          projectTitle: r.projectTitle,
          reporterName: r.reporterName,
          dateLabel: fmt.format(r.createdAt),
        }))}
      />
    </Page>
  );
}
