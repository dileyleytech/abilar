import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Role } from '@abilar/shared';
import { getSessionProfile } from '@/lib/auth/session';
import { signOut } from '@/lib/auth/actions';
import { SetPasswordForm } from './_components/SetPasswordForm';
import { MeuPerfil } from './_components/MeuPerfil';

export const metadata = { title: 'Minha conta — Abilar' };

const ROLE_LABEL: Record<Role, string> = {
  CLIENT: 'Cliente',
  CARPENTER: 'Marceneiro',
  ARCHITECT: 'Arquiteto',
  ADMIN: 'Administrador',
};

export default async function ContaPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect('/entrar');
  const initial = (profile.name ?? 'U').charAt(0).toUpperCase();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-charcoal">Minha conta</h1>

      <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-subtle bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-xl font-bold text-white">
            {initial}
          </span>
          <div>
            <p className="text-xl font-bold text-charcoal">{profile.name ?? 'Sem nome'}</p>
            <span className="inline-block rounded-pill bg-brand-secondary/15 px-3 py-0.5 text-xs font-semibold text-brand-secondary">
              {ROLE_LABEL[profile.role]}
            </span>
          </div>
        </div>
        {profile.role === 'CLIENT' && (
          <Link href="/pedidos" className="shrink-0 font-medium text-brand-primary hover:underline">
            Meus pedidos →
          </Link>
        )}
        {profile.role === 'CARPENTER' && (
          <Link href="/marceneiro" className="shrink-0 font-medium text-brand-primary hover:underline">
            Minha área →
          </Link>
        )}
      </div>

      <div className="grid gap-4">
        <MeuPerfil name={profile.name} email={profile.email} phone={profile.phone} />
        <SetPasswordForm />

        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-2xl border border-subtle bg-surface px-5 py-4 text-lg font-medium text-charcoal shadow-sm transition hover:bg-deep"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
