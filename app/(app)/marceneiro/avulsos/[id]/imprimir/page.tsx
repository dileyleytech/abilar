import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatBRL } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getExternalQuoteForPrint } from '@/lib/external-quotes/queries';
import { PrintButton } from '@/(app)/orcamentos/[quoteId]/imprimir/_components/PrintButton';

export const metadata = { title: 'Orçamento avulso — Abilar' };

const date = (d: Date) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default async function AvulsoImprimirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('CARPENTER');
  const q = await getExternalQuoteForPrint(id, profile.id);
  if (!q) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 print:py-0">
      <div className="mb-5 flex items-center justify-between gap-2 print:hidden">
        <Link href="/marceneiro/avulsos" className="text-sm text-muted hover:text-charcoal">← Orçamentos avulsos</Link>
        <PrintButton />
      </div>

      <article className="rounded-2xl border border-subtle bg-white p-8 text-charcoal shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b border-subtle pb-5">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/abilar-logo-horizontal.svg" alt="Abilar" className="h-8 w-auto" />
            <p className="mt-2 text-lg font-bold">Orçamento</p>
          </div>
          <div className="text-right text-sm text-muted">
            <p>Emitido em {date(q.createdAt)}</p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Marceneiro</p>
            <p className="font-semibold">{q.carpenterName}</p>
            {q.carpenterCompany && <p className="text-muted">{q.carpenterCompany}</p>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Cliente</p>
            <p className="font-semibold">{q.clientName}</p>
          </div>
        </section>

        <section className="mt-5">
          <p className="text-xs uppercase tracking-wide text-muted">Serviço</p>
          <p className="font-semibold">{q.title}</p>
        </section>

        {q.items.length > 0 && (
          <section className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted">Itens inclusos</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle text-left text-muted">
                  <th className="py-1 font-medium">Descrição</th>
                  <th className="py-1 text-right font-medium">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((it, i) => (
                  <tr key={i} className="border-b border-subtle/60">
                    <td className="py-1.5">{it.name}</td>
                    <td className="py-1.5 text-right">{it.qty} {it.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mt-6 flex items-center justify-between border-t border-subtle pt-4">
          <p className="text-sm uppercase tracking-wide text-muted">Total</p>
          <p className="text-2xl font-bold">{formatBRL(q.valueCents)}</p>
        </section>

        {q.note && (
          <section className="mt-5">
            <p className="text-xs uppercase tracking-wide text-muted">Observação</p>
            <p className="text-sm">{q.note}</p>
          </section>
        )}

        <footer className="mt-8 border-t border-subtle pt-4 text-xs text-muted">
          Orçamento gerado pela Abilar · gestão do marceneiro.
        </footer>
      </article>
    </main>
  );
}
