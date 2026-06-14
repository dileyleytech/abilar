import { cn } from '@/lib/utils';

/** Classe base de input/select/textarea — reutilizável diretamente. */
export const inputClass =
  'w-full rounded-md border border-subtle bg-surface px-4 py-3 text-body text-charcoal placeholder:text-subtle ' +
  'focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:opacity-50';

/**
 * Campo de formulário — rótulo + controle + ajuda/erro.
 * Passe o input via children (mantém controle de value/onChange no chamador).
 */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-small font-medium text-charcoal">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-caption text-danger">{error}</p>
      ) : (
        hint && <p className="text-caption text-subtle">{hint}</p>
      )}
    </div>
  );
}

/** Input pronto, já com a classe base. */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}
