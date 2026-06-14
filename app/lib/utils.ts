import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Registra nossas classes de tipografia semântica (tokens.ts → preset) como
// FONT-SIZE no tailwind-merge. Sem isso, ele trata `text-body`/`text-h3` como
// cor de texto e descarta o `text-white` que vem antes (botão fica com texto preto).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'h1', 'h2', 'h3', 'body', 'small', 'caption'] }],
    },
  },
});

/** cn — utilitário padrão do shadcn/ui para compor classes Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
