import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-white shadow-card hover:brightness-95 active:brightness-90',
  secondary: 'bg-brand-secondary text-white shadow-card hover:brightness-95 active:brightness-90',
  ghost: 'text-charcoal hover:bg-deep',
  outline: 'border border-subtle bg-surface text-charcoal hover:bg-deep',
  danger: 'text-danger hover:bg-danger/10',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3 text-small',
  md: 'h-11 gap-2 px-4 text-body', // alvo ≥44px (acessibilidade)
  lg: 'h-12 gap-2.5 px-6 text-h3', // alvo ≥48dp — botão grande do marceneiro
};

/**
 * Classes do botão — reutilizável em `<Link>` ou `<button>`.
 * Ex.: <Link className={buttonVariants({ variant: 'primary' })}>…</Link>
 */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    'inline-flex items-center justify-center rounded-md font-medium transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-base',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button type={type} className={buttonVariants({ variant, size, className })} {...props} />;
}
