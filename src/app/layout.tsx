import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SITE_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "KARANG-DULAA — L’école virtuelle de la langue mandinka", template: "%s · KARANG-DULAA" },
  description:
    "Apprenez à parler, comprendre, lire et écrire le mandinka à votre rythme : cours structurés, dictionnaire mandinka-français sourcé, exercices, prononciation et assistant pédagogique.",
  openGraph: { title: "KARANG-DULAA", description: "Apprendre le mandinka, préserver notre héritage.", locale: "fr_FR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#126B4B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
          Aller au contenu
        </a>
        <SiteHeader />
        <main id="contenu" className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
