import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do workspace no projeto. Sem isso, o Turbopack detecta
  // o package-lock.json perdido em ~/ e tenta varrer a home inteira,
  // travando o primeiro request. (import.meta.dirname = pasta deste config)
  turbopack: {
    root: import.meta.dirname,
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
