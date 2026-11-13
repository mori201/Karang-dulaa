import { Compass } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="container-kd max-w-xl py-16">
      <EmptyState icon={<Compass className="h-12 w-12" />} title="Page introuvable" description="Cette page n’existe pas ou a été déplacée."
        action={<div className="flex gap-2"><ButtonLink href="/">Accueil</ButtonLink><ButtonLink href="/dictionnaire" variant="outline">Dictionnaire</ButtonLink></div>} />
    </div>
  );
}
