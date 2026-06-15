'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { IconFechar } from './icons';

/** Modal de imagem (abre sem sair do sistema). Controlado por `url`. */
export function Lightbox({ url, alt = 'Foto', onClose }: { url: string | null; alt?: string; onClose: () => void }) {
  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [url, onClose]);

  if (!url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 p-4 print:hidden" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25">
        <IconFechar size={20} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className="max-h-[90vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

/** Miniatura clicável que abre a imagem em modal. Reutilizável. */
export function PhotoButton({ url, alt = 'Foto', className, imgClassName }: { url: string; alt?: string; className?: string; imgClassName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Abrir foto" className={cn('block overflow-hidden', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} className={cn('h-full w-full object-cover transition hover:opacity-90', imgClassName)} />
      </button>
      <Lightbox url={open ? url : null} alt={alt} onClose={() => setOpen(false)} />
    </>
  );
}
