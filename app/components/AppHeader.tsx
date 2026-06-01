import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth/session';

/** Cabeçalho do app (full-width, sticky). Mostra navegação conforme login/papel. */
export async function AppHeader() {
  const profile = await getSessionProfile();
  const firstName = profile?.name?.split(' ')[0];

  return (
    <header className="sticky top-0 z-20 w-full border-b border-subtle bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="Abilar — início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/abilar-logo-horizontal.svg" alt="Abilar" className="h-8 w-auto" />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {profile ? (
            <>
              {profile.role === 'CLIENT' && (
                <Link
                  href="/pedidos"
                  className="rounded-md px-3 py-2 text-sm font-medium text-charcoal hover:bg-deep"
                >
                  Meus pedidos
                </Link>
              )}
              <Link
                href="/conta"
                className="flex items-center gap-2 rounded-pill bg-deep px-3 py-1.5 text-sm font-medium text-charcoal hover:bg-sand-deep"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
                  {(firstName ?? 'U').charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{firstName ?? 'Conta'}</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/entrar" className="rounded-md px-3 py-2 text-sm font-medium text-charcoal hover:bg-deep">
                Entrar
              </Link>
              <Link href="/cadastro" className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
