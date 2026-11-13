import Link from "next/link";
import { Badge, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { loadManagedCourse } from "@/lib/teacher";
import { signedUrls } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import { gradeSubmissionAction, saveAssignmentAction } from "../../../actions";

export const metadata = { title: "Devoirs" };

export default async function AssignmentsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, course } = await loadManagedCourse(id);
  const back = `/enseignant/cours/${id}/devoirs`;
  const [{ data: assignments }, { data: lessons }] = await Promise.all([
    supabase.from("assignments").select("*, assignment_submissions(id, student_id, content, file_path, status, score, feedback, submitted_at, profiles(full_name, first_name))").eq("course_id", id).order("created_at"),
    supabase.from("lessons").select("id, title").eq("course_id", id).order("position"),
  ]);
  const paths = (assignments ?? []).flatMap((a) => (a.assignment_submissions ?? []).map((s: { file_path: string | null }) => s.file_path).filter(Boolean)) as string[];
  const urls = await signedUrls("submissions", paths);

  return (
    <div className="container-kd max-w-5xl py-8">
      <Link href={`/enseignant/cours/${id}`} className="text-sm text-ink-500 hover:text-forest">← {course.title}</Link>
      <PageHeader title="Devoirs et corrections" />
      <Flash searchParams={sp} />
      <div className="space-y-6">
        {(assignments ?? []).map((a) => {
          const subs = (a.assignment_submissions ?? []) as { id: string; content: string | null; file_path: string | null; status: string; score: number | null; feedback: string | null; submitted_at: string; profiles: { full_name: string; first_name: string } | null }[];
          return (
            <Card key={a.id}>
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                  <span className="text-lg font-bold">{a.title}</span>
                  <Badge>{subs.length} copie(s)</Badge>
                  {subs.some((s) => s.status === "submitted") && <Badge tone="gold">{subs.filter((s) => s.status === "submitted").length} à corriger</Badge>}
                </summary>
                <form action={saveAssignmentAction} className="mt-4 space-y-3 rounded-xl bg-sand-100 p-4">
                  <input type="hidden" name="assignment_id" value={a.id} /><input type="hidden" name="course_id" value={id} /><input type="hidden" name="back" value={back} />
                  <Field label="Titre"><Input name="title" defaultValue={a.title} required /></Field>
                  <Field label="Consigne"><Textarea name="instructions" defaultValue={a.instructions} /></Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Leçon"><Select name="lesson_id" defaultValue={a.lesson_id ?? ""}><option value="">—</option>{(lessons ?? []).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</Select></Field>
                    <Field label="Date limite"><Input name="due_at" type="datetime-local" defaultValue={a.due_at ? new Date(a.due_at).toISOString().slice(0, 16) : ""} /></Field>
                    <Field label="Noté sur"><Input name="max_score" type="number" min={1} defaultValue={a.max_score} /></Field>
                  </div>
                  <SubmitButton size="sm" variant="secondary">Enregistrer le devoir</SubmitButton>
                </form>
              </details>
              <ul className="mt-4 space-y-3">
                {subs.map((s) => (
                  <li key={s.id} className="rounded-xl border border-sand-300 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{s.profiles?.full_name || s.profiles?.first_name || "Apprenant"}</span>
                      <span className="text-xs text-ink-400">Rendu le {formatDate(s.submitted_at, { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                    {s.content && <p className="mnk mt-2 whitespace-pre-line text-ink-600">{s.content}</p>}
                    {s.file_path && urls.get(s.file_path) && <a href={urls.get(s.file_path)} className="link mt-1 inline-block text-sm" target="_blank" rel="noopener">Fichier joint</a>}
                    <form action={gradeSubmissionAction} className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
                      <input type="hidden" name="submission_id" value={s.id} /><input type="hidden" name="max_score" value={a.max_score} /><input type="hidden" name="back" value={back} />
                      <Input name="score" defaultValue={s.score ?? ""} required inputMode="decimal" aria-label={`Note sur ${a.max_score}`} placeholder={`/ ${a.max_score}`} />
                      <Input name="feedback" defaultValue={s.feedback ?? ""} placeholder="Commentaire pour l’apprenant" aria-label="Commentaire" />
                      <SubmitButton size="sm" pendingLabel="…">{s.status === "graded" ? "Modifier la note" : "Noter"}</SubmitButton>
                    </form>
                  </li>
                ))}
                {subs.length === 0 && <li className="text-sm text-ink-500">Aucune copie rendue.</li>}
              </ul>
            </Card>
          );
        })}
        <Card className="border-2 border-dashed border-forest-200">
          <h2 className="font-bold">Nouveau devoir</h2>
          <form action={saveAssignmentAction} className="mt-3 space-y-3">
            <input type="hidden" name="course_id" value={id} /><input type="hidden" name="back" value={back} />
            <Field label="Titre"><Input name="title" required /></Field>
            <Field label="Consigne"><Textarea name="instructions" required /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Leçon"><Select name="lesson_id"><option value="">—</option>{(lessons ?? []).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</Select></Field>
              <Field label="Date limite"><Input name="due_at" type="datetime-local" /></Field>
              <Field label="Noté sur"><Input name="max_score" type="number" min={1} defaultValue={20} /></Field>
            </div>
            <SubmitButton>Créer le devoir</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
