'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/** Boundary da área logada: mostra um erro recuperável em vez de derrubar a tela.
 *  Em dev também exibe a mensagem para facilitar o diagnóstico. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('AppError boundary:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-5xl" aria-hidden>🪛</span>
      <h1 className="text-xl font-bold text-charcoal">Algo deu errado por aqui</h1>
      <p className="text-muted">Tente de novo. Se continuar, recarregue a página.</p>
      {process.env.NODE_ENV !== 'production' && (
        <pre className="max-w-full overflow-auto rounded-lg bg-deep p-3 text-left text-xs text-charcoal">
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ''}
        </pre>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Tentar de novo
        </button>
        <Link href="/" className="rounded-xl border border-subtle px-5 py-3 text-sm font-semibold text-charcoal">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
