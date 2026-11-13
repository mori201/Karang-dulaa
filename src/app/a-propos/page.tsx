import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "À propos" };

export default function AboutPage() {
  return (
    <div className="container-kd max-w-3xl py-8">
      <PageHeader eyebrow="L’école" title="À propos de KARANG-DULAA" />
      <Card className="prose max-w-none prose-headings:text-forest">
        <p><strong>KARANG-DULAA</strong> est une école virtuelle dédiée à l’apprentissage, à la documentation et à la transmission de la langue mandinka, en Afrique et dans la diaspora.</p>
        <h2>Nos principes</h2>
        <ul>
          <li><strong>Des sources citées</strong> : chaque donnée linguistique est rattachée à son ouvrage et à sa page.</li>
          <li><strong>La validation humaine</strong> : enseignants et locuteurs compétents valident les contenus et les propositions de la communauté.</li>
          <li><strong>L’honnêteté</strong> : l’assistant DULAA AI distingue ce qui est documenté de ce qui est suggéré ; le laboratoire de prononciation ne prétend pas noter automatiquement votre prononciation.</li>
          <li><strong>Le respect des droits</strong> : les ouvrages importés restent privés tant que leur diffusion n’est pas autorisée.</li>
          <li><strong>L’accessibilité</strong> : une application légère, pensée d’abord pour le téléphone et les connexions limitées.</li>
        </ul>
        <h2>Feuille de route</h2>
        <p>Disponibles aujourd’hui : cours, dictionnaire, exercices, évaluations, certificats, laboratoire audio, cartes mémoire, bibliothèque, assistant DULAA AI. Prévus ultérieurement (non disponibles) : application mobile native, mode hors connexion, cours en direct et communauté d’apprenants élargie.</p>
      </Card>
    </div>
  );
}
