'use client';

import { Button } from '@/components/ui';
import { IconImprimir } from '@/components/ui/icons';

/** Aciona a impressão do navegador (Salvar como PDF). Some na própria impressão. */
export function PrintButton() {
  return (
    <Button variant="primary" onClick={() => window.print()} className="print:hidden">
      <IconImprimir size={20} aria-hidden /> Salvar / Imprimir PDF
    </Button>
  );
}
