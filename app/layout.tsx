import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fio — dinheiro em perspectiva",
    template: "%s · Fio",
  },
  description: "Livro-caixa pessoal com captura automática, categorias, orçamentos e metas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
