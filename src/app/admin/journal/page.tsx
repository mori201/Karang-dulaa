import { Input, PageHeader, Select } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Journal d’activité" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page) || 1);
  let q = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  if (sp.type) q = q.eq("entity_type", sp.type);
  if (sp.action) q = q.ilike("action", `%${sp.action.replace(/[%,]/g, "")}%`);
  const { data: logs, count } = await q;
  const actorIds = Array.from(new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean))) as string[];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds) : { data: [] };
  const name = (id: string | null) => (id ? (actors ?? []).find((a) => a.id === id)?.full_name || (actors ?? []).find((a) => a.id === id)?.email || id.slice(0, 8) : "système");
  const TYPES = ["users_roles", "courses", "dictionary_entries", "dictionary_sources", "lexical_submissions", "platform_settings", "certificates", "documents", "teachers", "profiles", "import_jobs"];
  return (
    <div className="container-kd py-8">
      <PageHeader title="Journal d’activité" description={`${count ?? 0} événement(s) — opérations sensibles journalisées automatiquement.`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <Select name="type" defaultValue={sp.type ?? ""} className="max-w-56" aria-label="Type"><option value="">Tous les objets</option>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
        <Input name="action" defaultValue={sp.action} placeholder="Action (insert, update…)" className="max-w-56" aria-label="Action" />
        <button className="h-10 rounded-lg bg-forest px-4 text-sm font-semibold text-white">Filtrer</button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-sand-300 bg-white">
        <table className="table-kd">
          <thead><tr><th>Date</th><th>Acteur</th><th>Action</th><th>Objet</th><th>Détails</th></tr></thead>
          <tbody>{(logs ?? []).map((l) => (
            <tr key={l.id}><td className="whitespace-nowrap text-xs">{formatDate(l.created_at, { dateStyle: "short", timeStyle: "medium" })}</td><td className="text-xs">{name(l.actor_id)}</td><td className="font-semibold">{l.action}</td>
              <td className="text-xs">{l.entity_type}<br /><span className="font-mono text-ink-400">{String(l.entity_id ?? "").slice(0, 13)}</span></td>
              <td><pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-ink-500">{JSON.stringify(l.details).slice(0, 400)}</pre></td></tr>
          ))}</tbody>
        </table>
      </div>
      {(count ?? 0) > 50 && <div className="mt-4 flex justify-center gap-4 text-sm">{page > 1 && <a className="link" href={`/admin/journal?page=${page - 1}`}>← Précédent</a>}<span>Page {page}</span>{page * 50 < (count ?? 0) && <a className="link" href={`/admin/journal?page=${page + 1}`}>Suivant →</a>}</div>}
    </div>
  );
}
