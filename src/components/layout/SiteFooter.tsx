import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-forest-800 text-forest-100">
      <div className="h-2 bg-kd-pattern bg-gold/20" aria-hidden />
      <div className="container-kd grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo light />
          <p className="text-sm text-forest-200">Apprendre le mandinka, préserver notre héritage.</p>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-gold-200">Apprendre</h2>
          <ul className="space-y-1.5 text-sm">
            <li><Link className="hover:text-white" href="/academie">Académie des cours</Link></li>
            <li><Link className="hover:text-white" href="/dictionnaire">Dictionnaire mandinka-français</Link></li>
            <li><Link className="hover:text-white" href="/prononciation">Laboratoire de prononciation</Link></li>
            <li><Link className="hover:text-white" href="/cartes">Cartes mémoire</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-gold-200">Ressources</h2>
          <ul className="space-y-1.5 text-sm">
            <li><Link className="hover:text-white" href="/bibliotheque">Bibliothèque pédagogique</Link></li>
            <li><Link className="hover:text-white" href="/sources">Sources et conventions d’écriture</Link></li>
            <li><Link className="hover:text-white" href="/certificats/verifier">Vérifier un certificat</Link></li>
            <li><Link className="hover:text-white" href="/#faq">Questions fréquentes</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-gold-200">L’école</h2>
          <ul className="space-y-1.5 text-sm">
            <li><Link className="hover:text-white" href="/a-propos">À propos</Link></li>
            <li><Link className="hover:text-white" href="/confidentialite">Confidentialité</Link></li>
            <li><Link className="hover:text-white" href="/inscription">Créer un compte</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-forest-700">
        <p className="container-kd py-4 text-xs text-forest-300">
          © {new Date().getFullYear()} KARANG-DULAA. Les contenus linguistiques citent leurs sources ; les ouvrages de référence restent la propriété de leurs auteurs et éditeurs.
        </p>
      </div>
    </footer>
  );
}
