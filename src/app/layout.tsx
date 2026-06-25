import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ParallaxBackground } from "@/components/layout/ParallaxBackground";

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-heading',
});

export const viewport: Viewport = {
  themeColor: '#0a0814',
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://copa.mindubier.com.br'
  ),
  title: "Bolão da Mindu na Copa 2026",
  description: "Dê seus palpites, dispute a classificação e concorra aos prêmios MinduBier na Copa do Mundo FIFA 2026 nos EUA, Canadá e México.",
  keywords: "Copa do Mundo 2026, FIFA, futebol, seleções, jogos, probabilidades, bolão, MinduBier",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Bolão Mindu',
  },
  openGraph: {
    title: "Bolão da Mindu na Copa 2026",
    description: "Palpites, classificação e prêmios MinduBier na Copa FIFA 2026",
    type: "website",
    siteName: "Bolão MinduBier Copa 2026",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bolão da Mindu na Copa 2026",
    description: "Palpites, classificação e prêmios MinduBier na Copa FIFA 2026",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${nunitoSans.variable} ${outfit.variable}`}>
      <body>
        <div className="app-bg" aria-hidden="true" />
        <ParallaxBackground />
        <Header />
        <main className="page-content">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
