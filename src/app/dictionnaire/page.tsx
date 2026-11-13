import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, Heart, PlusCircle } from "lucide-react";
import { Alert, Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { SearchBox } from "@/components/dictionary/SearchBox";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { ALPHABET, cleanQuery, rankEntries } from "@/lib/dictionary";
import { POS_LABELS, cn, fold } from "@/lib/utils";

export const metadata: Metadata = { title: "Dictionnaire mandinka-français", description: "Dictionnaire bilingue mandinka-français sourcé : traductions, exemples, notation tonale et références." };

const PAGE = 40;
type Row = { id: string; headword: string; variants: string[]; translation_fr: string; part_of_speech: string | null; orthography: string; source_page: string | null; dictionary_sources: { author: string; year: number } | null };

export default async function DictionaryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const supabase = await createClient();
  const q = (sp.q ?? "").trim();
  const lang = sp.langue === "mnk" || sp.langue === "fr" ? sp.langue : "auto";
  const letter = sp.lettre && ALPHABET.includes(sp.lettre) ? sp.lettre : null;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ data: categories }, { data: catEntries }] = await Promise.all([
    supabase.from("vocabulary_categories").select("id, slug, name").order("name"),
    sp.categorie ? supabase.from("dictionary_entry_categories").select("entry_id").eq("category_id", sp.categorie) : Promise.resolve({ data: null }),
  ]);

  let query = supabase
    .from("dictionary_entries")
    .select("id, headword, variants, translation_fr, part_of_speech, orthography, source_page, dictionary_sources(author, year)", { count: "exact" })
    .eq("status", "published");
  const f = cleanQuery(q);
  if (f) {
    const pat = `%${f}%`;
    const ors = lang === "mnk" ? [`headword_fold.ilike.${pat}`, `variants_fold.ilike.${pat}`]
      : lang === "fr" ? [`translation_fold.ilike.${pat}`]
      : [`headword_fold.ilike.${pat}`, `variants_fold.ilike.${pat}`, `translation_fold.ilike.${pat}`];
    query = query.or(ors.join(","));
  } else if (letter) {
    query = query.ilike("headword_fold", `${fold(letter)}%`);
    // n, ŋ et ñ se confondent dans la forme normalisée : on filtre sur la forme exacte
    if (["n", "ŋ", "ñ"].includes(letter)) query = query.ilike("headword", `${letter}%`);
  }
  if (sp.nature && sp.nature in POS_LABELS) query = query.eq("part_of_speech", sp.nature);
  if (catEntries) query = query.in("id", catEntries.map((c) => c.entry_id).length ? catEntries.map((c) => c.entry_id) : ["00000000-0000-0000-0000-000000000000"]);

  const { data, count } = f
    ? await query.limit(200)
    : await query.order("headword_fold").range((page - 1) * PAGE, page * PAGE - 1);
  let rows = (data ?? []) as unknown as Row[];
  if (f) rows = rankEntries(rows, q, lang).slice((page - 1) * PAGE, page * PAGE);
  const total = count ?? rows.length;

  let favorites = new Set<string>();
  if (user) {
    const { data: favs } = await supabase.from("dictionary_favorites").select("entry_id").eq("user_id", user.id);
    favorites = new Set((favs ?? []).map((x) => x.entry_id));
    if (q) {
      const { data: last } = await supabase.from("search_history").select("query").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (last?.query !== q) await supabase.from("search_history").insert({ user_id: user.id, query: q.slice(0, 200), lang });
    }
  }
  const params = (extra: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    Object.entries({ q, langue: lang === "auto" ? null : lang, lettre: letter, nature: sp.nature ?? null, categorie: sp.categorie ?? null, page: null, ...extra })
      .forEach(([k, v]) => v !== null && v !== "" && v !== undefined && p.set(k, String(v)));
    return `/dictionnaire?${p.toString()}`;
  };

  return (
    <div className="container-kd py-8">
      <PageHeader eyebrow="Dictionnaire" title="Mandinka ⇄ Français"
        description="Recherche instantanée avec ou sans accents tonals. Chaque entrée conserve l’orthographe de sa source et indique la page de référence."
        actions={user ? <>
          <ButtonLink href="/dictionnaire/favoris" variant="outline" size="sm"><Heart className="h-4 w-4" /> Favoris & historique</ButtonLink>
          <ButtonLink href="/dictionnaire/proposer" variant="secondary" size="sm"><PlusCircle className="h-4 w-4" /> Proposer un mot</ButtonLink>
        </> : undefined} />

      <form className="rounded-2xl border border-sand-300 bg-white p-4" role="search">
        <SearchBox defaultValue={q} lang={lang} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select name="nature" defaultValue={sp.nature ?? ""} className="h-10 rounded-lg border border-sand-400 bg-white px-3 text-sm" aria-label="Catégorie grammaticale">
            <option value="">Toutes les catégories grammaticales</option>
            {Object.entries(POS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="categorie" defaultValue={sp.categorie ?? ""} className="h-10 rounded-lg border border-sand-400 bg-white px-3 text-sm" aria-label="Thème">
            <option value="">Tous les thèmes</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </form>

      <nav aria-label="Recherche alphabétique" className="mt-4 flex flex-wrap gap-1">
        {ALPHABET.map((l) => (
          <Link key={l} href={`/dictionnaire?lettre=${encodeURIComponent(l)}`} aria-current={letter === l ? "page" : undefined}
            className={cn("mnk grid h-9 min-w-9 place-items-center rounded-lg border text-sm font-bold uppercase", letter === l ? "border-forest bg-forest text-white" : "border-sand-300 bg-white hover:border-forest")}>
            {l}
          </Link>
        ))}
      </nav>

      {!user && (
        <Alert tone="info" className="mt-4">
          Les entrées issues d’ouvrages dont les droits de diffusion sont en cours de vérification sont réservées aux membres.{" "}
          <Link href="/inscription" className="link">Créez un compte gratuit</Link> pour consulter l’ensemble du dictionnaire.
        </Alert>
      )}

      <div className="mt-6">
        <p className="mb-3 text-sm text-ink-500">{q ? `${total} résultat${total > 1 ? "s" : ""} pour « ${q} »` : `${total} entrée${total > 1 ? "s" : ""}`}</p>
        {rows.length === 0 ? (
          <EmptyState icon={<BookOpenText className="h-10 w-10" />} title={q ? "Aucun résultat." : "Aucune entrée à afficher."}
            description={q ? "Vérifiez l’orthographe, essayez sans accents ou dans l’autre langue. Vous connaissez ce mot ? Proposez-le !" : undefined}
            action={user ? <ButtonLink href={`/dictionnaire/proposer${q ? `?mot=${encodeURIComponent(q)}` : ""}`} variant="secondary">Proposer un mot</ButtonLink> : undefined} />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/dictionnaire/${r.id}`} className="flex h-full flex-col rounded-xl border border-sand-300 bg-white px-4 py-3 hover:border-forest">
                  <div className="flex items-start justify-between gap-2">
                    <span className="mnk text-xl font-bold text-forest">{r.headword}</span>
                    {favorites.has(r.id) && <Heart className="h-4 w-4 fill-gold text-gold" aria-label="Favori" />}
                  </div>
                  {r.variants.length > 0 && <span className="mnk text-xs text-ink-400">var. {r.variants.join(", ")}</span>}
                  <span className="mt-1 text-ink-600">{r.translation_fr}</span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {r.part_of_speech && <Badge>{POS_LABELS[r.part_of_speech]}</Badge>}
                    {r.dictionary_sources && <Badge tone="gold">{r.dictionary_sources.author} {r.dictionary_sources.year}, p. {r.source_page}</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {total > PAGE && (
          <div className="mt-6 flex justify-center gap-2">
            {page > 1 && <ButtonLink href={params({ page: page - 1 })} variant="outline" size="sm">← Précédent</ButtonLink>}
            <span className="self-center text-sm text-ink-500">Page {page} / {Math.ceil(total / PAGE)}</span>
            {page * PAGE < total && <ButtonLink href={params({ page: page + 1 })} variant="outline" size="sm">Suivant →</ButtonLink>}
          </div>
        )}
      </div>
    </div>
  );
}
