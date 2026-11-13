import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Card, Input, PageHeader, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { EntryFields } from "@/components/admin/EntryForm";
import { createClient } from "@/lib/supabase/server";
import { cleanQuery } from "@/lib/dictionary";
import { saveEntryAction } from "../actions";

export const metadata = { title: "Dictionnaire — administration" };
const STATUS = { draft: ["Brouillon", "neutral"], pending_review: ["À valider", "gold"], published: ["Publié", "green"], rejected: ["Rejeté", "red"] } as const;

export default async function AdminDictionary({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page) || 1);
  let q = supabase.from("dictionary_entries").select("id, headword, translation_fr, status, source_page, orthography, dictionary_sources(author, year)", { count: "exact" }).order("headword_fold").range((page - 1) * 50, page * 50 - 1);
  if (sp.statut && sp.statut in STATUS) q = q.eq("status", sp.statut as keyof typeof STATUS);
  const f = sp.q ? cleanQuery(sp.q) : "";
  if (f) q = q.or(`headword_fold.ilike.%${f}%,translation_fold.ilike.%${f}%`);
  const [{ data: entries, count }, { data: sources }, { data: categories }] = await Promise.all([
    q, supabase.from("dictionary_sources").select("id, author, year"), supabase.from("vocabulary_categories").select("id, name").order("name"),
  ]);
  const qs = (p: number) => `/admin/dictionnaire?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.statut ? { statut: sp.statut } : {}), page: String(p) })}`;
  return (
    <div className="container-kd py-8">
      <PageHeader title="Gestion du dictionnaire" description={`${count ?? 0} entrée(s)`} />
      <Flash searchParams={sp} />
      <form className="mb-4 flex flex-wrap gap-2"><Input name="q" defaultValue={sp.q} placeholder="Mot ou traduction" className="max-w-xs" aria-label="Rechercher" />
        <Select name="statut" defaultValue={sp.statut ?? ""} className="max-w-48" aria-label="Statut"><option value="">Tous les statuts</option>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select>
        <button className="h-10 rounded-lg bg-forest px-4 text-sm font-semibold text-white">Filtrer</button></form>
      <div className="overflow-x-auto rounded-2xl border border-sand-300 bg-white">
        <table className="table-kd">
          <thead><tr><th>Mot</th><th>Traduction</th><th>Source</th><th>Statut</th></tr></thead>
          <tbody>{(entries ?? []).map((e) => { const s = e.dictionary_sources as unknown as { author: string; year: number } | null; const [l, t] = STATUS[e.status as keyof typeof STATUS]; return (
            <tr key={e.id}><td><Link href={`/admin/dictionnaire/${e.id}`} className="mnk font-semibold text-forest hover:underline">{e.headword}</Link></td><td>{e.translation_fr}</td><td className="text-xs">{s ? `${s.author} ${s.year}, p. ${e.source_page}` : "KARANG-DULAA"}</td><td><Badge tone={t}>{l}</Badge></td></tr>
          ); })}</tbody>
        </table>
      </div>
      {(count ?? 0) > 50 && <div className="mt-4 flex justify-center gap-4 text-sm">{page > 1 && <a className="link" href={qs(page - 1)}>← Précédent</a>}<span>Page {page} / {Math.ceil((count ?? 0) / 50)}</span>{page * 50 < (count ?? 0) && <a className="link" href={qs(page + 1)}>Suivant →</a>}</div>}
      <Card className="mt-8">
        <details>
          <summary className="flex cursor-pointer items-center gap-2 font-bold"><Plus className="h-4 w-4" /> Ajouter une entrée</summary>
          <form action={saveEntryAction} className="mt-4 space-y-4">
            <input type="hidden" name="back" value="/admin/dictionnaire" />
            <EntryFields sources={sources ?? []} categories={categories ?? []} />
            <SubmitButton>Créer l’entrée</SubmitButton>
          </form>
        </details>
      </Card>
    </div>
  );
}
