import { cookies } from 'next/headers';
import { activeArchitectBriefByCode } from '@/lib/architects/queries';
import { IconArquitetos } from '@/components/ui/icons';

/** Mostra "Indicado por X" quando há um código de indicação no cookie (link do
 *  arquiteto). Server component — resolve o nome do arquiteto ativo. */
export async function ReferredBanner() {
  const code = (await cookies()).get('abilar_ref')?.value;
  if (!code) return null;
  const arch = await activeArchitectBriefByCode(code);
  if (!arch) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-sage/15 px-4 py-3 text-center text-sm text-charcoal">
      <IconArquitetos size={16} aria-hidden /> Indicado por <strong>{arch.name}</strong>
    </div>
  );
}
