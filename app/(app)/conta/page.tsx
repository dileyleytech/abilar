import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Role } from '@abilar/shared';
import { getSessionProfile } from '@/lib/auth/session';
import { signOut } from '@/lib/auth/actions';
import { Page, PageHeader, Card, Badge, Button } from '@/components/ui';
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
    <Page width="sm">
      <PageHeader title="Minha conta" />

      <Card className="mb-4 flex items-center justify-between gap-4" pad="lg">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-h3 font-bold text-white">
            {initial}
          </span>
          <div>
            <p className="text-h3 font-bold text-charcoal">{profile.name ?? 'Sem nome'}</p>
            <Badge tone="success">{ROLE_LABEL[profile.role]}</Badge>
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
      </Card>

      <div className="grid gap-4">
        <MeuPerfil name={profile.name} email={profile.email} phone={profile.phone} />
        <SetPasswordForm />

        <form action={signOut}>
          <Button type="submit" variant="outline" size="lg" className="w-full">
            Sair
          </Button>
        </form>
      </div>
    </Page>
  );
}
