import Link from 'next/link';
import { requireRole } from '@/lib/auth/session';
import { getCarpenterProfile } from '@/lib/carpenter/profile';
import { getCarpenterFeed, getCarpenterQuotedProjects } from '@/lib/carpenter/feed';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { Page, PageHeader, EmptyState, buttonVariants } from '@/components/ui';
import { IconCustos } from '@/components/ui/icons';
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
    <Page width="full">
      <PageHeader
        title={`Olá, ${carpenter?.name ?? profile.name ?? 'marceneiro'} 👋`}
        action={
          carpenter && (
            <Link href="/marceneiro/catalogo" className={`${buttonVariants({ variant: 'outline' })} inline-flex items-center gap-2`}>
              <IconCustos size={18} aria-hidden /> Meu catálogo
            </Link>
          )
        }
      />

      {!carpenter ? (
        <EmptyState
          icon={<span className="text-4xl" aria-hidden>🪚</span>}
          title="Complete seu cadastro"
          hint="Pra receber pedidos da sua região, conte onde você atende e o que você faz."
          action={
            <Link href="/marceneiro/perfil" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              Completar cadastro
            </Link>
          }
        />
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
    </Page>
  );
}
