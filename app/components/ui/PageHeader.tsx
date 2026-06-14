import { cn } from '@/lib/utils';

/**
 * Cabeçalho de página — título + descrição opcional + ação (ex.: botão "Novo").
 * Padroniza a hierarquia: h1 em text-h1, descrição em text-muted.
 */
export function PageHeader({
  title,
  description,
  action,
  back,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  back?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6', className)}>
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h1 font-semibold text-charcoal">{title}</h1>
          {description && <p className="mt-1 text-body text-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
