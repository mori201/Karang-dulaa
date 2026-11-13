import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <div className="container-kd max-w-3xl py-8">
      <PageHeader title="Politique de confidentialité" />
      <Card className="prose max-w-none">
        <h2>Données collectées</h2>
        <ul>
          <li>Compte : prénom, nom, adresse e-mail, mot de passe (chiffré par notre prestataire d’authentification).</li>
          <li>Apprentissage : inscriptions, progression, temps passé sur les leçons, réponses aux exercices, notes, badges, certificats.</li>
          <li>Contributions : propositions de mots, questions, devoirs, témoignages.</li>
          <li>Enregistrements vocaux : uniquement si vous y consentez explicitement ; ils restent privés et supprimables à tout moment.</li>
          <li>Assistant DULAA AI : vos messages sont transmis à un fournisseur de modèle de langage pour générer la réponse et conservés dans votre historique.</li>
        </ul>
        <h2>Utilisation</h2>
        <p>Ces données servent uniquement à faire fonctionner l’école : suivi pédagogique, certificats, notifications. Elles ne sont ni vendues ni utilisées à des fins publicitaires. Vos enseignants voient la progression et les résultats des cours qu’ils encadrent.</p>
        <h2>Vos droits</h2>
        <p>Vous pouvez modifier vos informations depuis votre profil et supprimer votre compte à tout moment (rubrique « Supprimer mon compte »), ce qui efface vos données personnelles.</p>
        <h2>Sécurité</h2>
        <p>Les accès sont contrôlés par rôle (apprenant, enseignant, administrateur) au niveau de la base de données. Les fichiers privés ne sont accessibles que par des liens temporaires.</p>
      </Card>
    </div>
  );
}
