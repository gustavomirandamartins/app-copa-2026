import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "Copa 2026 — Acompanhe a Copa do Mundo",
  description: "Acompanhe todos os jogos, seleções, probabilidades e simulações da Copa do Mundo FIFA 2026 nos EUA, Canadá e México.",
  keywords: "Copa do Mundo 2026, FIFA, futebol, seleções, jogos, probabilidades, simulador",
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
    <html lang="pt-BR">
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
