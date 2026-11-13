import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { NewPasswordForm } from "@/components/AuthForms";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Nouveau mot de passe" };

export default async function ResetPage() {
  if (!(await getSessionUser())) redirect("/mot-de-passe-oublie");
  return (
    <AuthShell title="Choisir un nouveau mot de passe">
      <NewPasswordForm />
    </AuthShell>
  );
}
