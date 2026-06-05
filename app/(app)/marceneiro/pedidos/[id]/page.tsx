import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatCm, type Category } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getCarpenterProfile } from '@/lib/carpenter/profile';
import { getProjectForCarpenter } from '@/lib/carpenter/feed';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { getActivePricingConfig } from '@/lib/pricing/config';
import { getCarpenterQuote } from '@/lib/quotes/queries';
import { CATEGORY_LABELS, CATEGORY_EMOJI } from '@/lib/labels';
import { QuoteForm, type QuoteInitial } from './_components/QuoteForm';

export default async function CarpenterPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('CARPENTER');
  // Queries independentes em paralelo (1 ida em vez de 3 sequenciais).
  const [carpenter, config, existing] = await Promise.all([
    getCarpenterProfile(profile.id),
    getActivePricingConfig(),
    getCarpenterQuote(id, profile.id),
  ]);
  if (!carpenter) notFound();

  const detail = await getProjectForCarpenter(id, carpenter);
  if (!detail) notFound();
  const { project, modules, photos } = detail;
  const quoteInitial: QuoteInitial | undefined = existing
    ? {
        baseValueReais: String(existing.baseValueCents / 100),
        maxInstallments: existing.maxInstallments,
        dilutionSharePct: Number(existing.dilutionSharePct),
        note: existing.note ?? '',
        status: existing.status,
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
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/marceneiro" className="text-sm text-muted hover:text-charcoal">
        ← Pedidos da região
      </Link>
      <header className="mt-3 mb-6">
        <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">{project.title}</h1>
        <p className="text-sm text-muted">
          📍 {project.city ?? '—'} · {modules.length} {modules.length === 1 ? 'móvel' : 'móveis'}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-charcoal">Móveis do pedido</h2>
            <div className="flex flex-col gap-6">
              {[...groups.entries()].map(([room, mods]) => (
                <div key={room}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-secondary">{room}</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {mods.map((m) => {
                      const url = modulePhoto.get(m.id) ?? null;
                      return (
                        <div key={m.id} className="flex gap-3 rounded-xl border border-subtle p-3">
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-deep text-2xl">
                            {url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span aria-hidden>{CATEGORY_EMOJI[m.type as Category] ?? '🪵'}</span>
                            )}
                          </div>
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
        </div>

        <aside className="flex flex-col gap-6">
          {roomPhotos.length > 0 && (
            <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-charcoal">Fotos / documentos</h2>
              <div className="grid grid-cols-2 gap-2">
                {roomPhotos.map((p) =>
                  p.url ? (
                    p.kind === 'ARCHITECT_PDF' ? (
                      <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="flex aspect-square items-center justify-center rounded-xl border border-subtle bg-deep text-sm font-medium text-brand-primary">
                        📄 Abrir PDF
                      </a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.id} src={p.url} alt="" className="aspect-square w-full rounded-xl border border-subtle object-cover" />
                    )
                  ) : null,
                )}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-charcoal">Seu orçamento</h2>
            {config ? (
              <QuoteForm
                projectId={project.id}
                minDilutionPct={config.dilutionMinCarpenterSharePct}
                installmentOptions={Object.keys(config.installmentTable).map(Number).sort((a, b) => a - b)}
                initial={quoteInitial}
              />
            ) : (
              <p className="text-muted">Configuração de preço indisponível.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
