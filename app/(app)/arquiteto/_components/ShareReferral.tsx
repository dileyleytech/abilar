'use client';

import { useState } from 'react';
import { IconCopiar, IconCompartilhar, IconConcluido } from '@/components/ui/icons';

/** Mostra o link de indicação do arquiteto com botão copiar/compartilhar. */
export function ShareReferral({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== 'undefined' ? `${window.location.origin}/r/${code}` : `/r/${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponível */
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Abilar', text: 'Faça seu projeto comigo na Abilar', url: link });
        return;
      } catch {
        /* cancelado */
      }
    }
    copy();
  };

  return (
    <div className="rounded-2xl bg-brand-secondary p-5 text-sand">
      <h2 className="font-heading text-lg font-bold">Seu link de indicação</h2>
      <p className="mt-1 text-sm text-sand/90">Compartilhe com seus clientes. Quem criar o pedido por esse link fica vinculado a você e gera sua comissão.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={link} className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-sand outline-none" onFocus={(e) => e.currentTarget.select()} />
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-brand-secondary transition hover:opacity-90">{copied ? <><IconConcluido size={18} aria-hidden /> Copiado</> : <><IconCopiar size={18} aria-hidden /> Copiar</>}</button>
          <button type="button" onClick={share} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/40 px-4 py-3 text-sm font-semibold text-sand transition hover:bg-white/10"><IconCompartilhar size={18} aria-hidden /> Compartilhar</button>
        </div>
      </div>
      <p className="mt-2 text-xs text-sand/80">Código: <span className="font-mono">{code}</span></p>
    </div>
  );
}
