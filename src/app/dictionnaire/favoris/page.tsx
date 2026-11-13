import Link from "next/link";
import { Heart, History } from "lucide-react";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { clearHistoryAction } from "../actions";

export const metadata = { title: "Mes mots favoris" };

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/dictionnaire/favoris");
  const supabase = await createClient();
  const [{ data: favs }, { data: history }] = await Promise.all([
    supabase.from("dictionary_favorites").select("created_at, dictionary_entries(id, headword, translation_fr)").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("search_history").select("id, query, lang, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);
  return (
    <div className="container-kd max-w-4xl py-8">
      <PageHeader title="Favoris et historique" actions={<ButtonLink href="/cartes?source=favoris" variant="gold" size="sm">Réviser mes favoris</ButtonLink>} />
      <Flash searchParams={sp} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-bold"><Heart className="h-4 w-4 text-gold-500" /> Mots favoris ({(favs ?? []).length})</h2>
          {(favs ?? []).length === 0 ? <div className="mt-3"><EmptyState title="Aucun favori" description="Ajoutez des mots depuis leur fiche pour les réviser ensuite." /></div> : (
            <ul className="mt-3 divide-y divide-sand-300">
              {(favs ?? []).map((f) => {
                const e = f.dictionary_entries as unknown as { id: string; headword: string; translation_fr: string } | null;
                if (!e) return null;
                return <li key={e.id}><Link href={`/dictionnaire/${e.id}`} className="flex justify-between gap-3 py-2 hover:text-forest"><span className="mnk font-semibold">{e.headword}</span><span className="text-ink-500">{e.translation_fr}</span></Link></li>;
              })}
            </ul>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold"><History className="h-4 w-4 text-gold-500" /> Historique des recherches</h2>
            {(history ?? []).length > 0 && <form action={clearHistoryAction}><SubmitButton variant="ghost" size="sm" pendingLabel="…">Effacer</SubmitButton></form>}
          </div>
          {(history ?? []).length === 0 ? <p className="mt-3 text-sm text-ink-500">Aucune recherche enregistrée.</p> : (
            <ul className="mt-3 divide-y divide-sand-300 text-sm">
              {(history ?? []).map((h) => (
                <li key={h.id} className="flex justify-between py-2">
                  <Link href={`/dictionnaire?q=${encodeURIComponent(h.query)}${h.lang !== "auto" ? `&langue=${h.lang}` : ""}`} className="mnk link">{h.query}</Link>
                  <span className="text-ink-400">{formatDate(h.created_at, { dateStyle: "short" })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
