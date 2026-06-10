import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Bolão da Mindu na Copa 2026",
  description: "Dê seus palpites, dispute o ranking e concorra aos prêmios MinduBier na Copa do Mundo FIFA 2026 nos EUA, Canadá e México.",
  keywords: "Copa do Mundo 2026, FIFA, futebol, seleções, jogos, probabilidades, bolão, MinduBier",
  openGraph: {
    title: "Bolão da Mindu na Copa 2026",
    description: "Palpites, ranking e prêmios MinduBier na Copa FIFA 2026",
    type: "website",
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
