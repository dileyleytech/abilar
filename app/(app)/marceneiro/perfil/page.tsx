import Link from 'next/link';
import type { Category } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getCarpenterProfile } from '@/lib/carpenter/profile';
import { CarpenterProfileForm, type CarpenterFormInitial } from '../_components/CarpenterProfileForm';

export const metadata = { title: 'Meu cadastro — Marceneiro Abilar' };

export default async function CarpenterPerfilPage() {
  const profile = await requireRole('CARPENTER');
  const c = await getCarpenterProfile(profile.id);

  const initial: CarpenterFormInitial | undefined = c
    ? {
        personType: c.personType,
        name: c.name,
        companyName: c.companyName ?? '',
        cnpjOrCpf: c.cnpjOrCpf,
        serviceCity: c.serviceCity,
        serviceCep: c.serviceCep,
        serviceRadiusKm: String(c.serviceRadiusKm),
        categories: c.categories as Category[],
        bio: c.bio ?? '',
      }
    : undefined;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/marceneiro" className="text-sm text-muted hover:text-charcoal">
        ← Minha área
      </Link>
      <h1 className="mt-3 mb-6 text-2xl font-bold text-charcoal sm:text-3xl">
        {initial ? 'Editar cadastro' : 'Complete seu cadastro'}
      </h1>
      <CarpenterProfileForm initial={initial} />
    </main>
  );
}
