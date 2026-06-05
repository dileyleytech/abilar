import Link from 'next/link';
import { redirect } from 'next/navigation';
import { brand } from '@abilar/shared/tokens';
import { AppHeader } from '@/components/AppHeader';
import { getSessionProfile } from '@/lib/auth/session';

export const metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description:
    'Do projeto ao lar, com a ABI. Veja seu móvel antes de contratar, receba orçamentos de marceneiros e pague protegido por etapa de obra.',
};

const STEPS = [
  { emoji: '📸', title: 'Você mostra o espaço', desc: 'Envie uma foto do cômodo e as medidas. Sem complicação.' },
  { emoji: '💬', title: 'A ABI te mostra', desc: 'Converse e veja uma prévia do móvel no seu ambiente, do seu jeito.' },
  { emoji: '🤝', title: 'O marceneiro realiza', desc: 'Receba orçamentos de profissionais da sua região e contrate com segurança.' },
];

export default async function Home() {
  // Logado: a tela inicial já leva à área do usuário.
  const profile = await getSessionProfile();
  if (profile) {
    const home =
      profile.role === 'CLIENT' ? '/pedidos' : profile.role === 'CARPENTER' ? '/marceneiro' : '/conta';
    redirect(home);
  }

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-screen-2xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24 lg:px-8">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-pill bg-brand-secondary/12 px-4 py-1.5 text-sm font-medium text-brand-secondary">
              🛡️ Pagamento protegido por etapa de obra
            </span>
            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-charcoal sm:text-5xl lg:text-6xl">
              Do projeto ao lar,
              <br />
              <span className="text-brand-primary">com a ABI.</span>
            </h1>
            <p className="max-w-xl text-lg text-charcoal/70">
              Você imagina, a <strong className="font-semibold text-brand-secondary">ABI</strong> mostra o móvel no seu
              ambiente, e marceneiros de confiança realizam. O pagamento fica seguro, liberado por etapa.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/cadastro"
                className="rounded-xl bg-brand-primary px-7 py-4 text-lg font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Começar meu projeto
              </Link>
              <Link
                href="/cadastro"
                className="rounded-xl border border-subtle bg-surface px-7 py-4 text-lg font-semibold text-charcoal transition hover:bg-deep"
              >
                Sou marceneiro
              </Link>
            </div>
            <p className="text-sm text-muted">Grátis para começar · Sem cartão · PT-BR 🇧🇷</p>
          </div>

          {/* Visual da ABI */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md rounded-3xl border border-subtle bg-surface p-8 shadow-lg">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/abilar-abi-casa-rosto.svg" alt="ABI" className="h-12 w-12" />
                <div className="rounded-2xl rounded-tl-sm bg-deep px-4 py-3 text-charcoal">
                  Oi, eu sou a <strong>ABI</strong> 👋 Que móvel você quer criar?
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Guarda-roupa', 'Cozinha', 'Painel de TV', 'Home office'].map((c) => (
                  <span key={c} className="rounded-pill border border-subtle bg-base px-3 py-1.5 text-sm text-charcoal">
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-5 aspect-video rounded-2xl bg-gradient-to-br from-ochre/30 via-sand-deep to-sage/30" />
              <p className="mt-3 text-center text-sm text-muted">✓ Prévia do seu móvel, antes de contratar</p>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="mx-auto w-full max-w-screen-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center font-heading text-3xl font-bold text-charcoal">Como funciona</h2>
        <p className="mt-2 text-center text-muted">Três passos simples, do projeto à instalação.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-subtle bg-surface p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-deep text-2xl">{s.emoji}</div>
              <p className="mt-4 text-sm font-semibold text-brand-primary">Passo {i + 1}</p>
              <h3 className="text-xl font-semibold text-charcoal">{s.title}</h3>
              <p className="mt-1 text-charcoal/70">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SEGURANÇA / ESCROW */}
      <section className="bg-brand-secondary">
        <div className="mx-auto grid w-full max-w-screen-2xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="text-sand">
            <h2 className="font-heading text-3xl font-bold">Seu dinheiro, protegido por etapa</h2>
            <p className="mt-3 max-w-xl text-sand/90">
              O valor fica retido com segurança e é liberado conforme a obra avança — material, montagem, entrega,
              instalação. Você só paga pelo que foi feito; o marceneiro recebe pelo que entregou.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Sinal', 'Material', 'Montagem', 'Entrega', 'Instalação', 'Vistoria'].map((m, i) => (
              <div key={m} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sand">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sand/20 text-sm font-bold">
                  {i + 1}
                </span>
                {m}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl font-bold text-charcoal sm:text-4xl">Pronto para transformar sua casa?</h2>
        <p className="mt-3 text-lg text-charcoal/70">Crie seu pedido em minutos e receba orçamentos de quem entende.</p>
        <Link
          href="/cadastro"
          className="mt-6 inline-block rounded-xl bg-brand-primary px-8 py-4 text-lg font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          Criar conta grátis
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="bg-charcoal">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/abilar-wordmark-dark.svg" alt="Abilar" className="h-7 w-auto" />
          <p className="text-sm text-sand/60">{brand.tagline} · PT-BR · © Abilar</p>
        </div>
      </footer>
    </div>
  );
}
