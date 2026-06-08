import { requireRole } from '@/lib/auth/session';
import { getPipeline } from '@/lib/pipeline/queries';
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
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">Agenda</h1>
      <p className="mb-6 text-sm text-muted">Suas obras em andamento (plataforma + externas) e sua capacidade.</p>
      <AgendaManager maxParallel={p.maxParallel} activeCount={p.activeCount} overloaded={p.overloaded} obras={p.obras} jobs={jobs} />
    </main>
  );
}
