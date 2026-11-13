import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Plus, Trash2 } from "lucide-react";
import { Badge, ButtonLink, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { Blocks, resolveBlockMedia } from "@/components/course/Blocks";
import { BLOCK_LABELS, BlockFields } from "@/components/teacher/BlockFields";
import { MoveButtons } from "@/components/teacher/MoveButtons";
import { loadManagedCourse } from "@/lib/teacher";
import type { BlockType, Lesson, LessonBlock } from "@/lib/types";
import { deleteBlockAction, deleteLessonAction, saveBlockAction, updateLessonAction } from "../../../../actions";

export const metadata = { title: "Éditeur de leçon" };

export default async function LessonEditor({ params, searchParams }: { params: Promise<{ id: string; lessonId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id, lessonId } = await params;
  const sp = await searchParams;
  const { supabase, course } = await loadManagedCourse(id);
  const back = `/enseignant/cours/${id}/lecons/${lessonId}`;
  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", lessonId).eq("course_id", id).maybeSingle<Lesson>();
  if (!lesson) notFound();
  const [{ data: blocks }, { data: modules }, { data: audios }, { data: exercises }, { data: assignments }] = await Promise.all([
    supabase.from("lesson_contents").select("*").eq("lesson_id", lessonId).order("position"),
    supabase.from("course_modules").select("id, title").eq("course_id", id).order("position"),
    supabase.from("audio_resources").select("id, title").order("created_at", { ascending: false }).limit(200),
    supabase.from("exercises").select("id, title").eq("course_id", id),
    supabase.from("assignments").select("id, title").eq("course_id", id),
  ]);
  const opts = { audios: audios ?? [], exercises: exercises ?? [], assignments: assignments ?? [] };
  const list = (blocks ?? []) as LessonBlock[];
  const resolved = await resolveBlockMedia(list);

  return (
    <div className="container-kd py-8">
      <Link href={`/enseignant/cours/${id}`} className="text-sm text-ink-500 hover:text-forest">← {course.title}</Link>
      <PageHeader title={lesson.title} eyebrow="Éditeur de leçon"
        actions={<ButtonLink href={`/academie/${course.slug}/lecon/${lessonId}`} variant="outline" size="sm"><Eye className="h-4 w-4" /> Voir comme un apprenant</ButtonLink>} />
      <Flash searchParams={sp} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {list.length === 0 && <p className="rounded-xl border-2 border-dashed border-sand-400 p-6 text-center text-ink-500">Cette leçon est vide. Ajoutez des blocs de contenu ci-dessous.</p>}
          {list.map((b) => (
            <Card key={b.id} className="p-0">
              <div className="flex items-center gap-2 border-b border-sand-300 bg-sand-100 px-4 py-2">
                <Badge>{BLOCK_LABELS[b.block_type]}</Badge>
                <span className="flex-1" />
                <MoveButtons table="lesson_contents" id={b.id} scope={lessonId} back={back} />
                <form action={deleteBlockAction}>
                  <input type="hidden" name="block_id" value={b.id} /><input type="hidden" name="back" value={back} />
                  <SubmitButton variant="ghost" size="sm" className="text-red-700" confirm="Supprimer ce bloc ?" pendingLabel="…" aria-label="Supprimer le bloc"><Trash2 className="h-4 w-4" /></SubmitButton>
                </form>
              </div>
              <div className="p-4"><Blocks blocks={[b]} resolved={resolved} /></div>
              <details className="border-t border-sand-300">
                <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-forest">Modifier</summary>
                <form action={saveBlockAction} className="space-y-3 p-4 pt-0">
                  <input type="hidden" name="block_id" value={b.id} /><input type="hidden" name="lesson_id" value={lessonId} />
                  <input type="hidden" name="block_type" value={b.block_type} /><input type="hidden" name="back" value={back} />
                  <BlockFields type={b.block_type} data={b.data} opts={opts} />
                  <SubmitButton size="sm">Enregistrer le bloc</SubmitButton>
                </form>
              </details>
            </Card>
          ))}

          <Card className="border-2 border-dashed border-forest-200 bg-forest-50/40">
            <h2 className="flex items-center gap-2 font-bold"><Plus className="h-4 w-4" /> Ajouter un bloc</h2>
            <div className="mt-3 space-y-2">
              {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                <details key={t} className="rounded-xl border border-sand-300 bg-white">
                  <summary className="cursor-pointer px-4 py-2 text-sm font-semibold">{BLOCK_LABELS[t]}</summary>
                  <form action={saveBlockAction} className="space-y-3 border-t border-sand-300 p-4">
                    <input type="hidden" name="lesson_id" value={lessonId} /><input type="hidden" name="block_type" value={t} /><input type="hidden" name="back" value={back} />
                    <BlockFields type={t} opts={opts} />
                    <SubmitButton size="sm" pendingLabel="Ajout…">Ajouter</SubmitButton>
                  </form>
                </details>
              ))}
            </div>
          </Card>
        </div>

        <aside>
          <Card>
            <h2 className="font-bold">Paramètres de la leçon</h2>
            <form action={updateLessonAction} className="mt-3 space-y-3">
              <input type="hidden" name="lesson_id" value={lessonId} /><input type="hidden" name="back" value={back} />
              <Field label="Titre"><Input name="title" defaultValue={lesson.title} required /></Field>
              <Field label="Résumé"><Input name="summary" defaultValue={lesson.summary ?? ""} /></Field>
              <Field label="Durée (minutes)"><Input name="estimated_minutes" type="number" min={1} defaultValue={lesson.estimated_minutes ?? ""} /></Field>
              <Field label="Module"><Select name="module_id" defaultValue={lesson.module_id}>{(modules ?? []).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Select></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_preview" defaultChecked={lesson.is_preview} className="accent-forest" /> Leçon d’aperçu (visible sans inscription)</label>
              <SubmitButton size="sm">Enregistrer</SubmitButton>
            </form>
            <form action={deleteLessonAction} className="mt-6 border-t border-sand-300 pt-4">
              <input type="hidden" name="lesson_id" value={lessonId} /><input type="hidden" name="course_id" value={id} />
              <SubmitButton variant="ghost" size="sm" className="text-red-700" confirm="Supprimer cette leçon et son contenu ?" pendingLabel="…"><Trash2 className="h-4 w-4" /> Supprimer la leçon</SubmitButton>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  );
}
