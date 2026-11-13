import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Plus, Trash2 } from "lucide-react";
import { Badge, ButtonLink, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { MoveButtons } from "@/components/teacher/MoveButtons";
import { QuestionFields, answersToText } from "@/components/teacher/QuestionForm";
import { loadManagedCourse } from "@/lib/teacher";
import { EXERCISE_KIND_LABELS, QUESTION_TYPE_LABELS } from "@/lib/utils";
import type { QuestionType } from "@/lib/types";
import { deleteExerciseAction, deleteQuestionAction, saveQuestionAction, updateExerciseAction } from "../../../../actions";

export const metadata = { title: "Éditeur d’exercice" };

export default async function ExerciseEditor({ params, searchParams }: { params: Promise<{ id: string; exId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id, exId } = await params;
  const sp = await searchParams;
  const { supabase, course } = await loadManagedCourse(id);
  const back = `/enseignant/cours/${id}/exercices/${exId}`;
  const { data: ex } = await supabase.from("exercises").select("*").eq("id", exId).eq("course_id", id).maybeSingle();
  if (!ex) notFound();
  const [{ data: questions }, { data: modules }, { data: lessons }, { data: audios }, { data: attempts }] = await Promise.all([
    supabase.from("questions").select("*, answers(content, is_correct, match_key, position)").eq("exercise_id", exId).order("position"),
    supabase.from("course_modules").select("id, title").eq("course_id", id).order("position"),
    supabase.from("lessons").select("id, title").eq("course_id", id).order("position"),
    supabase.from("audio_resources").select("id, title").order("created_at", { ascending: false }).limit(200),
    supabase.from("quiz_attempts").select("score, passed").eq("exercise_id", exId),
  ]);
  const avg = (attempts ?? []).length ? (attempts ?? []).reduce((s, a) => s + Number(a.score), 0) / (attempts ?? []).length : null;

  return (
    <div className="container-kd py-8">
      <Link href={`/enseignant/cours/${id}`} className="text-sm text-ink-500 hover:text-forest">← {course.title}</Link>
      <PageHeader eyebrow={EXERCISE_KIND_LABELS[ex.kind as keyof typeof EXERCISE_KIND_LABELS]} title={ex.title}
        actions={<ButtonLink href={`/exercices/${exId}`} variant="outline" size="sm"><Eye className="h-4 w-4" /> Tester</ButtonLink>} />
      <Flash searchParams={sp} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={ex.is_published ? "green" : "neutral"}>{ex.is_published ? "Publié" : "Brouillon — invisible pour les apprenants"}</Badge>
        <Badge>{(attempts ?? []).length} tentative(s)</Badge>
        {avg !== null && <Badge tone="blue">Score moyen : {Math.round(avg)} %</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {(questions ?? []).map((q, i) => (
            <Card key={q.id} className="p-0">
              <div className="flex items-center gap-2 border-b border-sand-300 bg-sand-100 px-4 py-2">
                <span className="font-bold">Q{i + 1}</span><Badge>{QUESTION_TYPE_LABELS[q.type as QuestionType]}</Badge><Badge tone="gold">{q.points} pt</Badge>
                <span className="flex-1" />
                <MoveButtons table="questions" id={q.id} scope={exId} back={back} />
                <form action={deleteQuestionAction}><input type="hidden" name="question_id" value={q.id} /><input type="hidden" name="back" value={back} />
                  <SubmitButton variant="ghost" size="sm" className="text-red-700" confirm="Supprimer cette question ?" pendingLabel="…" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></SubmitButton></form>
              </div>
              <div className="px-4 py-3">
                <p className="mnk font-semibold">{q.prompt}</p>
                <pre className="mnk mt-2 whitespace-pre-wrap rounded-lg bg-sand-100 p-2 text-sm">{answersToText({ ...q, answers: (q.answers ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position) })}</pre>
              </div>
              <details className="border-t border-sand-300">
                <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-forest">Modifier</summary>
                <form action={saveQuestionAction} className="p-4 pt-0">
                  <input type="hidden" name="exercise_id" value={exId} /><input type="hidden" name="question_id" value={q.id} /><input type="hidden" name="back" value={back} />
                  <QuestionFields q={{ ...q, answers: (q.answers ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position) }} audios={audios ?? []} />
                  <SubmitButton size="sm" className="mt-3">Enregistrer</SubmitButton>
                </form>
              </details>
            </Card>
          ))}
          <Card className="border-2 border-dashed border-forest-200 bg-forest-50/40">
            <h2 className="flex items-center gap-2 font-bold"><Plus className="h-4 w-4" /> Ajouter une question</h2>
            <div className="mt-3 space-y-2">
              {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                <details key={t} className="rounded-xl border border-sand-300 bg-white">
                  <summary className="cursor-pointer px-4 py-2 text-sm font-semibold">{QUESTION_TYPE_LABELS[t]}</summary>
                  <form action={saveQuestionAction} className="border-t border-sand-300 p-4">
                    <input type="hidden" name="exercise_id" value={exId} /><input type="hidden" name="back" value={back} />
                    <QuestionFields q={{ type: t }} audios={audios ?? []} />
                    <SubmitButton size="sm" className="mt-3" pendingLabel="Ajout…">Ajouter la question</SubmitButton>
                  </form>
                </details>
              ))}
            </div>
          </Card>
        </div>

        <aside>
          <Card>
            <h2 className="font-bold">Paramètres</h2>
            <form action={updateExerciseAction} className="mt-3 space-y-3">
              <input type="hidden" name="exercise_id" value={exId} /><input type="hidden" name="back" value={back} />
              <Field label="Titre"><Input name="title" defaultValue={ex.title} required /></Field>
              <Field label="Consigne"><Textarea name="description" defaultValue={ex.description ?? ""} className="min-h-16" /></Field>
              <Field label="Type"><Select name="kind" defaultValue={ex.kind}>{Object.entries(EXERCISE_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Difficulté"><Select name="difficulty" defaultValue={String(ex.difficulty)}><option value="1">1 — facile</option><option value="2">2 — moyen</option><option value="3">3 — difficile</option></Select></Field>
                <Field label="Réussite (%)"><Input name="pass_score" type="number" min={0} max={100} defaultValue={ex.pass_score} /></Field>
              </div>
              <Field label="Tentatives max." hint="Vide = illimité"><Input name="max_attempts" type="number" min={1} defaultValue={ex.max_attempts ?? ""} /></Field>
              <Field label="Module"><Select name="module_id" defaultValue={ex.module_id ?? ""}><option value="">Tout le cours</option>{(modules ?? []).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Select></Field>
              <Field label="Leçon"><Select name="lesson_id" defaultValue={ex.lesson_id ?? ""}><option value="">Aucune</option>{(lessons ?? []).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</Select></Field>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="is_published" defaultChecked={ex.is_published} className="accent-forest" /> Publié</label>
              <SubmitButton size="sm">Enregistrer</SubmitButton>
            </form>
            <form action={deleteExerciseAction} className="mt-6 border-t border-sand-300 pt-4">
              <input type="hidden" name="exercise_id" value={exId} /><input type="hidden" name="course_id" value={id} />
              <SubmitButton variant="ghost" size="sm" className="text-red-700" confirm="Supprimer cet exercice et toutes les tentatives associées ?" pendingLabel="…"><Trash2 className="h-4 w-4" /> Supprimer l’exercice</SubmitButton>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  );
}
