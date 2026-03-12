import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProductCheck — Analyse IA des avis produits",
  description: "Analysez n'importe quel produit grâce à l'IA : avis agrégés, points forts/faibles, score global.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
