import Link from 'next/link';
import { requireRole } from '@/lib/auth/session';
import { getCarpenterProfile } from '@/lib/carpenter/profile';
import { getCarpenterFeed, getCarpenterQuotedProjects } from '@/lib/carpenter/feed';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { MarceneiroFeed } from './_components/MarceneiroFeed';
import { ServiceAreaBar } from './_components/ServiceAreaBar';

export const metadata = { title: 'Área do marceneiro — Abilar' };

const signPaths = async (paths: string[]) =>
  (await Promise.all(paths.map((p) => signedProjectPhotoUrl(p)))).filter((u): u is string => !!u);

export default async function MarceneiroPage() {
  const profile = await requireRole('CARPENTER');
  const carpenter = await getCarpenterProfile(profile.id);
  const [feed, quotedRaw] = carpenter
    ? await Promise.all([getCarpenterFeed(carpenter), getCarpenterQuotedProjects(carpenter)])
    : [[], []];
  const [openCards, quotedCards] = await Promise.all([
    Promise.all(feed.map(async (f) => ({ ...f, photoUrls: await signPaths(f.photoPaths) }))),
    Promise.all(quotedRaw.map(async (q) => ({ ...q, photoUrls: await signPaths(q.photoPaths) }))),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">
          Olá, {carpenter?.name ?? profile.name ?? 'marceneiro'} 👋
        </h1>
        {carpenter && (
          <Link
            href="/marceneiro/catalogo"
            className="rounded-xl border border-subtle bg-surface px-4 py-2.5 text-sm font-semibold text-charcoal shadow-sm transition hover:border-brand-primary/40"
          >
            📦 Meu catálogo
          </Link>
        )}
      </div>

      {!carpenter ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-subtle bg-surface p-8">
          <span className="text-4xl" aria-hidden>🪚</span>
          <h2 className="text-xl font-semibold text-charcoal">Complete seu cadastro</h2>
          <p className="text-muted">Pra receber pedidos da sua região, conte onde você atende e o que você faz.</p>
          <Link href="/marceneiro/perfil" className="mt-2 rounded-xl bg-brand-primary px-5 py-3 font-semibold text-white">
            Completar cadastro
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Faixa fina de atendimento (resumo + ajustar) */}
          <ServiceAreaBar
            city={carpenter.serviceCity}
            radiusKm={carpenter.serviceRadiusKm}
            categories={carpenter.categories as string[]}
          />
          {/* Abas: novos pedidos + meus orçamentos */}
          <MarceneiroFeed open={openCards} quoted={quotedCards} />
        </div>
      )}
    </main>
  );
}
