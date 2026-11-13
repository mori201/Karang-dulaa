import Link from "next/link";
import { Layers } from "lucide-react";
import { EmptyState, PageHeader, Select } from "@/components/ui";
import { Flashcards, type Card } from "@/components/learn/Flashcards";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Cartes mémoire" };

export default async function FlashcardsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/cartes");
  const supabase = await createClient();
  const source = sp.source ?? "auto";
  const LIMIT = 20;
  const ids: string[] = [];
  const add = (xs: string[]) => xs.forEach((x) => ids.length < LIMIT && !ids.includes(x) && ids.push(x));

  const { data: categories } = await supabase.from("vocabulary_categories").select("id, name").order("name");

  if (source === "auto" || source === "dues") {
    const { data: due } = await supabase.from("flashcard_reviews").select("entry_id").eq("user_id", user.id).lte("due_at", new Date().toISOString()).order("due_at").limit(LIMIT);
    add((due ?? []).map((d) => d.entry_id));
  }
  if (source === "auto" || source === "favoris") {
    const { data: favs } = await supabase.from("dictionary_favorites").select("entry_id").eq("user_id", user.id).limit(100);
    const { data: seen } = await supabase.from("flashcard_reviews").select("entry_id").eq("user_id", user.id);
    const seenSet = new Set((seen ?? []).map((s) => s.entry_id));
    add((favs ?? []).map((f) => f.entry_id).filter((x) => source === "favoris" || !seenSet.has(x)));
  }
  if (source === "auto") {
    // vocabulaire des leçons des cours suivis
    const { data: enr } = await supabase.from("enrollments").select("course_id").eq("student_id", user.id);
    if (enr?.length) {
      const { data: blocks } = await supabase.from("lesson_contents").select("data, lessons!inner(course_id)").eq("block_type", "vocabulary").in("lessons.course_id", enr.map((e) => e.course_id)).limit(50);
      const { data: seen } = await supabase.from("flashcard_reviews").select("entry_id").eq("user_id", user.id);
      const seenSet = new Set((seen ?? []).map((s) => s.entry_id));
      add((blocks ?? []).flatMap((b) => ((b.data as { items?: { entry_id?: string }[] }).items ?? []).map((it) => it.entry_id).filter((x): x is string => !!x && !seenSet.has(x))));
    }
  }
  if (source.startsWith("categorie:")) {
    const { data: ce } = await supabase.from("dictionary_entry_categories").select("entry_id").eq("category_id", source.slice(10)).limit(60);
    add((ce ?? []).map((c) => c.entry_id).sort(() => Math.random() - 0.5));
  }
  if (source === "auto" && ids.length < 10) {
    const { data: rnd } = await supabase.from("dictionary_entries").select("id").eq("status", "published").limit(200);
    const { data: seen } = await supabase.from("flashcard_reviews").select("entry_id").eq("user_id", user.id);
    const seenSet = new Set((seen ?? []).map((s) => s.entry_id));
    add((rnd ?? []).map((r) => r.id).filter((x) => !seenSet.has(x)).sort(() => Math.random() - 0.5));
  }

  let cards: Card[] = [];
  if (ids.length) {
    const { data: entries } = await supabase.from("dictionary_entries").select("id, headword, translation_fr, source_page, dictionary_sources(author, year), dictionary_examples(mandinka, french, position)").in("id", ids).eq("status", "published");
    cards = ids.map((id) => (entries ?? []).find((e) => e.id === id)).filter(Boolean).map((e) => {
      const src = e!.dictionary_sources as unknown as { author: string; year: number } | null;
      const ex = (e!.dictionary_examples ?? []).sort((a, b) => a.position - b.position)[0];
      return { id: e!.id, headword: e!.headword, translation_fr: e!.translation_fr, example: ex ? { mandinka: ex.mandinka, french: ex.french } : null, source: src ? `${src.author} ${src.year}, p. ${e!.source_page}` : null };
    });
  }

  return (
    <div className="container-kd py-8">
      <PageHeader title="Cartes mémoire" description="Révisez le vocabulaire avec la répétition espacée : les mots difficiles reviennent plus souvent."
        actions={
          <form className="flex gap-2">
            <Select name="source" defaultValue={source} aria-label="Cartes à réviser" className="w-56">
              <option value="auto">Session recommandée</option>
              <option value="dues">Révisions dues</option>
              <option value="favoris">Mes favoris</option>
              {(categories ?? []).map((c) => <option key={c.id} value={`categorie:${c.id}`}>Thème : {c.name}</option>)}
            </Select>
            <button className="h-10 rounded-lg bg-forest px-4 text-sm font-semibold text-white">OK</button>
          </form>
        } />
      {cards.length === 0 ? (
        <EmptyState icon={<Layers className="h-10 w-10" />} title="Aucune carte à réviser pour l’instant."
          description="Ajoutez des mots en favoris depuis le dictionnaire, ou inscrivez-vous à un cours."
          action={<Link className="link" href="/dictionnaire">Ouvrir le dictionnaire</Link>} />
      ) : <Flashcards cards={cards} />}
    </div>
  );
}
