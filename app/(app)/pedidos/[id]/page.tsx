import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatBRL } from '@abilar/shared';
import { requireUserId } from '@/lib/auth/session';
import { getProjectDetail } from '@/lib/projects/queries';
import { getReceivedQuotes } from '@/lib/quotes/queries';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { StatusBadge } from '@/components/StatusBadge';
import { ObraBoard } from '@/components/ObraBoard';
import { getProjectMilestones } from '@/lib/obra/queries';
import { backFrom } from '@/lib/nav';
import { ProjectActions } from './_components/ProjectActions';
import { ProjectTitle } from './_components/ProjectTitle';
import { ModulesSection, type ModuleView } from './_components/ModulesSection';
import { ProjectLocation } from './_components/ProjectLocation';
import { PreApproveButton } from './_components/PreApproveButton';
import { AcceptQuoteButton } from './_components/AcceptQuoteButton';

export default async function PedidoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; novo?: string }>;
}) {
  const { id } = await params;
  const { from, novo } = await searchParams;
  const back = backFrom(from, '/pedidos');
  const userId = await requireUserId();
  const detail = await getProjectDetail(id, userId);
  if (!detail) notFound();
  const { project, modules, photos } = detail;

  // Tudo que não depende um do outro carrega EM PARALELO (assinatura de fotos,
  // orçamentos e obra) — evita encadear as esperas.
  const [signed, quotes, obra] = await Promise.all([
    Promise.all(photos.map(async (p) => ({ ...p, url: await signedProjectPhotoUrl(p.path) }))),
    getReceivedQuotes(id),
    getProjectMilestones(id, userId),
  ]);
  const roomPhotos = signed.filter((p) => !p.moduleId);
  const modulePhoto = new Map<string, string | null>();
  for (const p of signed) if (p.moduleId) modulePhoto.set(p.moduleId, p.url);
  const editable = ['DRAFT', 'OPEN_FOR_QUOTES', 'IN_NEGOTIATION'].includes(project.status);
  const isArchitectProject = project.sourceType === 'ARCHITECT_PROJECT';
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
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={back.href}
            aria-label={from ? 'Voltar à conversa' : 'Voltar'}
            className="shrink-0 rounded-lg px-2 py-1.5 text-lg text-muted transition hover:bg-deep hover:text-charcoal"
          >
            ←
          </Link>
          <div className="min-w-0">
            <ProjectTitle projectId={project.id} title={project.title} editable={editable} />
            <p className="text-sm text-muted">
              {moduleViews.length} {moduleViews.length === 1 ? 'móvel' : 'móveis'}
              {project.sourceType === 'ARCHITECT_PROJECT' ? ' · Projeto de arquiteto' : ''}
            </p>
          </div>
        </div>
        <StatusBadge status={project.status} />
      </header>

      <div className="flex flex-col gap-6">
        {/* Obra contratada — quadro em destaque, largura total */}
        {obra && (
          <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-xl font-bold text-charcoal">Sua obra</h2>
            <ObraBoard milestones={obra.milestones} meIsClient={obra.meIsClient} meIsCarpenter={obra.meIsCarpenter} approvedPct={obra.approvedPct} />
          </section>
        )}

        {/* Orçamentos recebidos — destaque, no topo, com o máximo de detalhes */}
        {(project.status === 'OPEN_FOR_QUOTES' || quotes.length > 0) && (
          <section className="rounded-2xl border-2 border-brand-secondary/25 bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="mb-1 text-xl font-bold text-charcoal sm:text-2xl">
              Orçamentos recebidos {quotes.length > 0 && <span className="text-brand-secondary">({quotes.length})</span>}
            </h2>
            <p className="mb-4 text-sm text-muted">Compare as propostas. Converse antes de fechar e aceite quando estiver seguro.</p>
            {quotes.length === 0 ? (
              <p className="rounded-xl border border-subtle p-6 text-center text-muted">
                Nenhum orçamento ainda. Marceneiros da sua região vão enviar propostas aqui.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {quotes.map((q) => {
                  const economiaCents = q.parceladoCents != null ? q.parceladoCents - q.avistaCents : 0;
                  return (
                    <li key={q.id} className="flex flex-col gap-3 rounded-2xl border border-subtle bg-base p-5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-lg font-bold text-charcoal">{q.carpenterName}</p>
                        <span className="rounded-pill bg-brand-secondary/15 px-2.5 py-0.5 text-xs font-semibold text-brand-secondary">
                          {q.contractId ? 'Contrato gerado' : q.status === 'PRE_APPROVED' ? 'Em negociação' : q.status === 'SENT' ? 'Recebido' : q.status}
                        </span>
                      </div>

                      {/* Preço em destaque */}
                      <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">À vista no Pix</p>
                        <p className="text-3xl font-bold text-charcoal">{formatBRL(q.avistaCents)}</p>
                        {q.parceladoCents != null && q.installmentValueCents != null && (
                          <p className="mt-1 text-sm text-muted">
                            ou <strong className="text-charcoal">{q.clientInstallments}x de {formatBRL(q.installmentValueCents)}</strong> no cartão
                            <span className="text-subtle"> (total {formatBRL(q.parceladoCents)})</span>
                          </p>
                        )}
                        {economiaCents > 0 && (
                          <p className="mt-1 text-sm font-semibold text-brand-secondary">💰 Economize {formatBRL(economiaCents)} pagando à vista</p>
                        )}
                      </div>

                      {/* O que está incluído (sem custos do marceneiro) */}
                      {q.items.length > 0 && (
                        <div>
                          <p className="mb-1 text-sm font-semibold text-charcoal">O que está incluído</p>
                          <ul className="flex flex-col gap-0.5">
                            {q.items.map((it, i) => (
                              <li key={i} className="text-sm text-muted">• {it.qty} {it.unit} · {it.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {q.note && (
                        <div className="rounded-xl bg-deep/40 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mensagem do marceneiro</p>
                          <p className="text-sm text-charcoal/90">“{q.note}”</p>
                        </div>
                      )}

                      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                        {q.contractId ? (
                          <Link href={`/contratos/${q.contractId}`} className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                            📄 Ver contrato
                          </Link>
                        ) : q.status === 'PRE_APPROVED' ? (
                          <AcceptQuoteButton quoteId={q.id} />
                        ) : (
                          <PreApproveButton quoteId={q.id} approved={q.status !== 'SENT'} />
                        )}
                        <Link href={`/orcamentos/${q.id}/imprimir`} className="text-sm font-semibold text-brand-primary hover:underline">
                          🖨️ PDF
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Móveis do pedido — projeto de arquiteto dispensa (o PDF já tem tudo) */}
        {isArchitectProject ? (
          <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-charcoal">Projeto de arquiteto</h2>
            <p className="mt-1 text-sm text-muted">
              Este pedido usa o PDF do projeto — não precisa cadastrar os móveis. Os marceneiros vão orçar a partir do documento abaixo.
            </p>
          </section>
        ) : (
          <ModulesSection projectId={project.id} modules={moduleViews} editable={editable} autoOpen={novo === '1'} />
        )}

        {/* Secundário: local da obra · documentos */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ProjectLocation projectId={project.id} city={project.city} cep={project.cep} editable={editable} />

          {roomPhotos.length > 0 && (
            <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-charcoal">Documentos do projeto</h2>
              <div className="grid grid-cols-3 gap-2">
                {roomPhotos.map((p) =>
                  p.url ? (
                    p.kind === 'ARCHITECT_PDF' ? (
                      <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="flex aspect-square items-center justify-center rounded-xl border border-subtle bg-deep text-center text-xs font-medium text-brand-primary">
                        📄 PDF
                      </a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.id} src={p.url} alt="Documento do projeto" className="aspect-square w-full rounded-xl border border-subtle object-cover" />
                    )
                  ) : null,
                )}
              </div>
            </section>
          )}
        </div>

        {/* Ação principal do pedido — publicar / cancelar */}
        <ProjectActions projectId={project.id} status={project.status} hasModules={isArchitectProject || moduleViews.length > 0} />
      </div>
    </main>
  );
}
