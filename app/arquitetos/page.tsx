import Link from 'next/link';
import { architectProfiles, eq, asc } from '@abilar/db';
import { getDb } from '@/lib/db';
import { signedProjectPhotoUrl } from '@/lib/storage';

export const metadata = {
  title: 'Arquitetos parceiros — Abilar',
  description: 'Arquitetos parceiros da Abilar. Indique projetos, acompanhe a execução e receba comissão por transação — sem custo para entrar.',
};

async function listArchitects() {
  const db = getDb();
  const rows = await db
    .select({ userId: architectProfiles.userId, name: architectProfiles.name, cau: architectProfiles.cau, logoPath: architectProfiles.logoPath })
    .from(architectProfiles)
    .where(eq(architectProfiles.active, true))
    .orderBy(asc(architectProfiles.name));
  return Promise.all(
    rows.map(async ({ logoPath, ...r }) => ({ ...r, logoUrl: logoPath ? await signedProjectPhotoUrl(logoPath, 600) : null })),
  );
}

export default async function ArquitetosPage() {
  const architects = await listArchitects();

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-subtle bg-surface/90 px-4 backdrop-blur sm:px-6 lg:px-8">
        <Link href="/" aria-label="Abilar — início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/abilar-logo-horizontal.svg" alt="Abilar" className="h-7 w-auto" />
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/entrar" className="rounded-md px-3 py-2 text-sm font-medium text-charcoal hover:bg-deep">Entrar</Link>
          <Link href="/cadastro" className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white">Criar conta</Link>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-screen-lg px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-bold text-charcoal sm:text-4xl">Arquitetos parceiros</h1>
        <p className="mt-2 max-w-2xl text-lg text-charcoal/70">
          Profissionais que indicam projetos e acompanham a execução pela Abilar. A comissão sai da fatia da plataforma —
          sem acréscimo para o cliente.
        </p>

        {architects.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-subtle bg-surface p-10 text-center text-muted">
            Em breve, nossos arquitetos parceiros aparecerão aqui.
          </div>
        ) : (
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {architects.map((a) => (
              <li key={a.userId} className="flex items-center gap-4 rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
                {a.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.logoUrl} alt={`Logo ${a.name}`} className="h-12 w-12 shrink-0 rounded-full object-contain" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-secondary/12 text-2xl">📐</span>
                )}
                <div>
                  <p className="font-semibold text-charcoal">{a.name}</p>
                  {a.cau && <p className="text-sm text-muted">CAU {a.cau}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-12 rounded-2xl bg-brand-secondary p-8 text-sand">
          <h2 className="font-heading text-2xl font-bold">É arquiteto? Seja parceiro.</h2>
          <p className="mt-2 max-w-2xl text-sand/90">
            Indique seus projetos, acompanhe a obra com pagamento protegido por etapa e receba comissão por transação —
            sem custo para entrar.
          </p>
          <Link href="/cadastro" className="mt-4 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-brand-secondary transition hover:opacity-90">
            Quero ser parceiro
          </Link>
        </div>
      </section>
    </div>
  );
}
