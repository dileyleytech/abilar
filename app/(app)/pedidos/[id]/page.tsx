import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUserId } from '@/lib/auth/session';
import { getProjectDetail } from '@/lib/projects/queries';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { PROJECT_STATUS_LABEL } from '@/lib/labels';
import { ProjectActions } from './_components/ProjectActions';
import { ModulesSection } from './_components/ModulesSection';

export default async function PedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const detail = await getProjectDetail(id, userId);
  if (!detail) notFound();
  const { project, modules, photos } = detail;

  // URLs assinadas curtas para os anexos.
  const photoUrls = await Promise.all(
    photos.map(async (p) => ({ ...p, url: await signedProjectPhotoUrl(p.path) })),
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-6 py-10">
      <Link href="/pedidos" className="text-base text-muted underline">
        ← Meus pedidos
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-charcoal">{project.title ?? project.category}</h1>
        <p className="text-sm text-muted">{PROJECT_STATUS_LABEL[project.status]}</p>
      </header>

      {photoUrls.length > 0 && (
        <section className="flex flex-col gap-2">
          {photoUrls.map((p) =>
            p.url ? (
              p.kind === 'ARCHITECT_PDF' ? (
                <a key={p.id} href={p.url} className="font-medium text-brand underline" target="_blank" rel="noreferrer">
                  📄 Abrir PDF do projeto
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.url} alt="Foto do pedido" className="w-full rounded-lg border border-subtle" />
              )
            ) : null,
          )}
        </section>
      )}

      <ModulesSection
        projectId={project.id}
        editable={['DRAFT', 'OPEN_FOR_QUOTES', 'IN_NEGOTIATION'].includes(project.status)}
        modules={modules.map((m) => ({
          id: m.id,
          ambiente: m.ambiente,
          type: m.type,
          label: m.label,
          widthMm: m.widthMm,
          heightMm: m.heightMm,
          depthMm: m.depthMm,
        }))}
      />

      <ProjectActions projectId={project.id} status={project.status} />
    </main>
  );
}
