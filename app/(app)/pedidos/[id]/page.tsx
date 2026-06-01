import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Category } from '@abilar/shared';
import { requireUserId } from '@/lib/auth/session';
import { getProjectDetail } from '@/lib/projects/queries';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { CATEGORY_LABELS } from '@/lib/labels';
import { StatusBadge } from '@/components/StatusBadge';
import { ProjectActions } from './_components/ProjectActions';
import { ModulesSection, type ModuleView } from './_components/ModulesSection';

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

  const editable = ['DRAFT', 'OPEN_FOR_QUOTES', 'IN_NEGOTIATION'].includes(project.status);
  const moduleViews: ModuleView[] = modules.map((m) => ({
    id: m.id,
    ambiente: m.ambiente,
    type: m.type,
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
          <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">
            {project.title ?? CATEGORY_LABELS[project.category as Category]}
          </h1>
          <p className="text-sm text-muted">
            {CATEGORY_LABELS[project.category as Category]} ·{' '}
            {project.workType === 'NEW_INSTALL' ? 'Móvel novo' : 'Substituição'}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Conteúdo principal: móveis por cômodo */}
        <div className="lg:col-span-2">
          <ModulesSection projectId={project.id} modules={moduleViews} editable={editable} />
        </div>

        {/* Aside: fotos do ambiente + ações */}
        <aside className="flex flex-col gap-6">
          <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-charcoal">Fotos do ambiente</h2>
            {roomPhotos.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma foto do ambiente.</p>
            ) : (
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
                        alt="Foto do ambiente"
                        className="aspect-square w-full rounded-xl border border-subtle object-cover"
                      />
                    )
                  ) : null,
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-charcoal">Ações</h2>
            <ProjectActions projectId={project.id} status={project.status} />
          </section>
        </aside>
      </div>
    </main>
  );
}
