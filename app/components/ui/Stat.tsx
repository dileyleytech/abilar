import { cn } from '@/lib/utils';

/**
 * KPI / métrica — rótulo + valor em destaque + dica opcional.
 * Valor usa fonte mono (telas financeiras) quando `mono`.
 */
export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  mono = false,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'primary' | 'success' | 'danger';
  mono?: boolean;
  className?: string;
}) {
  const valueColor =
    tone === 'primary'
      ? 'text-brand-primary'
      : tone === 'success'
        ? 'text-brand-secondary'
        : tone === 'danger'
          ? 'text-danger'
          : 'text-charcoal';
  return (
    <div className={cn('rounded-lg border border-subtle bg-surface p-5 shadow-card', className)}>
      <p className="text-small text-muted">{label}</p>
      <p className={cn('mt-1 text-h2 font-semibold', mono && 'font-mono', valueColor)}>{value}</p>
      {hint && <p className="mt-1 text-caption text-subtle">{hint}</p>}
    </div>
  );
}
