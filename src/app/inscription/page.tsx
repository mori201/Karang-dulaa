import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { SignUpForm } from "@/components/AuthForms";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignUpPage() {
  if (await getSessionUser()) redirect("/tableau-de-bord");
  return (
    <AuthShell title="Commencer à apprendre" subtitle="Créez votre compte apprenant gratuit."
      footer={<>Déjà inscrit(e) ? <Link href="/connexion" className="link">Se connecter</Link></>}>
      <SignUpForm />
    </AuthShell>
  );
}
