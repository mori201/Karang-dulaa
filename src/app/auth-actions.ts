"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { safeNext, str } from "@/lib/utils";
import { withFlash } from "@/lib/flash";

export type AuthState = { error?: string; ok?: string } | undefined;

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = str(formData.get("email")).toLowerCase();
  const password = str(formData.get("password"));
  if (!email || !password) return { error: "Renseignez votre e-mail et votre mot de passe." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) return { error: "Votre adresse e-mail n’est pas encore confirmée. Consultez votre boîte de réception." };
    return { error: "E-mail ou mot de passe incorrect." };
  }
  redirect(safeNext(str(formData.get("suivant"))));
}

const signUpSchema = z.object({
  first_name: z.string().min(1, "Indiquez votre prénom.").max(60),
  last_name: z.string().max(80),
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(72),
  consent: z.literal("on", { error: "Vous devez accepter la politique de confidentialité." }),
});

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    first_name: str(formData.get("first_name")),
    last_name: str(formData.get("last_name")),
    email: str(formData.get("email")).toLowerCase(),
    password: str(formData.get("password")),
    consent: formData.get("consent") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { first_name, last_name, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name, last_name }, emailRedirectTo: `${SITE_URL}/auth/callback?suivant=/tableau-de-bord` },
  });
  if (error) {
    if (/already|registered/i.test(error.message)) return { error: "Un compte existe déjà avec cette adresse." };
    if (/password/i.test(error.message)) return { error: "Mot de passe trop faible : utilisez au moins 8 caractères, avec lettres et chiffres." };
    return { error: "L’inscription n’a pas pu aboutir. Réessayez dans un instant." };
  }
  if (data.session) redirect("/tableau-de-bord?bienvenue=1");
  return { ok: "Compte créé ! Un e-mail de confirmation vient de vous être envoyé : cliquez sur le lien pour activer votre compte." };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = str(formData.get("email")).toLowerCase();
  if (!z.email().safeParse(email).success) return { error: "Adresse e-mail invalide." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/auth/callback?suivant=/reinitialiser` });
  // Réponse identique que le compte existe ou non (pas d'énumération des comptes)
  return { ok: "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = str(formData.get("password"));
  const confirm = str(formData.get("confirm"));
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (password !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Le lien a expiré ou le mot de passe est refusé. Recommencez la procédure." };
  redirect(withFlash("/profil", "ok", "Mot de passe mis à jour."));
}
