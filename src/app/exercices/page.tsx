import Link from "next/link";
import { PenLine } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { EXERCISE_KIND_LABELS } from "@/lib/utils";

export const metadata = { title: "Exercices et évaluations" };

export default async function ExercisesIndex() {
  const user = await requireUser("/exercices");
  const supabase = await createClient();
  const { data: enrollments } = await supabase.from("enrollments").select("course_id, courses(title, slug)").eq("student_id", user.id).neq("status", "dropped");
  const courseIds = (enrollments ?? []).map((e) => e.course_id);
  const { data: exercises } = courseIds.length
    ? await supabase.from("exercises").select("id, title, kind, difficulty, course_id").in("course_id", courseIds).eq("is_published", true).order("created_at")
    : { data: [] };
  const { data: attempts } = await supabase.from("quiz_attempts").select("exercise_id, score, passed").eq("student_id", user.id);
  const best = new Map<string, { score: number; passed: boolean }>();
  (attempts ?? []).forEach((a) => { const p = best.get(a.exercise_id); if (!p || Number(a.score) > p.score) best.set(a.exercise_id, { score: Number(a.score), passed: a.passed }); });

  return (
    <div className="container-kd max-w-4xl py-8">
      <PageHeader title="Exercices et évaluations" description="Tous les exercices des cours auxquels vous êtes inscrit(e), avec votre meilleur score." />
      {(enrollments ?? []).length === 0 ? (
        <EmptyState icon={<PenLine className="h-10 w-10" />} title="Inscrivez-vous à un cours pour accéder aux exercices." action={<Link href="/academie" className="link">Parcourir l’académie</Link>} />
      ) : (
        <div className="space-y-6">
          {(enrollments ?? []).map((e) => {
            const c = e.courses as unknown as { title: string; slug: string };
            const list = (exercises ?? []).filter((x) => x.course_id === e.course_id);
            return (
              <Card key={e.course_id} className="p-0">
                <div className="border-b border-sand-300 px-5 py-3 font-bold"><Link href={`/academie/${c.slug}`} className="hover:text-forest">{c.title}</Link></div>
                {list.length === 0 ? <p className="px-5 py-4 text-sm text-ink-500">Pas encore d’exercice publié.</p> : (
                  <ul className="divide-y divide-sand-300">
                    {list.map((x) => (
                      <li key={x.id}>
                        <Link href={`/exercices/${x.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-sand-100">
                          <span className="flex-1"><span className="font-semibold">{x.title}</span> <span className="text-xs text-ink-400">— {EXERCISE_KIND_LABELS[x.kind as keyof typeof EXERCISE_KIND_LABELS]}</span></span>
                          {best.get(x.id) ? <Badge tone={best.get(x.id)!.passed ? "green" : "red"}>{Math.round(best.get(x.id)!.score)} %</Badge> : <Badge>À faire</Badge>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
