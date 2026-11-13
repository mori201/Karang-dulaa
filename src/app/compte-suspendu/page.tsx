import { UserX } from "lucide-react";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Compte suspendu" };

export default function Suspended() {
  return (
    <div className="container-kd max-w-xl py-16">
      <EmptyState icon={<UserX className="h-12 w-12" />} title="Compte suspendu" description="Votre compte a été suspendu par l’administration. Contactez l’équipe de KARANG-DULAA pour plus d’informations." />
    </div>
  );
}
