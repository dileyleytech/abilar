import Link from 'next/link';
import type { Category } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getCarpenterProfile } from '@/lib/carpenter/profile';
import { CATEGORY_LABELS } from '@/lib/labels';

export const metadata = { title: 'Área do marceneiro — Abilar' };

export default async function MarceneiroPage() {
  const profile = await requireRole('CARPENTER');
  const carpenter = await getCarpenterProfile(profile.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-charcoal sm:text-3xl">Olá, {carpenter?.name ?? profile.name ?? 'marceneiro'} 👋</h1>

      {!carpenter ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-subtle bg-surface p-8">
          <span className="text-4xl" aria-hidden>🪚</span>
          <h2 className="text-xl font-semibold text-charcoal">Complete seu cadastro</h2>
          <p className="text-muted">
            Pra receber pedidos da sua região, conte onde você atende e o que você faz.
          </p>
          <Link href="/marceneiro/perfil" className="mt-2 rounded-xl bg-brand-primary px-5 py-3 font-semibold text-white">
            Completar cadastro
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
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

          <section className="rounded-2xl border border-dashed border-subtle bg-surface p-6 text-center text-muted">
            {/* TODO(Fase 4.2): feed de pedidos OPEN_FOR_QUOTES na cidade/categoria do marceneiro. */}
            <span className="text-3xl" aria-hidden>📥</span>
            <p className="mt-2 font-medium text-charcoal">Pedidos da sua região</p>
            <p>Em breve: aqui aparecem os pedidos abertos pra você orçar.</p>
          </section>
        </div>
      )}
    </main>
  );
}
