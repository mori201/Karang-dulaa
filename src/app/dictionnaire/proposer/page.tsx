import { Badge, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { POS_LABELS, formatDate } from "@/lib/utils";
import { submitWordAction } from "../actions";

export const metadata = { title: "Proposer un mot" };

const STATUS = { pending: ["En attente", "gold"], approved: ["Acceptée", "green"], rejected: ["Non retenue", "red"] } as const;

export default async function ProposePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/dictionnaire/proposer");
  const supabase = await createClient();
  const { data: mine } = await supabase.from("lexical_submissions").select("id, headword, translation_fr, status, review_notes, created_at, created_entry_id").eq("submitted_by", user.id).order("created_at", { ascending: false }).limit(30);

  return (
    <div className="container-kd max-w-3xl py-8">
      <PageHeader eyebrow="Dictionnaire collaboratif" title="Proposer un mot"
        description="Votre proposition sera vérifiée par un enseignant ou un administrateur avant d’être publiée. Écrivez le mot tel qu’il se prononce dans votre parler et indiquez votre source." />
      <Flash searchParams={sp} />
      <Card>
        <form action={submitWordAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mot mandinka" htmlFor="headword" required><Input id="headword" name="headword" defaultValue={sp.mot} required maxLength={120} className="mnk" /></Field>
            <Field label="Traduction française" htmlFor="translation_fr" required><Input id="translation_fr" name="translation_fr" required maxLength={500} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie grammaticale" htmlFor="part_of_speech">
              <Select id="part_of_speech" name="part_of_speech" defaultValue="">
                <option value="">Je ne sais pas</option>
                {Object.entries(POS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Variante régionale" htmlFor="regional_variant" hint="Ex. : parler de Sédhiou, de Gambie…"><Input id="regional_variant" name="regional_variant" maxLength={200} /></Field>
          </div>
          <Field label="Définition ou précisions" htmlFor="definition"><Textarea id="definition" name="definition" maxLength={2000} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Exemple en mandinka" htmlFor="example_mandinka"><Input id="example_mandinka" name="example_mandinka" maxLength={500} className="mnk" /></Field>
            <Field label="Traduction de l’exemple" htmlFor="example_french"><Input id="example_french" name="example_french" maxLength={500} /></Field>
          </div>
          <Field label="Source de l’information" htmlFor="source_info" required hint="Locuteur (avec son accord), région, ouvrage et page…"><Input id="source_info" name="source_info" required minLength={3} maxLength={500} /></Field>
          <SubmitButton pendingLabel="Envoi…">Envoyer ma proposition</SubmitButton>
        </form>
      </Card>
      {(mine ?? []).length > 0 && (
        <Card className="mt-8">
          <h2 className="font-bold">Mes propositions</h2>
          <ul className="mt-3 divide-y divide-sand-300">
            {(mine ?? []).map((m) => {
              const [label, tone] = STATUS[m.status as keyof typeof STATUS];
              return (
                <li key={m.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span><span className="mnk font-bold">{m.headword}</span> — {m.translation_fr}</span>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                  <div className="text-xs text-ink-400">{formatDate(m.created_at)}</div>
                  {m.review_notes && <p className="mt-1 text-sm text-ink-600">Commentaire : {m.review_notes}</p>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
