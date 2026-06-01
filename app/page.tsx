import Link from 'next/link';
import { brand } from '@abilar/shared/tokens';

// Página dummy da Fase 0 (validação de deploy ANTES de qualquer feature).
// O site institucional completo (§7.0) é construído na Fase 8.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-pill bg-brand-secondary/10 px-4 py-1 font-mono text-sm text-brand-secondary">
        Fase 0 · fundação no ar
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-charcoal sm:text-5xl">
        {brand.name}
      </h1>
      <p className="text-lg text-charcoal/70">{brand.tagline}</p>
      <p className="max-w-md text-muted">
        Você imagina, a <strong className="text-abi">ABI</strong> mostra, o marceneiro realiza — e o
        pagamento fica protegido por etapa.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/cadastro" className="rounded-md bg-brand-primary px-6 py-3 text-lg font-medium text-white">
          Criar conta
        </Link>
        <Link href="/entrar" className="rounded-md border border-subtle px-6 py-3 text-lg font-medium text-charcoal">
          Entrar
        </Link>
      </div>
    </main>
  );
}
