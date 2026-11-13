import { Card, Input, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { deleteCategoryAction, saveCategoryAction } from "../actions";

export const metadata = { title: "Catégories" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: cc }, { data: vc }] = await Promise.all([
    supabase.from("course_categories").select("id, name, description").order("position"),
    supabase.from("vocabulary_categories").select("id, name, description").order("name"),
  ]);
  const block = (title: string, table: string, rows: { id: string; name: string; description: string | null }[]) => (
    <Card>
      <h2 className="font-bold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap gap-2">
            <form action={saveCategoryAction} className="flex flex-1 gap-2"><input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={r.id} />
              <Input name="name" defaultValue={r.name} required className="h-9" aria-label="Nom" /><Input name="description" defaultValue={r.description ?? ""} className="h-9" placeholder="Description" aria-label="Description" />
              <SubmitButton size="sm" variant="secondary" pendingLabel="…">OK</SubmitButton></form>
            <form action={deleteCategoryAction}><input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={r.id} /><SubmitButton size="sm" variant="ghost" className="text-red-700" confirm="Supprimer cette catégorie ?" pendingLabel="…">Supprimer</SubmitButton></form>
          </li>
        ))}
      </ul>
      <form action={saveCategoryAction} className="mt-4 flex gap-2 border-t border-sand-300 pt-4"><input type="hidden" name="table" value={table} />
        <Input name="name" placeholder="Nouvelle catégorie" required aria-label="Nouvelle catégorie" /><SubmitButton size="sm" pendingLabel="…">Ajouter</SubmitButton></form>
    </Card>
  );
  return (
    <div className="container-kd max-w-4xl py-8">
      <PageHeader title="Catégories" />
      <Flash searchParams={sp} />
      <div className="space-y-6">{block("Catégories de cours", "course_categories", cc ?? [])}{block("Thèmes du vocabulaire", "vocabulary_categories", vc ?? [])}</div>
    </div>
  );
}
