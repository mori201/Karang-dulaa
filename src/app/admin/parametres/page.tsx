import { Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { saveSettingsAction } from "../actions";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("key, value");
  const get = (k: string) => (data ?? []).find((d) => d.key === k)?.value as Record<string, unknown> | string[] | undefined;
  const site = (get("site") ?? {}) as Record<string, string>;
  const feat = (get("features") ?? {}) as Record<string, boolean>;
  const emails = (get("admin_bootstrap_emails") ?? []) as string[];
  const toggles = [
    ["ai_assistant", "Assistant DULAA AI"], ["leaderboard", "Classement entre apprenants"], ["lexical_submissions", "Propositions de mots par les utilisateurs"], ["recordings", "Conservation des enregistrements des apprenants"],
  ] as const;
  return (
    <div className="container-kd max-w-3xl py-8">
      <PageHeader title="Configuration de la plateforme" />
      <Flash searchParams={sp} />
      <Card>
        <form action={saveSettingsAction} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom du site"><Input name="site_name" defaultValue={site.name ?? "KARANG-DULAA"} /></Field>
            <Field label="E-mail de contact"><Input name="contact_email" type="email" defaultValue={site.contact_email ?? ""} /></Field>
          </div>
          <Field label="Slogan"><Input name="tagline" defaultValue={site.tagline ?? ""} /></Field>
          <fieldset><legend className="mb-2 text-sm font-semibold text-ink-600">Fonctionnalités</legend>
            <div className="space-y-2">{toggles.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name={k} defaultChecked={feat[k] !== false} className="accent-forest" /> {l}</label>)}</div>
          </fieldset>
          <Field label="E-mails d’amorçage administrateur" hint="Un compte créé avec l’une de ces adresses reçoit automatiquement le rôle administrateur. Videz cette liste une fois l’équipe constituée.">
            <Textarea name="admin_bootstrap_emails" defaultValue={emails.join("\n")} className="min-h-20 font-mono text-sm" />
          </Field>
          <SubmitButton>Enregistrer</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
