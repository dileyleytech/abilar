// Formatação BR. Dinheiro em centavos (BIGINT no backend) → R$.
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Dimensão física é mm (inteiro) no banco; a UI mostra em cm.
export function formatCm(mm: number): string {
  const cm = mm / 10;
  return `${Number.isInteger(cm) ? cm : cm.toFixed(1)} cm`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
