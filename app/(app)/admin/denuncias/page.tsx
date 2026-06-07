import { requireRole } from '@/lib/auth/session';
import { getReports } from '@/lib/moderation/queries';
import { ReportQueue } from './_components/ReportQueue';

export const metadata = { title: 'Denúncias — Admin Abilar' };

const fmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default async function AdminDenunciasPage() {
  await requireRole('ADMIN');
  const reports = await getReports();
  const open = reports.filter((r) => r.status === 'OPEN').length;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">Denúncias</h1>
      <p className="mb-6 text-sm text-muted">
        Fila de moderação do chat (§7.8). {open > 0 ? `${open} aberta(s).` : 'Nenhuma aberta.'}
      </p>
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
    </main>
  );
}
