import { requireRole } from '@/lib/auth/session';
import { getPipeline } from '@/lib/pipeline/queries';
import { Page, PageHeader } from '@/components/ui';
import { AgendaManager, type JobCard } from './_components/AgendaManager';

export const metadata = { title: 'Agenda — Abilar' };

export default async function AgendaPage() {
  const profile = await requireRole('CARPENTER');
  const p = await getPipeline(profile.id);
  const jobs: JobCard[] = p.jobs.map((j) => ({
    id: j.id,
    title: j.title,
    clientName: j.clientName,
    startDate: j.startDate,
    endDate: j.endDate,
    note: j.note,
  }));

  return (
    <Page width="lg">
      <PageHeader
        title="Agenda"
        description="Suas obras em andamento (plataforma + externas) e sua capacidade."
      />
      <AgendaManager
        maxParallel={p.maxParallel}
        activeCount={p.activeCount}
        overloaded={p.overloaded}
        obras={p.obras.map((o) => ({ projectId: o.projectId, title: o.title, approvedPct: o.approvedPct, startDate: o.startDate, endDate: o.endDate }))}
        jobs={jobs}
      />
    </Page>
  );
}
