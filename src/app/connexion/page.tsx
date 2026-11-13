import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { SignInForm } from "@/components/AuthForms";
import { Flash } from "@/components/Flash";
import { getSessionUser } from "@/lib/auth";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (await getSessionUser()) redirect(safeNext(sp.suivant));
  return (
    <AuthShell title="Bon retour parmi nous" subtitle="Connectez-vous pour reprendre votre apprentissage."
      footer={<>Pas encore de compte ? <Link href="/inscription" className="link">Créer un compte gratuit</Link></>}>
      <Flash searchParams={sp} />
      <SignInForm next={sp.suivant} />
    </AuthShell>
  );
}
