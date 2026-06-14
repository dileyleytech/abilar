import { cn } from '@/lib/utils';

/**
 * Estado vazio — nunca uma tela em branco (§doc Design).
 * Ícone + título + dica do próximo passo + ação opcional.
 * `icon` aceita um ReactNode (ícone lucide ou ilustração).
 */
export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-subtle bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-deep text-brand-primary">
          {icon}
        </div>
      )}
      <h3 className="text-h3 font-semibold text-charcoal">{title}</h3>
      {hint && <p className="mt-1 max-w-md text-body text-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
