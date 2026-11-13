import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookMarked, Heart, Info, Quote } from "lucide-react";
import { Alert, Badge, Card } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { AudioPlayer } from "@/components/learn/AudioPlayer";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { signedUrl } from "@/lib/storage";
import { ORTHOGRAPHY_LABELS, POS_LABELS } from "@/lib/utils";
import type { DictionaryEntry, DictionarySource } from "@/lib/types";
import { toggleFavoriteAction } from "../actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("dictionary_entries").select("headword, translation_fr").eq("id", id).maybeSingle();
  return data ? { title: `${data.headword} — ${data.translation_fr}` } : { title: "Entrée du dictionnaire" };
}

export default async function EntryPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getSessionUser();
  const supabase = await createClient();
  const { data: entry } = await supabase.from("dictionary_entries").select("*").eq("id", id).maybeSingle<DictionaryEntry>();
  if (!entry) {
    return (
      <div className="container-kd max-w-2xl py-12">
        <Alert tone="info">
          Cette entrée n’existe pas ou n’est visible que par les membres connectés.{" "}
          {!user && <Link className="link" href={`/connexion?suivant=/dictionnaire/${id}`}>Se connecter</Link>}
        </Alert>
      </div>
    );
  }
  const [{ data: examples }, { data: source }, { data: cats }, fav, audio] = await Promise.all([
    supabase.from("dictionary_examples").select("*").eq("entry_id", id).order("position"),
    entry.source_id ? supabase.from("dictionary_sources").select("*").eq("id", entry.source_id).maybeSingle<DictionarySource>() : Promise.resolve({ data: null }),
    supabase.from("dictionary_entry_categories").select("category_id, vocabulary_categories(name, id)").eq("entry_id", id),
    user ? supabase.from("dictionary_favorites").select("entry_id").eq("user_id", user.id).eq("entry_id", id).maybeSingle() : Promise.resolve({ data: null }),
    entry.audio_id ? supabase.from("audio_resources").select("storage_path, speaker_name").eq("id", entry.audio_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const audioUrl = audio.data ? await signedUrl("audio", audio.data.storage_path) : null;

  // Mots associés : même thème, puis traductions proches
  const catIds = (cats ?? []).map((c) => c.category_id);
  let related: { id: string; headword: string; translation_fr: string }[] = [];
  if (catIds.length) {
    const { data: rel } = await supabase.from("dictionary_entry_categories").select("entry_id").in("category_id", catIds).neq("entry_id", id).limit(30);
    const ids = Array.from(new Set((rel ?? []).map((r) => r.entry_id))).slice(0, 8);
    if (ids.length) related = (await supabase.from("dictionary_entries").select("id, headword, translation_fr").in("id", ids).eq("status", "published")).data ?? [];
  }
  if (related.length < 4) {
    const word = entry.translation_fr.split(/[;,( ]/).find((w) => w.length > 3);
    if (word) {
      const { data: rel2 } = await supabase.from("dictionary_entries").select("id, headword, translation_fr").ilike("translation_fr", `%${word.replace(/[%_,()]/g, "")}%`).neq("id", id).eq("status", "published").limit(6);
      related = [...related, ...(rel2 ?? []).filter((r) => !related.some((x) => x.id === r.id))].slice(0, 8);
    }
  }

  return (
    <div className="container-kd max-w-4xl py-8">
      <Link href="/dictionnaire" className="text-sm text-ink-500 hover:text-forest">← Dictionnaire</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="mnk text-4xl font-extrabold text-forest">{entry.headword}</h1>
                {entry.variants.length > 0 && <p className="mnk mt-1 text-ink-500">Variantes : {entry.variants.join(", ")}</p>}
              </div>
              {user && (
                <form action={toggleFavoriteAction}>
                  <input type="hidden" name="entry_id" value={entry.id} />
                  <input type="hidden" name="back" value={`/dictionnaire/${entry.id}`} />
                  <SubmitButton variant={fav.data ? "gold" : "outline"} size="sm" pendingLabel="…" aria-label={fav.data ? "Retirer des favoris" : "Ajouter aux favoris"}>
                    <Heart className={fav.data ? "h-4 w-4 fill-current" : "h-4 w-4"} /> {fav.data ? "Favori" : "Ajouter aux favoris"}
                  </SubmitButton>
                </form>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.part_of_speech && <Badge>{POS_LABELS[entry.part_of_speech]}</Badge>}
              {(cats ?? []).map((c) => {
                const vc = c.vocabulary_categories as unknown as { name: string; id: string };
                return <Link key={c.category_id} href={`/dictionnaire?categorie=${vc.id}`}><Badge tone="green">{vc.name}</Badge></Link>;
              })}
              {entry.regional_variant && <Badge tone="blue">Variante régionale : {entry.regional_variant}</Badge>}
            </div>
            <p className="mt-5 text-2xl font-semibold">{entry.translation_fr}</p>
            {entry.definition && <p className="mt-2 text-ink-600">{entry.definition}</p>}
            {audioUrl && <div className="mt-4"><AudioPlayer src={audioUrl} title="Prononciation" speaker={audio.data?.speaker_name} /></div>}
            {(entry.pronunciation || entry.tone_notes) && (
              <dl className="mt-4 grid gap-2 text-sm">
                {entry.pronunciation && <div><dt className="inline font-semibold">Prononciation : </dt><dd className="mnk inline">{entry.pronunciation}</dd></div>}
                {entry.tone_notes && <div><dt className="inline font-semibold">Tons : </dt><dd className="inline">{entry.tone_notes}</dd></div>}
              </dl>
            )}
            {entry.notes && <p className="mt-4 flex gap-2 rounded-lg bg-sand-100 p-3 text-sm text-ink-600"><Info className="mt-0.5 h-4 w-4 shrink-0" /> {entry.notes}</p>}
          </Card>

          {(examples ?? []).length > 0 && (
            <Card>
              <h2 className="font-bold">Exemples</h2>
              <ul className="mt-3 space-y-3">
                {(examples ?? []).map((ex) => (
                  <li key={ex.id} className="flex gap-3">
                    <Quote className="mt-1 h-4 w-4 shrink-0 text-gold-500" />
                    <div>
                      <div className="mnk text-lg font-semibold">{ex.mandinka}</div>
                      {ex.french && <div className="text-ink-500">« {ex.french} »</div>}
                      {ex.source_page && source && <div className="text-xs text-ink-400">{source.author} {source.year}, p. {ex.source_page}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="flex items-center gap-2 text-sm font-bold"><BookMarked className="h-4 w-4 text-gold-500" /> Source documentaire</h2>
            {source ? (
              <div className="mt-2 text-sm">
                <p><span className="font-semibold">{source.author}</span> ({source.year}). <i>{source.title}</i>.</p>
                <p className="mt-1">Page de référence : <strong>{entry.source_page}</strong></p>
                <p className="mt-2 text-xs text-ink-400">{ORTHOGRAPHY_LABELS[entry.orthography]}</p>
                <Link href="/sources" className="link mt-2 inline-block text-xs">Conventions de notation</Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">{ORTHOGRAPHY_LABELS[entry.orthography]}. {entry.notes ? "" : "Entrée rédigée par l’équipe KARANG-DULAA."}</p>
            )}
          </Card>
          {related.length > 0 && (
            <Card>
              <h2 className="text-sm font-bold">Mots associés</h2>
              <ul className="mt-2 space-y-1.5">
                {related.map((r) => (
                  <li key={r.id}><Link href={`/dictionnaire/${r.id}`} className="flex justify-between gap-2 text-sm hover:text-forest"><span className="mnk font-semibold">{r.headword}</span><span className="truncate text-ink-500">{r.translation_fr}</span></Link></li>
                ))}
              </ul>
            </Card>
          )}
          {user && <Link href={`/dictionnaire/proposer?mot=${encodeURIComponent(entry.headword)}`} className="link block text-sm">Signaler une variante ou proposer un exemple</Link>}
        </aside>
      </div>
    </div>
  );
}
