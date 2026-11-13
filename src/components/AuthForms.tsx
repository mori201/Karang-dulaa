"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/app/auth-actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="suivant" value={next ?? ""} />
      <Field label="Adresse e-mail" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Mot de passe" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      <div className="text-right text-sm"><Link href="/mot-de-passe-oublie" className="link">Mot de passe oublié ?</Link></div>
      <SubmitButton className="w-full" size="lg" pendingLabel="Connexion…">Se connecter</SubmitButton>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUp, undefined);
  if (state?.ok) return <Alert tone="success">{state.ok}</Alert>;
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="first_name" required><Input id="first_name" name="first_name" autoComplete="given-name" required maxLength={60} /></Field>
        <Field label="Nom" htmlFor="last_name"><Input id="last_name" name="last_name" autoComplete="family-name" maxLength={80} /></Field>
      </div>
      <Field label="Adresse e-mail" htmlFor="email" required><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Mot de passe" htmlFor="password" hint="Au moins 8 caractères." required>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <label className="flex items-start gap-2 text-sm text-ink-600">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-forest" />
        <span>J’accepte la <Link href="/confidentialite" className="link" target="_blank">politique de confidentialité</Link> et l’utilisation de mes données pour suivre ma progression.</span>
      </label>
      <SubmitButton className="w-full" size="lg" pendingLabel="Création du compte…">Créer mon compte</SubmitButton>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.ok}</Alert>}
      <Field label="Adresse e-mail" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <SubmitButton className="w-full" pendingLabel="Envoi…">Recevoir un lien de réinitialisation</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Nouveau mot de passe" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
      <Field label="Confirmer le mot de passe" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required /></Field>
      <SubmitButton className="w-full">Enregistrer</SubmitButton>
    </form>
  );
}
