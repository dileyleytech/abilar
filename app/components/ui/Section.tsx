import { cn } from '@/lib/utils';

/**
 * Seção de conteúdo — título (h2) + descrição opcional + ação no canto.
 * Espaçamento vertical consistente entre seções de uma página.
 */
export function Section({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('mt-8 first:mt-0', className)}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="text-h2 font-semibold text-charcoal">{title}</h2>}
            {description && <p className="mt-0.5 text-small text-muted">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
