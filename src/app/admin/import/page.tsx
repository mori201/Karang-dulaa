import Link from "next/link";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { ImportUploader } from "@/components/admin/ImportUploader";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Import documentaire" };
export const maxDuration = 300;

const ST = { uploaded: "Envoyé", extracted: "Extrait", reviewing: "En vérification", completed: "Terminé", failed: "Échec" } as Record<string, string>;

export default async function ImportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: sources }, { data: jobs }] = await Promise.all([
    supabase.from("dictionary_sources").select("id, author, year, title"),
    supabase.from("import_jobs").select("id, filename, status, page_count, created_at, error, import_items(count)").order("created_at", { ascending: false }).limit(30),
  ]);
  return (
    <div className="container-kd max-w-5xl py-8">
      <PageHeader title="Importation intelligente de documents" description="Extraction du texte, repérage des sections et des entrées lexicales, rattachement aux pages — puis vérification humaine avant tout enregistrement." />
      <Flash searchParams={sp} />
      <Alert tone="warning" className="mb-6">
        Les fichiers importés sont conservés dans une bibliothèque <strong>privée</strong> (administrateurs uniquement). L’import d’un ouvrage ne vaut pas autorisation de le diffuser :
        vérifiez les droits (page « Sources ») avant de publier des entrées. Le texte des entrées n’est jamais modifié automatiquement ; seules vos corrections manuelles s’appliquent.
      </Alert>
      <Card><ImportUploader sources={sources ?? []} /></Card>
      <h2 className="mb-3 mt-8 font-bold">Imports</h2>
      <div className="overflow-x-auto rounded-2xl border border-sand-300 bg-white">
        <table className="table-kd">
          <thead><tr><th>Fichier</th><th>Statut</th><th>Pages</th><th>Candidats</th><th>Date</th></tr></thead>
          <tbody>{(jobs ?? []).map((j) => (
            <tr key={j.id}><td><Link className="link" href={`/admin/import/${j.id}`}>{j.filename}</Link>{j.error && <div className="text-xs text-red-700">{j.error}</div>}</td>
              <td><Badge tone={j.status === "failed" ? "red" : j.status === "completed" ? "green" : "gold"}>{ST[j.status]}</Badge></td>
              <td>{j.page_count ?? "—"}</td><td>{(j.import_items as unknown as { count: number }[])?.[0]?.count ?? 0}</td><td className="text-ink-500">{formatDate(j.created_at, { dateStyle: "short" })}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
