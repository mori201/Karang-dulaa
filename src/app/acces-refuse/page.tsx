import { ShieldAlert } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";

export const metadata = { title: "Accès refusé" };

export default function Forbidden() {
  return (
    <div className="container-kd max-w-xl py-16">
      <EmptyState icon={<ShieldAlert className="h-12 w-12" />} title="Accès refusé" description="Cet espace est réservé à un autre rôle (enseignant ou administrateur). Si vous pensez qu’il s’agit d’une erreur, contactez l’administration."
        action={<ButtonLink href="/tableau-de-bord">Retour à mon tableau de bord</ButtonLink>} />
    </div>
  );
}
