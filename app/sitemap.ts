import type { MetadataRoute } from 'next';

const base = process.env.APP_URL ?? 'https://abilar.com.br';

// Páginas públicas (institucional). Blog entra na Fase 10.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number }[] = [
    { path: '/', priority: 1 },
    { path: '/entrar', priority: 0.5 },
    { path: '/cadastro', priority: 0.8 },
    { path: '/arquitetos', priority: 0.7 },
  ];
  return routes.map((r) => ({ url: `${base}${r.path}`, changeFrequency: 'weekly', priority: r.priority }));
}
