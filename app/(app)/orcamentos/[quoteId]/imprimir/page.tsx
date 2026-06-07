import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatBRL } from '@abilar/shared';
import { requireUserId } from '@/lib/auth/session';
import { getQuoteForPrint } from '@/lib/quotes/queries';
import { MATERIAL_UNIT_LABEL } from '@/lib/labels';
import { backFrom } from '@/lib/nav';
import { PrintButton } from './_components/PrintButton';

export const metadata = { title: 'Orçamento — Abilar' };

const date = (d: Date) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default async function OrcamentoImprimirPage({
  params,
  searchParams,
}: {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { quoteId } = await params;
  const { from } = await searchParams;
  const userId = await requireUserId();
  const q = await getQuoteForPrint(quoteId, userId);
  if (!q) notFound();
  const back = backFrom(from, q.meIsClient ? `/pedidos/${q.projectId}` : `/marceneiro/pedidos/${q.projectId}`);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 print:py-0">
      {/* Barra de ações (some na impressão) */}
      <div className="mb-5 flex items-center justify-between gap-2 print:hidden">
        <Link href={back.href} className="text-sm text-muted hover:text-charcoal">
          {back.label}
        </Link>
        <PrintButton />
      </div>

      {/* Documento */}
      <article className="rounded-2xl border border-subtle bg-white p-8 text-charcoal shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b border-subtle pb-5">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/abilar-logo-horizontal.svg" alt="Abilar" className="h-8 w-auto" />
            <p className="mt-2 text-lg font-bold">Orçamento</p>
          </div>
          <div className="text-right text-sm text-muted">
            <p>Emitido em {date(q.createdAt)}</p>
            {q.validUntil && <p>Válido até {date(q.validUntil)}</p>}
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
            {q.projectCity && <p className="text-muted">{q.projectCity}</p>}
          </div>
        </section>

        <section className="mt-5">
          <p className="text-xs uppercase tracking-wide text-muted">Pedido</p>
          <p className="font-semibold">{q.projectTitle}</p>
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
                    <td className="py-1.5 text-right">
                      {it.qty} {MATERIAL_UNIT_LABEL[it.unit]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mt-6 rounded-xl bg-deep p-4 print:bg-transparent print:p-0">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted">Valores</p>
          <div className="flex items-baseline justify-between">
            <span className="font-medium">À vista (Pix ou boleto)</span>
            <span className="text-xl font-bold text-brand-primary">{formatBRL(q.avistaCents)}</span>
          </div>
          {q.parceladoCents != null && q.installmentValueCents != null && (
            <div className="mt-1 flex items-baseline justify-between text-muted">
              <span>No cartão, em até {q.clientInstallments}x</span>
              <span>
                {q.clientInstallments}× de <strong className="text-charcoal">{formatBRL(q.installmentValueCents)}</strong>{' '}
                ({formatBRL(q.parceladoCents)})
              </span>
            </div>
          )}
        </section>

        {q.note && (
          <section className="mt-5">
            <p className="text-xs uppercase tracking-wide text-muted">Observações</p>
            <p className="whitespace-pre-wrap text-sm">{q.note}</p>
          </section>
        )}

        <footer className="mt-8 border-t border-subtle pt-4 text-center text-xs text-muted">
          Pagamento protegido pela Abilar (escrow por evolução da obra). Combine tudo dentro da plataforma.
        </footer>
      </article>
    </main>
  );
}
