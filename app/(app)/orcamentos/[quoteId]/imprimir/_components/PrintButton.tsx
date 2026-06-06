'use client';

/** Aciona a impressão do navegador (Salvar como PDF). Some na própria impressão. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 print:hidden"
    >
      🖨️ Salvar / Imprimir PDF
    </button>
  );
}
