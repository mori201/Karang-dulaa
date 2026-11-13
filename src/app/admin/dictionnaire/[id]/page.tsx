import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { EntryFields } from "@/components/admin/EntryForm";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { DictionaryEntry } from "@/lib/types";
import { deleteEntryAction, saveEntryAction } from "../../actions";

export const metadata = { title: "Modifier une entrée" };

export default async function EditEntry({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: entry } = await supabase.from("dictionary_entries").select("*").eq("id", id).maybeSingle<DictionaryEntry & { verified_at: string | null }>();
  if (!entry) notFound();
  const [{ data: examples }, { data: sources }, { data: categories }, { data: sel }, { data: history }] = await Promise.all([
    supabase.from("dictionary_examples").select("mandinka, french, source_page").eq("entry_id", id).order("position"),
    supabase.from("dictionary_sources").select("id, author, year"),
    supabase.from("vocabulary_categories").select("id, name").order("name"),
    supabase.from("dictionary_entry_categories").select("category_id").eq("entry_id", id),
    supabase.from("audit_logs").select("id, action, created_at, details").eq("entity_type", "dictionary_entries").eq("entity_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  return (
    <div className="container-kd max-w-4xl py-8">
      <Link href="/admin/dictionnaire" className="text-sm text-ink-500 hover:text-forest">← Dictionnaire</Link>
      <PageHeader title={<span className="mnk">{entry.headword}</span>} description={entry.verified_at ? `Validée le ${formatDate(entry.verified_at)}` : "Non validée"} />
      <Flash searchParams={sp} />
      <Card>
        <form action={saveEntryAction} className="space-y-4">
          <input type="hidden" name="entry_id" value={id} />
          <EntryFields entry={entry} examples={examples ?? []} sources={sources ?? []} categories={categories ?? []} selected={(sel ?? []).map((s) => s.category_id)} />
          <div className="flex flex-wrap gap-2"><SubmitButton>Enregistrer</SubmitButton><Link href={`/dictionnaire/${id}`} className="inline-flex h-10 items-center px-3 text-sm font-semibold text-forest">Voir la fiche publique</Link></div>
        </form>
      </Card>
      <Card className="mt-6">
        <h2 className="font-bold">Historique des modifications</h2>
        <ul className="mt-2 space-y-1 text-sm">{(history ?? []).map((h) => <li key={h.id}>{formatDate(h.created_at, { dateStyle: "short", timeStyle: "short" })} — {h.action} <span className="text-xs text-ink-400">{Object.keys(((h.details as { changed?: object })?.changed) ?? {}).join(", ")}</span></li>)}</ul>
      </Card>
      <form action={deleteEntryAction} className="mt-6"><input type="hidden" name="entry_id" value={id} /><SubmitButton variant="danger" size="sm" confirm="Supprimer définitivement cette entrée ?">Supprimer l’entrée</SubmitButton></form>
    </div>
  );
}
