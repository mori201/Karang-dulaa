import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { QuizPlayer } from "@/components/learn/QuizPlayer";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";
import { EXERCISE_KIND_LABELS, formatDate } from "@/lib/utils";
import type { StudentExercise } from "@/lib/types";

export const metadata = { title: "Exercice" };

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/exercices/${id}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_exercise_for_student", { p_exercise: id });
  if (error || !data) {
    const { data: ex } = await supabase.from("exercises").select("course_id, courses(slug)").eq("id", id).maybeSingle();
    if (!ex) notFound();
    const slug = (ex.courses as unknown as { slug: string } | null)?.slug;
    return (
      <div className="container-kd max-w-2xl py-12">
        <Alert tone="warning">Cet exercice est réservé aux apprenants inscrits au cours. {slug && <Link className="link" href={`/academie/${slug}`}>Voir le cours</Link>}</Alert>
      </div>
    );
  }
  const exercise = data as StudentExercise;
  const [{ data: course }, { data: attempts }] = await Promise.all([
    supabase.from("courses").select("title, slug").eq("id", exercise.course_id).maybeSingle(),
    supabase.from("quiz_attempts").select("id, score, passed, submitted_at").eq("exercise_id", id).eq("student_id", user.id).order("submitted_at", { ascending: false }).limit(5),
  ]);
  const audioIds = exercise.questions.map((q) => q.audio_id).filter(Boolean) as string[];
  const audioUrls: Record<string, string> = {};
  if (audioIds.length) {
    const { data: audios } = await supabase.from("audio_resources").select("id, storage_path").in("id", audioIds);
    const urls = await signedUrls("audio", (audios ?? []).map((a) => a.storage_path));
    (audios ?? []).forEach((a) => { const u = urls.get(a.storage_path); if (u) audioUrls[a.id] = u; });
  }
  const exhausted = exercise.max_attempts !== null && exercise.attempts_used >= exercise.max_attempts;

  return (
    <div className="container-kd max-w-3xl py-8">
      {course && <Link href={`/academie/${course.slug}`} className="text-sm text-ink-500 hover:text-forest">← {course.title}</Link>}
      <PageHeader eyebrow={EXERCISE_KIND_LABELS[exercise.kind]} title={exercise.title} description={exercise.description ?? undefined} />
      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        <Badge>{exercise.questions.length} question{exercise.questions.length > 1 ? "s" : ""}</Badge>
        <Badge tone="gold">Réussite à {exercise.pass_score} %</Badge>
        <Badge tone="blue">Difficulté {"●".repeat(exercise.difficulty)}{"○".repeat(3 - exercise.difficulty)}</Badge>
        {exercise.max_attempts && <Badge>{exercise.attempts_used}/{exercise.max_attempts} tentatives</Badge>}
      </div>
      {exhausted ? (
        <Alert tone="info">Vous avez utilisé toutes vos tentatives pour cette évaluation.</Alert>
      ) : exercise.questions.length === 0 ? (
        <Alert tone="info">Cet exercice ne contient pas encore de questions.</Alert>
      ) : (
        <QuizPlayer exercise={exercise} audioUrls={audioUrls} />
      )}
      {(attempts ?? []).length > 0 && (
        <Card className="mt-8">
          <h2 className="font-bold">Mes tentatives précédentes</h2>
          <ul className="mt-2 divide-y divide-sand-300 text-sm">
            {(attempts ?? []).map((a) => (
              <li key={a.id} className="flex justify-between py-2">
                <span>{formatDate(a.submitted_at, { dateStyle: "medium", timeStyle: "short" })}</span>
                <Badge tone={a.passed ? "green" : "red"}>{Math.round(Number(a.score))} %</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
