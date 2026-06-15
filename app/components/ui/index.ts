// Biblioteca de primitivas de UI do Abilar — fonte única de cartões, botões,
// cabeçalhos, estados vazios, selos, KPIs e campos. Use estas em vez de recriar
// classes Tailwind inline (evita drift de raio/padding/largura).
export { Button, buttonVariants } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';
export { Card } from './Card';
export { Page } from './Page';
export { PageHeader } from './PageHeader';
export { Section } from './Section';
export { EmptyState } from './EmptyState';
export { Badge } from './Badge';
export type { BadgeTone } from './Badge';
export { Stat } from './Stat';
export { Field, Input, inputClass } from './Field';
export { Lightbox, PhotoButton } from './Lightbox';
