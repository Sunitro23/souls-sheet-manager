import { captureOwlbearReady } from "../lib/obr/handshake";
import type { Metadata } from "next";
import "./globals.css";
import "./v2.css";
import "./fantasy.css";
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' as const };
export const metadata: Metadata = {
  title: "Cendres",
  description:
    "Fiches de personnages soulslike. Ressources, équipement, grimoire et campagnes dans une interface compacte.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><script dangerouslySetInnerHTML={{ __html: captureOwlbearReady }}/></head>
      <body>{children}</body>
    </html>
  );
}
