import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-deep text-muted',
  primary: 'bg-brand-primary/10 text-brand-primary',
  success: 'bg-brand-secondary/10 text-brand-secondary',
  warning: 'bg-ochre/25 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-sage/20 text-brand-secondary',
};

/** Selo/chip de status — tons semânticos consistentes. */
export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-caption font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
