import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CourseCard } from "@/components/course/CourseCard";
import { EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_LABELS, fold } from "@/lib/utils";
import type { CourseLevel } from "@/lib/types";

export const metadata: Metadata = { title: "Académie des cours" };

export default async function AcademyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("courses")
    .select("id, slug, title, description, level, cover_url, estimated_minutes, is_demo, category_id, lessons(count)")
    .eq("status", "published")
    .order("level")
    .order("title");
  if (sp.niveau && sp.niveau in LEVEL_LABELS) query = query.eq("level", sp.niveau as CourseLevel);
  if (sp.categorie) query = query.eq("category_id", sp.categorie);
  const [{ data: courses }, { data: categories }] = await Promise.all([
    query,
    supabase.from("course_categories").select("id, name").order("position"),
  ]);
  const q = sp.q ? fold(sp.q) : "";
  const list = (courses ?? []).filter((c) => !q || fold(`${c.title} ${c.description}`).includes(q));

  return (
    <div className="container-kd py-10">
      <PageHeader eyebrow="Académie" title="Les cours de KARANG-DULAA" description="Choisissez un cours selon votre niveau. Inscrivez-vous pour suivre votre progression, faire les exercices et obtenir un certificat." />
      <form className="mb-6 grid gap-3 rounded-2xl border border-sand-300 bg-white p-4 sm:grid-cols-[1fr_200px_200px_auto]" role="search">
        <Input name="q" defaultValue={sp.q} placeholder="Rechercher un cours…" aria-label="Rechercher un cours" />
        <Select name="niveau" defaultValue={sp.niveau ?? ""} aria-label="Niveau">
          <option value="">Tous les niveaux</option>
          {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select name="categorie" defaultValue={sp.categorie ?? ""} aria-label="Catégorie">
          <option value="">Toutes les catégories</option>
          {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <button className="h-10 rounded-lg bg-forest px-4 font-semibold text-white">Filtrer</button>
      </form>
      {list.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-10 w-10" />} title="Aucun cours ne correspond à votre recherche."
          action={<Link href="/academie" className="link">Voir tous les cours</Link>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => <CourseCard key={c.id} course={c} lessons={(c.lessons as unknown as { count: number }[])?.[0]?.count ?? 0} />)}
        </div>
      )}
    </div>
  );
}
