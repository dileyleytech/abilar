import { cn } from '@/lib/utils';

type Width = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const WIDTH: Record<Width, string> = {
  sm: 'max-w-content-sm', // formulários, conta (1 coluna)
  md: 'max-w-content',    // detalhe, leitura, chat
  lg: 'max-w-content-lg', // dashboards, listas
  xl: 'max-w-content-xl', // grids largos
  full: 'max-w-none',     // 100% da largura disponível (telas densas)
};

/**
 * Contêiner padrão de página — largura e padding consistentes entre todas as telas.
 * `full` ocupa toda a largura disponível; tiers menores contêm o conteúdo
 * (formulários/leitura) para preservar a legibilidade.
 */
export function Page({
  width = 'lg',
  className,
  children,
}: {
  width?: Width;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 sm:py-8', WIDTH[width], className)}>
      {children}
    </main>
  );
}
