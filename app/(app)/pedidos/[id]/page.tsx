import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatBRL } from '@abilar/shared';
import { requireUserId } from '@/lib/auth/session';
import { getProjectDetail } from '@/lib/projects/queries';
import { getReceivedQuotes } from '@/lib/quotes/queries';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { StatusBadge } from '@/components/StatusBadge';
import { ProjectActions } from './_components/ProjectActions';
import { ModulesSection, type ModuleView } from './_components/ModulesSection';
import { ProjectLocation } from './_components/ProjectLocation';
import { PreApproveButton } from './_components/PreApproveButton';

export default async function PedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const detail = await getProjectDetail(id, userId);
  if (!detail) notFound();
  const { project, modules, photos } = detail;

  // URLs assinadas curtas; separa fotos do ambiente (sem módulo) das fotos por móvel.
  const signed = await Promise.all(
    photos.map(async (p) => ({ ...p, url: await signedProjectPhotoUrl(p.path) })),
  );
  const roomPhotos = signed.filter((p) => !p.moduleId);
  const modulePhoto = new Map<string, string | null>();
  for (const p of signed) if (p.moduleId) modulePhoto.set(p.moduleId, p.url);

  const quotes = await getReceivedQuotes(id);
  const editable = ['DRAFT', 'OPEN_FOR_QUOTES', 'IN_NEGOTIATION'].includes(project.status);
  const moduleViews: ModuleView[] = modules.map((m) => ({
    id: m.id,
    ambiente: m.ambiente,
    type: m.type,
    workType: m.workType,
    label: m.label,
    widthMm: m.widthMm,
    heightMm: m.heightMm,
    depthMm: m.depthMm,
    photoUrl: modulePhoto.get(m.id) ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/pedidos" className="inline-flex items-center gap-1 text-sm text-muted hover:text-charcoal">
        ← Meus pedidos
      </Link>

      <header className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">{project.title}</h1>
          <p className="text-sm text-muted">
            {moduleViews.length} {moduleViews.length === 1 ? 'móvel' : 'móveis'}
            {project.sourceType === 'ARCHITECT_PROJECT' ? ' · Projeto de arquiteto' : ''}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Conteúdo principal: móveis + orçamentos recebidos */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ModulesSection projectId={project.id} modules={moduleViews} editable={editable} />

          {(project.status === 'OPEN_FOR_QUOTES' || quotes.length > 0) && (
            <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-charcoal">
                Orçamentos recebidos {quotes.length > 0 && <span className="text-muted">({quotes.length})</span>}
              </h2>
              {quotes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-subtle p-6 text-center text-muted">
                  Nenhum orçamento ainda. Marceneiros da sua região vão enviar propostas aqui.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {quotes.map((q) => (
                    <li key={q.id} className="rounded-xl border border-subtle p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-charcoal">{q.carpenterName}</p>
                        <span className="rounded-pill bg-brand-secondary/15 px-2.5 py-0.5 text-xs font-semibold text-brand-secondary">
                          {q.status === 'SENT' ? 'Recebido' : q.status}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                        <span className="text-sm text-muted">
                          À vista: <strong className="text-charcoal">{formatBRL(q.avistaCents)}</strong>
                        </span>
                        {q.parceladoCents != null && q.installmentValueCents != null && (
                          <span className="text-sm text-muted">
                            Em {q.maxInstallments}x de{' '}
                            <strong className="text-charcoal">{formatBRL(q.installmentValueCents)}</strong>{' '}
                            <span className="text-subtle">({formatBRL(q.parceladoCents)})</span>
                          </span>
                        )}
                      </div>
                      {q.note && <p className="mt-2 text-sm text-charcoal/80">“{q.note}”</p>}
                      <PreApproveButton quoteId={q.id} approved={q.status !== 'SENT'} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* Aside: local da obra + documentos + ações */}
        <aside className="flex flex-col gap-6">
          <ProjectLocation projectId={project.id} city={project.city} cep={project.cep} editable={editable} />

          {roomPhotos.length > 0 && (
            <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-charcoal">Documentos do projeto</h2>
              <div className="grid grid-cols-2 gap-2">
                {roomPhotos.map((p) =>
                  p.url ? (
                    p.kind === 'ARCHITECT_PDF' ? (
                      <a
                        key={p.id}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex aspect-square items-center justify-center rounded-xl border border-subtle bg-deep text-center text-sm font-medium text-brand-primary"
                      >
                        📄 Abrir PDF
                      </a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={p.url}
                        alt="Documento do projeto"
                        className="aspect-square w-full rounded-xl border border-subtle object-cover"
                      />
                    )
                  ) : null,
                )}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-charcoal">Ações</h2>
            <ProjectActions projectId={project.id} status={project.status} />
          </section>
        </aside>
      </div>
    </main>
  );
}
