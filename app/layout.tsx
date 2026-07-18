import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cap — Rien ne dérive.",
  description:
    "Cap — suivi et réconciliation des mails de service. Aucun mail sans trace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
