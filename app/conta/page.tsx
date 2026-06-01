import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Role } from '@abilar/shared';
import { getSessionProfile } from '@/lib/auth/session';
import { signOut } from '@/lib/auth/actions';

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="rounded-lg bg-surface p-6 shadow-sm">
        <p className="text-sm text-muted">Você entrou como</p>
        <p className="text-2xl font-bold text-charcoal">{ROLE_LABEL[profile.role]}</p>
        <dl className="mt-4 space-y-1 text-base text-charcoal">
          {profile.name && <div>{profile.name}</div>}
          {profile.phone && <div className="font-mono text-muted">{profile.phone}</div>}
          {profile.email && <div className="font-mono text-muted">{profile.email}</div>}
        </dl>
        {profile.role === 'CLIENT' && (
          <Link href="/pedidos" className="mt-4 inline-block font-medium text-brand underline">
            Ver meus pedidos →
          </Link>
        )}
        {profile.role !== 'CLIENT' && (
          <p className="mt-4 text-sm text-muted">
            {/* TODO(Fase 4+): feed do marceneiro / vitrine do arquiteto. */}
            Em breve: sua área de {ROLE_LABEL[profile.role].toLowerCase()}.
          </p>
        )}
      </div>

      <form action={signOut}>
        <button type="submit" className="w-full rounded-md border border-subtle px-5 py-4 text-lg font-medium text-charcoal">
          Sair
        </button>
      </form>
    </main>
  );
}
