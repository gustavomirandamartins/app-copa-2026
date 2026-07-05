import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do workspace no projeto. Sem isso, o Turbopack detecta
  // o package-lock.json perdido em ~/ e tenta varrer a home inteira,
  // travando o primeiro request. (import.meta.dirname = pasta deste config)
  turbopack: {
    root: import.meta.dirname,
  },
  experimental: {
    // Backup do banco (Central de controle → restaurar) envia todas as
    // tabelas de volta como argumento de Server Action — passa do limite
    // padrão de 1mb com ~1900 palpites.
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // <ViewTransition> do React (morph de elementos compartilhados entre
    // páginas + crossfade de navegação). Sem suporte do browser, degrada
    // para navegação normal sem animação. Docs: guia view-transitions.
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sdyilmgixyynnmczsnhc.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
