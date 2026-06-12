import type { MetadataRoute } from 'next';

const base = process.env.APP_URL ?? 'https://abilar.com.br';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Áreas autenticadas/privadas não devem ser indexadas.
      disallow: ['/conta', '/pedidos', '/marceneiro', '/admin', '/conversas', '/contratos', '/notificacoes', '/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
