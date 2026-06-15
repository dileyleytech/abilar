import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatCm, type Category, type QuoteLineItem } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getCarpenterProfile } from '@/lib/carpenter/profile';
import { getProjectForCarpenter, getProjectDetailById } from '@/lib/carpenter/feed';
import { listMaterials } from '@/lib/carpenter/materials';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { getActivePricingConfig } from '@/lib/pricing/config';
import { getCarpenterQuote } from '@/lib/quotes/queries';
import { getConversationForProjectCarpenter } from '@/lib/chat/queries';
import { getContractForQuote } from '@/lib/contracts/queries';
import { getProjectMilestones } from '@/lib/obra/queries';
import { ObraBoard } from '@/components/ObraBoard';
import { CATEGORY_LABELS, CATEGORY_EMOJI } from '@/lib/labels';
import { IconVoltar, IconLocal, IconConversas, IconContrato, IconImprimir, IconAvulsos, IconAbi } from '@/components/ui/icons';
import { StatusBadge } from '@/components/StatusBadge';
import { backFrom } from '@/lib/nav';
import { QuoteForm, type QuoteInitial, type MaterialOption } from './_components/QuoteForm';

export default async function CarpenterPedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const back = backFrom(from, '/marceneiro');
  const profile = await requireRole('CARPENTER');
  // Queries independentes em paralelo (1 ida em vez de várias sequenciais).
  const [carpenter, config, existing, conversationId, catalog] = await Promise.all([
    getCarpenterProfile(profile.id),
    getActivePricingConfig(),
    getCarpenterQuote(id, profile.id),
    getConversationForProjectCarpenter(id, profile.id),
    listMaterials(profile.id, { activeOnly: true }),
  ]);
  if (!carpenter) notFound();

  // Já orçou → pode abrir/editar em qualquer status; senão, vale a elegibilidade (pedido aberto).
  // detail, contract e obra são independentes → em paralelo.
  const [detail, contract, obra] = await Promise.all([
    existing ? getProjectDetailById(id) : getProjectForCarpenter(id, carpenter),
    existing ? getContractForQuote(existing.id) : Promise.resolve(null),
    getProjectMilestones(id, profile.id),
  ]);
  if (!detail) notFound();
  const contractNeedsSign = contract != null && contract.status === 'DRAFT' && !contract.carpenterSigned;
  const { project, modules, photos } = detail;

  const materials: MaterialOption[] = catalog.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    unit: m.unit,
    unitCostCents: m.unitCostCents,
  }));

  const lineItems = (existing?.lineItems as QuoteLineItem[] | undefined) ?? [];
  // Margem é derivada (base/custo − 1), já que o orçamento guarda valor e custo, não a margem.
  const cost = existing?.carpenterCostCents ?? 0;
  const derivedMargin = cost > 0 && existing ? Math.round((existing.baseValueCents / cost - 1) * 100) : 30;
  const quoteInitial: QuoteInitial | undefined = existing
    ? {
        baseValueReais: String(existing.baseValueCents / 100),
        maxInstallments: existing.maxInstallments,
        dilutionSharePct: Number(existing.dilutionSharePct),
        note: existing.note ?? '',
        status: existing.status,
        lineItems,
        marginPct: derivedMargin,
      }
    : undefined;

  const signed = await Promise.all(photos.map(async (p) => ({ ...p, url: await signedProjectPhotoUrl(p.path) })));
  const roomPhotos = signed.filter((p) => !p.moduleId);
  const modulePhoto = new Map<string, string | null>();
  for (const p of signed) if (p.moduleId) modulePhoto.set(p.moduleId, p.url);

  // Agrupa móveis por cômodo.
  const groups = new Map<string, typeof modules>();
  for (const m of modules) {
    const k = m.ambiente?.trim() || 'Outros';
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(m);
  }

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={back.href}
            aria-label="Voltar"
            className="inline-flex shrink-0 items-center rounded-lg px-2 py-1.5 text-muted transition hover:bg-deep hover:text-charcoal"
          >
            <IconVoltar size={22} aria-hidden />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-charcoal sm:text-3xl">{project.title}</h1>
            <p className="inline-flex items-center gap-1 text-sm text-muted">
              <IconLocal size={14} aria-hidden /> {project.city ?? '—'} · {modules.length} {modules.length === 1 ? 'móvel' : 'móveis'}
            </p>
          </div>
        </div>
        <StatusBadge status={project.status} />
      </header>

      {/* Ações grandes e óbvias no topo */}
      {(conversationId || existing) && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          {conversationId && (
            <Link
              href={`/conversas/${conversationId}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-secondary px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <IconConversas size={22} aria-hidden /> Conversar com o cliente
            </Link>
          )}
          {contract && (
            <Link
              href={`/contratos/${contract.id}`}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-lg font-semibold shadow-sm transition hover:opacity-90 ${
                contractNeedsSign ? 'bg-brand-primary text-white' : 'border-2 border-subtle text-charcoal'
              }`}
            >
              <IconContrato size={22} aria-hidden /> {contractNeedsSign ? 'Assinar contrato' : 'Ver contrato'}
            </Link>
          )}
          {existing && (
            <Link
              href={`/orcamentos/${existing.id}/imprimir`}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-brand-primary px-5 py-4 text-lg font-semibold text-brand-primary transition hover:bg-deep"
            >
              <IconImprimir size={22} aria-hidden /> Baixar orçamento (PDF)
            </Link>
          )}
          {existing && (
            <Link
              href={`/marceneiro/pedidos/${id}/sugerir`}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-subtle px-5 py-4 text-lg font-semibold text-charcoal transition hover:bg-deep"
            >
              <IconAbi size={22} aria-hidden /> Sugerir mudança no projeto
            </Link>
          )}
        </div>
      )}

      {/* Obra contratada: quadro de etapas em destaque */}
      {obra && (
        <section className="mb-6 rounded-2xl border border-subtle bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-xl font-bold text-charcoal">Sua obra (execução)</h2>
          <ObraBoard milestones={obra.milestones} meIsClient={obra.meIsClient} meIsCarpenter={obra.meIsCarpenter} approvedPct={obra.approvedPct} />
        </section>
      )}

      {/* Três colunas, largura total: o que o cliente pediu | montar | valores */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* O que o cliente pediu (referência) — ocupa 100% da coluna */}
        <section className="flex flex-col rounded-2xl border border-subtle bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">O que o cliente pediu</h2>

          {roomPhotos.length > 0 && (
            <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {roomPhotos.map((p) =>
                p.url ? (
                  p.kind === 'ARCHITECT_PDF' ? (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-subtle bg-deep text-center text-xs font-medium text-brand-primary">
                      <IconAvulsos size={20} aria-hidden /> PDF
                    </a>
                  ) : (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer" title="Abrir foto" className="block aspect-square overflow-hidden rounded-xl border border-subtle">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="Foto do pedido" className="h-full w-full object-cover transition hover:opacity-90" />
                    </a>
                  )
                ) : null,
              )}
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto lg:pr-1">
            {[...groups.entries()].map(([room, mods]) => (
              <div key={room}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-secondary">{room}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {mods.map((m) => {
                    const url = modulePhoto.get(m.id) ?? null;
                    return (
                      <div key={m.id} className="flex gap-3 rounded-xl border border-subtle p-3">
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" title="Abrir foto" className="flex h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-deep">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={m.label ?? m.type} className="h-full w-full object-cover transition hover:opacity-90" />
                          </a>
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-deep text-2xl">
                            <span aria-hidden>{CATEGORY_EMOJI[m.type as Category] ?? '🪵'}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-charcoal">
                            {m.label ?? CATEGORY_LABELS[m.type as Category] ?? m.type}
                          </p>
                          <p className="mt-1 font-mono text-sm text-muted">
                            {formatCm(m.widthMm)} × {formatCm(m.heightMm)} × {formatCm(m.depthMm)}
                          </p>
                          {m.workType && (
                            <span className="mt-1 inline-block rounded-pill bg-deep px-2 py-0.5 text-[10px] font-medium text-muted">
                              {m.workType === 'NEW_INSTALL' ? 'Novo' : 'Troca'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Colunas 2 e 3 (montar | valores) vêm do QuoteForm */}
        {config ? (
          <QuoteForm projectId={project.id} config={config} materials={materials} initial={quoteInitial} />
        ) : (
          <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm sm:p-6 lg:col-span-2">
            <p className="text-muted">Configuração de preço indisponível.</p>
          </section>
        )}
      </div>
    </main>
  );
}
