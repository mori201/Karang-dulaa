import Link from "next/link";
import { AuthShell } from "@/components/layout/AuthShell";
import { ResetRequestForm } from "@/components/AuthForms";

export const metadata = { title: "Mot de passe oublié" };

export default function ForgotPage() {
  return (
    <AuthShell title="Mot de passe oublié" subtitle="Nous vous envoyons un lien pour en choisir un nouveau."
      footer={<Link href="/connexion" className="link">Retour à la connexion</Link>}>
      <ResetRequestForm />
    </AuthShell>
  );
}
