import type { Metadata } from 'next';
import { font, brand } from '@abilar/shared/tokens';
import './globals.css';

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description:
    'Marketplace de marcenaria sob demanda. Você imagina, a ABI mostra, o marceneiro realiza — com pagamento protegido por etapa.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Fontes da marca (Poppins/Inter/JetBrains Mono) — href vem dos tokens. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={font.googleFontsHref} />
      </head>
      <body>{children}</body>
    </html>
  );
}
