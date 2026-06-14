import Link from 'next/link';
import type { Category } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getCarpenterProfile } from '@/lib/carpenter/profile';
import { Page, PageHeader } from '@/components/ui';
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
        serviceLat: c.serviceLat != null ? Number(c.serviceLat) : null,
        serviceLng: c.serviceLng != null ? Number(c.serviceLng) : null,
        categories: c.categories as Category[],
        bio: c.bio ?? '',
      }
    : undefined;

  return (
    <Page width="sm">
      <PageHeader
        title={initial ? 'Editar cadastro' : 'Complete seu cadastro'}
        back={
          <Link href="/marceneiro" className="text-small text-muted hover:underline">
            ← Minha área
          </Link>
        }
      />
      <CarpenterProfileForm initial={initial} />
    </Page>
  );
}
