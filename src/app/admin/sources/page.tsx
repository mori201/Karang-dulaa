import { Badge, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import type { DictionarySource } from "@/lib/types";
import { saveSourceAction } from "../actions";

export const metadata = { title: "Sources documentaires" };

function SourceFields({ s }: { s?: DictionarySource }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_100px]">
        <Field label="Titre"><Input name="title" defaultValue={s?.title} required /></Field>
        <Field label="Auteur"><Input name="author" defaultValue={s?.author} required /></Field>
        <Field label="Année"><Input name="year" type="number" defaultValue={s?.year ?? ""} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Éditeur"><Input name="publisher" defaultValue={s?.publisher ?? ""} /></Field>
        <Field label="URL"><Input name="url" defaultValue={s?.url ?? ""} /></Field>
      </div>
      <Field label="Conventions de notation (tons, voyelles longues, nasales…)"><Textarea name="orthography_notes" defaultValue={s?.orthography_notes ?? ""} className="min-h-20" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Droits"><Select name="rights_status" defaultValue={s?.rights_status ?? "to_verify"}><option value="to_verify">À vérifier</option><option value="verified">Vérifiés (autorisation obtenue)</option><option value="restricted">Diffusion restreinte</option></Select></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="public_display" defaultChecked={s?.public_display} className="accent-forest" /> Afficher ses entrées aux visiteurs non connectés</label>
      </div>
      <Field label="Notes sur les droits"><Textarea name="rights_notes" defaultValue={s?.rights_notes ?? ""} className="min-h-16" /></Field>
    </div>
  );
}

export default async function SourcesAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("dictionary_sources").select("*").order("year");
  return (
    <div className="container-kd max-w-4xl py-8">
      <PageHeader title="Sources documentaires" description="Chaque donnée linguistique est rattachée à une source. L’affichage public d’une source exige des droits vérifiés." />
      <Flash searchParams={sp} />
      <div className="space-y-4">
        {((data ?? []) as DictionarySource[]).map((s) => (
          <Card key={s.id}>
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-2"><span className="font-bold">{s.author} ({s.year}) — {s.title}</span>
                <Badge tone={s.rights_status === "verified" ? "green" : s.rights_status === "restricted" ? "red" : "gold"}>{s.rights_status === "verified" ? "Droits vérifiés" : s.rights_status === "restricted" ? "Restreinte" : "Droits à vérifier"}</Badge>
                {s.public_display && <Badge tone="blue">Publique</Badge>}</summary>
              <form action={saveSourceAction} className="mt-4 space-y-3"><input type="hidden" name="source_id" value={s.id} /><SourceFields s={s} /><SubmitButton size="sm">Enregistrer</SubmitButton></form>
            </details>
          </Card>
        ))}
        <Card className="border-2 border-dashed border-forest-200">
          <h2 className="font-bold">Nouvelle source</h2>
          <form action={saveSourceAction} className="mt-3 space-y-3"><SourceFields /><SubmitButton size="sm">Ajouter</SubmitButton></form>
        </Card>
      </div>
    </div>
  );
}
