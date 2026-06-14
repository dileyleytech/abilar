import { cn } from '@/lib/utils';

const PAD = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' } as const;

/**
 * Cartão padrão — superfície branca, raio e sombra consistentes.
 * `interactive` adiciona realce de hover (use em cartões clicáveis/links).
 */
export function Card({
  pad = 'md',
  interactive = false,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  pad?: keyof typeof PAD;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-subtle bg-surface shadow-card',
        interactive && 'border-transparent transition hover:border-brand-primary/40 hover:shadow-raised',
        PAD[pad],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
