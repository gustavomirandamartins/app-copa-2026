import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bolão MinduBier Copa 2026',
    short_name: 'Bolão Mindu',
    description: 'Palpites, classificação e prêmios MinduBier na Copa do Mundo FIFA 2026.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0814',
    theme_color: '#0a0814',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
