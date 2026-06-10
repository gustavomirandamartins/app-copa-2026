import type { Metadata } from "next";
import { Nunito_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

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
  title: "Copa 2026 — Acompanhe a Copa do Mundo",
  description: "Acompanhe todos os jogos, seleções, probabilidades e simulações da Copa do Mundo FIFA 2026 nos EUA, Canadá e México.",
  keywords: "Copa do Mundo 2026, FIFA, futebol, seleções, jogos, probabilidades, bolão",
  openGraph: {
    title: "Copa 2026 — Acompanhe a Copa do Mundo",
    description: "Todos os jogos, seleções e probabilidades da Copa FIFA 2026",
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
        <Header />
        <main className="page-content">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
