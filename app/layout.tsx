import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Cendres — Votre personnage, chaque détail",
  description:
    "Fiches de personnages soulslike. Ressources, équipement, grimoire et campagnes dans une interface compacte.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
