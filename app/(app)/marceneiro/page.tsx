import Link from 'next/link';
import type { Category } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getCarpenterProfile } from '@/lib/carpenter/profile';
import { getCarpenterFeed } from '@/lib/carpenter/feed';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { CATEGORY_LABELS } from '@/lib/labels';

export const metadata = { title: 'Área do marceneiro — Abilar' };

export default async function MarceneiroPage() {
  const profile = await requireRole('CARPENTER');
  const carpenter = await getCarpenterProfile(profile.id);
  const feed = carpenter ? await getCarpenterFeed(carpenter) : [];
  const cards = await Promise.all(
    feed.map(async (f) => ({
      ...f,
      photoUrls: (await Promise.all(f.photoPaths.map((p) => signedProjectPhotoUrl(p)))).filter(
        (u): u is string => !!u,
      ),
    })),
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-charcoal sm:text-3xl">
        Olá, {carpenter?.name ?? profile.name ?? 'marceneiro'} 👋
      </h1>

      {!carpenter ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-subtle bg-surface p-8">
          <span className="text-4xl" aria-hidden>🪚</span>
          <h2 className="text-xl font-semibold text-charcoal">Complete seu cadastro</h2>
          <p className="text-muted">Pra receber pedidos da sua região, conte onde você atende e o que você faz.</p>
          <Link href="/marceneiro/perfil" className="mt-2 rounded-xl bg-brand-primary px-5 py-3 font-semibold text-white">
            Completar cadastro
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-subtle bg-surface p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-charcoal">Seu atendimento</h2>
              <Link href="/marceneiro/perfil" className="text-sm font-medium text-brand-primary hover:underline">
                Editar
              </Link>
            </div>
            <p className="mt-2 text-base text-charcoal">
              📍 {carpenter.serviceCity} · raio de {carpenter.serviceRadiusKm} km
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {carpenter.categories.map((c) => (
                <span key={c} className="rounded-pill bg-deep px-3 py-1 text-sm text-charcoal">
                  {CATEGORY_LABELS[c as Category] ?? c}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-charcoal">Pedidos da sua região</h2>
            {cards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-subtle bg-surface p-10 text-center text-muted">
                <span className="text-3xl" aria-hidden>📭</span>
                <p className="mt-2 font-medium text-charcoal">Nenhum pedido aberto agora</p>
                <p>Assim que aparecer um pedido na sua cidade/raio e categoria, ele surge aqui.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/marceneiro/pedidos/${c.id}`}
                      className="flex h-full flex-col overflow-hidden rounded-2xl border border-subtle bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md"
                    >
                      <div className="relative flex aspect-[4/3] items-center justify-center bg-deep">
                        {c.photoUrls[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.photoUrls[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-5xl" aria-hidden>🛋️</span>
                        )}
                        {c.photoUrls.length > 1 && (
                          <span className="absolute bottom-2 right-2 rounded-pill bg-charcoal/70 px-2 py-0.5 text-xs font-medium text-white">
                            📷 {c.photoUrls.length}
                          </span>
                        )}
                        {c.quoted && (
                          <span className="absolute left-2 top-2 rounded-pill bg-brand-secondary px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                            ✓ Orçamento enviado
                          </span>
                        )}
                      </div>

                      {c.photoUrls.length > 1 && (
                        <div className="flex gap-1 px-2 pt-2">
                          {c.photoUrls.slice(1, 5).map((u, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={u} alt="" className="h-12 w-12 rounded-md object-cover" />
                          ))}
                        </div>
                      )}

                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <h3 className="text-lg font-semibold text-charcoal">{c.title}</h3>
                        <p className="text-sm text-muted">
                          📍 {c.city ?? '—'} · {c.moduleCount} {c.moduleCount === 1 ? 'móvel' : 'móveis'}
                        </p>
                        <div className="mt-auto flex flex-wrap gap-1.5">
                          {c.categories.map((cat) => (
                            <span key={cat} className="rounded-pill bg-deep px-2.5 py-0.5 text-xs font-medium text-charcoal">
                              {CATEGORY_LABELS[cat as Category] ?? cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
