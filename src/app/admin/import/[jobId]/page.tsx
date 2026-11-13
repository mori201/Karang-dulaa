import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Card, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { ORTHOGRAPHY_LABELS, POS_LABELS } from "@/lib/utils";
import { bulkApproveAction, commitImportAction, deleteImportJobAction, reviewImportItemAction } from "../../actions";

export const metadata = { title: "Vérification d’un import" };
const ST = { pending: ["À vérifier", "gold"], approved: ["Approuvé", "green"], rejected: ["Rejeté", "red"], imported: ["Enregistré", "blue"] } as const;

export default async function ImportJobPage({ params, searchParams }: { params: Promise<{ jobId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { jobId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: job } = await supabase.from("import_jobs").select("*, dictionary_sources(author, year, rights_status)").eq("id", jobId).maybeSingle();
  if (!job) notFound();
  const status = sp.statut && sp.statut in ST ? sp.statut : "pending";
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ data: items, count }, counts] = await Promise.all([
    supabase.from("import_items").select("*", { count: "exact" }).eq("job_id", jobId).eq("status", status).order("created_at").range((page - 1) * 25, page * 25 - 1),
    Promise.all(Object.keys(ST).map(async (k) => [k, (await supabase.from("import_items").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", k)).count ?? 0] as const)),
  ]);
  const cnt = Object.fromEntries(counts);
  const src = job.dictionary_sources as unknown as { author: string; year: number; rights_status: string } | null;
  const back = `/admin/import/${jobId}?statut=${status}&page=${page}`;
  const sections = (job.sections ?? []) as { title: string; page: string | null }[];

  return (
    <div className="container-kd py-8">
      <Link href="/admin/import" className="text-sm text-ink-500 hover:text-forest">← Imports</Link>
      <PageHeader title={job.filename} description={`${job.page_count ?? "?"} page(s) · ${(job.char_count ?? 0).toLocaleString("fr-FR")} caractères · ${ORTHOGRAPHY_LABELS[job.orthography] ?? job.orthography}${src ? ` · ${src.author} ${src.year}` : ""}`} />
      <Flash searchParams={sp} />
      {job.status === "failed" && <Alert tone="error" className="mb-4">L’extraction a échoué : {job.error}</Alert>}
      {src?.rights_status !== "verified" && <Alert tone="warning" className="mb-4">Droits de la source non vérifiés : enregistrez de préférence en brouillon ou « à valider ».</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <nav className="mb-4 flex flex-wrap gap-2">
            {Object.entries(ST).map(([k, [l]]) => <Link key={k} href={`/admin/import/${jobId}?statut=${k}`} className={`rounded-full px-3 py-1 text-sm font-semibold ${k === status ? "bg-forest text-white" : "bg-white ring-1 ring-sand-300"}`}>{l} ({cnt[k] ?? 0})</Link>)}
          </nav>
          <div className="space-y-3">
            {(items ?? []).map((it) => {
              const [l, t] = ST[it.status as keyof typeof ST];
              return (
                <Card key={it.id} className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs"><Badge tone={t}>{l}</Badge><Badge>p. {it.page ?? "?"}</Badge><Badge tone={it.confidence >= 0.8 ? "green" : it.confidence >= 0.5 ? "gold" : "red"}>Confiance {Math.round(it.confidence * 100)} %</Badge>
                    {it.entry_id && <Link className="link" href={`/admin/dictionnaire/${it.entry_id}`}>Voir l’entrée</Link>}</div>
                  <details className="mb-3 rounded-lg bg-sand-100 p-2 text-sm"><summary className="cursor-pointer text-xs font-semibold text-ink-500">Texte source (non modifié)</summary><p className="mnk mt-1 whitespace-pre-wrap">{it.raw_text}</p></details>
                  {it.status !== "imported" ? (
                    <form action={reviewImportItemAction} className="space-y-2">
                      <input type="hidden" name="item_id" value={it.id} /><input type="hidden" name="back" value={back} />
                      <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_140px_80px]">
                        <Input name="headword" defaultValue={it.headword ?? ""} placeholder="Mot" className="mnk font-semibold" aria-label="Mot" />
                        <Input name="translation_fr" defaultValue={it.translation_fr ?? ""} placeholder="Traduction" aria-label="Traduction" />
                        <Select name="part_of_speech" defaultValue={it.part_of_speech ?? ""} aria-label="Catégorie"><option value="">—</option>{Object.entries(POS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                        <Input name="page" defaultValue={it.page ?? ""} aria-label="Page" placeholder="p." />
                      </div>
                      <Textarea name="examples" defaultValue={(it.examples as { mandinka: string; french: string }[]).map((e) => `${e.mandinka} = ${e.french}`).join("\n")} className="mnk min-h-12 text-sm" aria-label="Exemples (mandinka = français)" />
                      <div className="flex gap-2">
                        <SubmitButton name="decision" value="approve" size="sm" pendingLabel="…">Approuver</SubmitButton>
                        <SubmitButton name="decision" value="save" size="sm" variant="outline" pendingLabel="…">Enregistrer</SubmitButton>
                        <SubmitButton name="decision" value="reject" size="sm" variant="ghost" pendingLabel="…">Rejeter</SubmitButton>
                      </div>
                    </form>
                  ) : <p className="mnk"><strong>{it.headword}</strong> — {it.translation_fr}</p>}
                </Card>
              );
            })}
            {(items ?? []).length === 0 && <p className="text-sm text-ink-500">Aucun élément dans cette catégorie.</p>}
          </div>
          {(count ?? 0) > 25 && <div className="mt-4 flex justify-center gap-4 text-sm">{page > 1 && <a className="link" href={`/admin/import/${jobId}?statut=${status}&page=${page - 1}`}>← Précédent</a>}<span>Page {page} / {Math.ceil((count ?? 0) / 25)}</span>{page * 25 < (count ?? 0) && <a className="link" href={`/admin/import/${jobId}?statut=${status}&page=${page + 1}`}>Suivant →</a>}</div>}
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="font-bold">Validation groupée</h2>
            <p className="mt-1 text-xs text-ink-500">Marque comme approuvés les candidats complets au-dessus d’un seuil de confiance. Relisez-les ensuite dans l’onglet « Approuvé ».</p>
            <form action={bulkApproveAction} className="mt-3 flex gap-2"><input type="hidden" name="job_id" value={jobId} />
              <Select name="min_confidence" defaultValue="0.8" aria-label="Seuil"><option value="0.9">≥ 90 %</option><option value="0.8">≥ 80 %</option><option value="0.6">≥ 60 %</option></Select>
              <SubmitButton size="sm" variant="secondary" pendingLabel="…">Approuver</SubmitButton></form>
          </Card>
          <Card>
            <h2 className="font-bold">Enregistrer dans le dictionnaire</h2>
            <p className="mt-1 text-xs text-ink-500">{cnt.approved ?? 0} élément(s) approuvé(s), rattaché(s) à leur source et à leur page. Les doublons sont ignorés.</p>
            <form action={commitImportAction} className="mt-3 space-y-2"><input type="hidden" name="job_id" value={jobId} />
              <Select name="status" defaultValue="draft" aria-label="Statut des entrées"><option value="draft">En brouillon</option><option value="pending_review">À valider</option><option value="published">Publiées</option></Select>
              <SubmitButton className="w-full" pendingLabel="Enregistrement…" confirm="Enregistrer les éléments approuvés dans le dictionnaire ?">Enregistrer</SubmitButton></form>
          </Card>
          {sections.length > 0 && (
            <Card>
              <h2 className="font-bold">Sections détectées</h2>
              <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto text-xs">{sections.map((s, i) => <li key={i}><span className="text-ink-400">p. {s.page ?? "?"}</span> {s.title}</li>)}</ul>
            </Card>
          )}
          <Card>
            <form action={deleteImportJobAction} className="space-y-2"><input type="hidden" name="job_id" value={jobId} />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="delete_file" className="accent-forest" /> Supprimer aussi le fichier source</label>
              <SubmitButton variant="ghost" size="sm" className="text-red-700" confirm="Supprimer cet import ?">Supprimer l’import</SubmitButton></form>
          </Card>
        </aside>
      </div>
    </div>
  );
}
