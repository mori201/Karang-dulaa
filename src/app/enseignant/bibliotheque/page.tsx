import Link from "next/link";
import { Badge, Card, EmptyState, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { managedCourses } from "@/lib/managed";
import { DOC_CATEGORIES, VISIBILITY_LABELS } from "@/lib/documents";
import { deleteDocumentAction, uploadDocumentAction } from "../actions";

export const metadata = { title: "Gérer la bibliothèque" };

export default async function LibraryAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireStaff();
  const supabase = await createClient();
  const courses = await managedCourses(user);
  const ids = courses.map((c) => c.id);
  const [{ data: docs }, { data: lessons }, { data: sources }] = await Promise.all([
    (user.isAdmin ? supabase.from("documents").select("id, title, category, visibility, uploaded_by, created_at") : supabase.from("documents").select("id, title, category, visibility, uploaded_by, created_at").eq("uploaded_by", user.id)).order("created_at", { ascending: false }),
    ids.length ? supabase.from("lessons").select("id, title, course_id").in("course_id", ids).order("position") : Promise.resolve({ data: [] }),
    supabase.from("dictionary_sources").select("id, author, year"),
  ]);
  return (
    <div className="container-kd max-w-5xl py-8">
      <PageHeader title="Gérer la bibliothèque" description="PDF, documents Word, images, audio, vidéos, textes de lecture, dialogues, proverbes, fiches de révision." />
      <Flash searchParams={sp} />
      <Card>
        <form action={uploadDocumentAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Titre" required><Input name="title" required /></Field>
            <Field label="Catégorie"><Select name="category">{Object.entries(DOC_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          </div>
          <Field label="Description"><Textarea name="description" className="min-h-16" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Fichier" hint="50 Mo maximum."><input name="file" type="file" className="block text-sm" accept=".pdf,.doc,.docx,.txt,.csv,image/*,audio/*,video/mp4,video/webm" /></Field>
            <Field label="…ou lien externe (https://)"><Input name="external_url" /></Field>
            <Field label="Cours associé"><Select name="course_id"><option value="">Aucun</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>
            <Field label="Leçon associée"><Select name="lesson_id"><option value="">Aucune</option>{(lessons ?? []).map((l) => <option key={l.id} value={l.id}>{courses.find((c) => c.id === l.course_id)?.title} › {l.title}</option>)}</Select></Field>
            <Field label="Visibilité"><Select name="visibility" defaultValue="enrolled">{Object.entries(VISIBILITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Ouvrage source"><Select name="source_id"><option value="">—</option>{(sources ?? []).map((s) => <option key={s.id} value={s.id}>{s.author} {s.year}</option>)}</Select></Field>
          </div>
          <Field label="Mention de droits" hint="Ex. : Extrait reproduit avec l’autorisation de l’auteur."><Input name="rights_note" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_downloadable" defaultChecked className="accent-forest" /> Téléchargement autorisé</label>
          <SubmitButton pendingLabel="Envoi…">Ajouter</SubmitButton>
        </form>
      </Card>
      <h2 className="mb-3 mt-8 font-bold">Documents</h2>
      {(docs ?? []).length === 0 ? <EmptyState title="Aucun document." /> : (
        <div className="overflow-x-auto rounded-2xl border border-sand-300 bg-white">
          <table className="table-kd">
            <thead><tr><th>Titre</th><th>Catégorie</th><th>Visibilité</th><th /></tr></thead>
            <tbody>{(docs ?? []).map((d) => (
              <tr key={d.id}>
                <td><Link className="link" href={`/bibliotheque/${d.id}`}>{d.title}</Link></td>
                <td>{DOC_CATEGORIES[d.category]}</td><td><Badge>{VISIBILITY_LABELS[d.visibility]}</Badge></td>
                <td>{(user.isAdmin || d.uploaded_by === user.id) && <form action={deleteDocumentAction}><input type="hidden" name="id" value={d.id} /><SubmitButton variant="ghost" size="sm" className="text-red-700" confirm="Supprimer ce document ?" pendingLabel="…">Supprimer</SubmitButton></form>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
