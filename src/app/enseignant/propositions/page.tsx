import { Badge, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { POS_LABELS, formatDate } from "@/lib/utils";
import { reviewSubmissionAction } from "../actions";

export const metadata = { title: "Propositions de mots" };

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  await requireStaff();
  const supabase = await createClient();
  const status = sp.statut === "traitees" ? ["approved", "rejected"] : ["pending"];
  const { data } = await supabase.from("lexical_submissions").select("*, profiles!lexical_submissions_submitted_by_fkey(full_name, first_name)").in("status", status).order("created_at", { ascending: status[0] === "pending" }).limit(100);
  return (
    <div className="container-kd max-w-4xl py-8">
      <PageHeader title="Propositions de mots" description="Vérifiez chaque proposition (orthographe, sens, source) avant de la publier. N’acceptez pas une traduction incertaine : demandez des précisions dans le commentaire."
        actions={<div className="flex gap-1 rounded-lg bg-sand-300 p-1 text-sm"><a href="/enseignant/propositions" className={`rounded-md px-3 py-1 ${status[0] === "pending" ? "bg-white font-semibold" : ""}`}>En attente</a><a href="/enseignant/propositions?statut=traitees" className={`rounded-md px-3 py-1 ${status[0] !== "pending" ? "bg-white font-semibold" : ""}`}>Traitées</a></div>} />
      <Flash searchParams={sp} />
      {(data ?? []).length === 0 ? <EmptyState title={status[0] === "pending" ? "Aucune proposition en attente." : "Aucune proposition traitée."} /> : (
        <div className="space-y-4">
          {(data ?? []).map((s) => {
            const p = s.profiles as unknown as { full_name: string; first_name: string } | null;
            return (
              <Card key={s.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mnk text-2xl font-bold text-forest">{s.headword}</span>
                  <span className="text-lg">— {s.translation_fr}</span>
                  {s.part_of_speech && <Badge>{POS_LABELS[s.part_of_speech] ?? s.part_of_speech}</Badge>}
                  {s.status !== "pending" && <Badge tone={s.status === "approved" ? "green" : "red"}>{s.status === "approved" ? "Acceptée" : "Refusée"}</Badge>}
                </div>
                <dl className="mt-2 grid gap-1 text-sm text-ink-600">
                  {s.definition && <div><dt className="inline font-semibold">Définition : </dt><dd className="inline">{s.definition}</dd></div>}
                  {s.example_mandinka && <div><dt className="inline font-semibold">Exemple : </dt><dd className="mnk inline">{s.example_mandinka}</dd>{s.example_french && <> — « {s.example_french} »</>}</div>}
                  {s.regional_variant && <div><dt className="inline font-semibold">Variante : </dt><dd className="inline">{s.regional_variant}</dd></div>}
                  <div><dt className="inline font-semibold">Source déclarée : </dt><dd className="inline">{s.source_info}</dd></div>
                  <div className="text-xs text-ink-400">Proposé par {p?.full_name || p?.first_name || "un membre"} le {formatDate(s.created_at)}</div>
                  {s.review_notes && <div className="text-xs">Commentaire : {s.review_notes}</div>}
                </dl>
                {s.status === "pending" && (
                  <form action={reviewSubmissionAction} className="mt-3 space-y-2 border-t border-sand-300 pt-3">
                    <input type="hidden" name="submission_id" value={s.id} /><input type="hidden" name="back" value="/enseignant/propositions" />
                    <Input name="notes" placeholder="Commentaire pour le contributeur (facultatif)" aria-label="Commentaire" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publish" defaultChecked className="accent-forest" /> Publier immédiatement (sinon : brouillon à compléter dans l’administration du dictionnaire)</label>
                    <div className="flex gap-2">
                      <SubmitButton name="decision" value="approve" size="sm" pendingLabel="…">Accepter</SubmitButton>
                      <SubmitButton name="decision" value="reject" size="sm" variant="outline" pendingLabel="…">Refuser</SubmitButton>
                    </div>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
