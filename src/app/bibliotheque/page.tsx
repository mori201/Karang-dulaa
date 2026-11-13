import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Library, Upload } from "lucide-react";
import { Badge, ButtonLink, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { DOC_CATEGORIES, VISIBILITY_LABELS } from "@/lib/documents";
import { cleanQuery } from "@/lib/dictionary";

export const metadata: Metadata = { title: "Bibliothèque pédagogique" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const supabase = await createClient();
  let query = supabase.from("documents").select("id, title, description, category, mime_type, visibility, external_url, courses(title)").order("created_at", { ascending: false }).limit(100);
  if (sp.categorie && sp.categorie in DOC_CATEGORIES) query = query.eq("category", sp.categorie);
  const f = sp.q ? cleanQuery(sp.q) : "";
  if (f) query = query.ilike("title_fold", `%${f}%`);
  const { data: docs } = await query;

  return (
    <div className="container-kd py-8">
      <PageHeader eyebrow="Ressources" title="Bibliothèque pédagogique"
        description="Supports de cours, textes de lecture, dialogues, proverbes et fiches de révision."
        actions={user?.isStaff ? <ButtonLink href="/enseignant/bibliotheque" variant="secondary" size="sm"><Upload className="h-4 w-4" /> Ajouter un document</ButtonLink> : undefined} />
      <form className="mb-6 grid gap-3 rounded-2xl border border-sand-300 bg-white p-4 sm:grid-cols-[1fr_220px_auto]" role="search">
        <Input name="q" defaultValue={sp.q} placeholder="Rechercher un document…" aria-label="Rechercher" />
        <Select name="categorie" defaultValue={sp.categorie ?? ""} aria-label="Catégorie">
          <option value="">Toutes les catégories</option>
          {Object.entries(DOC_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <button className="h-10 rounded-lg bg-forest px-4 font-semibold text-white">Filtrer</button>
      </form>
      {(docs ?? []).length === 0 ? (
        <EmptyState icon={<Library className="h-10 w-10" />} title="Aucun document disponible."
          description={user ? "Les documents ajoutés par l’équipe pédagogique apparaîtront ici." : "Certains documents sont réservés aux apprenants inscrits : connectez-vous pour les voir."}
          action={!user ? <Link className="link" href="/connexion?suivant=/bibliotheque">Se connecter</Link> : undefined} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {(docs ?? []).map((d) => (
            <li key={d.id}>
              <Link href={`/bibliotheque/${d.id}`} className="flex h-full gap-3 rounded-2xl border border-sand-300 bg-white p-4 hover:border-forest">
                <FileText className="h-8 w-8 shrink-0 text-gold-500" />
                <div className="min-w-0">
                  <div className="font-bold">{d.title}</div>
                  {d.description && <p className="line-clamp-2 text-sm text-ink-500">{d.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{DOC_CATEGORIES[d.category] ?? d.category}</Badge>
                    {(d.courses as unknown as { title: string } | null)?.title && <Badge tone="green">{(d.courses as unknown as { title: string }).title}</Badge>}
                    {user?.isStaff && <Badge tone="blue">{VISIBILITY_LABELS[d.visibility]}</Badge>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
