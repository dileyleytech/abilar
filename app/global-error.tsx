'use client';

/** Último recurso: erro no layout raiz. Precisa renderizar <html>/<body>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Algo deu errado</h1>
        <p style={{ color: '#666' }}>Recarregue a página. Se continuar, fale com o suporte.</p>
        {process.env.NODE_ENV !== 'production' && (
          <pre style={{ textAlign: 'left', overflow: 'auto', background: '#f3f3f3', padding: 12, borderRadius: 8 }}>
            {error.message}
          </pre>
        )}
        <button type="button" onClick={reset} style={{ marginTop: 12, padding: '10px 18px', borderRadius: 10 }}>
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
