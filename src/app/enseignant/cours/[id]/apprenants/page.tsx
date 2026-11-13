import Link from "next/link";
import { Users } from "lucide-react";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { loadManagedCourse } from "@/lib/teacher";
import { formatDate, formatDuration } from "@/lib/utils";
import { setEnrollmentStatusAction } from "../../../actions";

export const metadata = { title: "Apprenants du cours" };

export default async function LearnersPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, course } = await loadManagedCourse(id);
  const back = `/enseignant/cours/${id}/apprenants`;
  const [{ data: enr }, { data: progress }, { data: exercises }] = await Promise.all([
    supabase.from("enrollments").select("id, student_id, status, progress_percent, enrolled_at, completed_at, profiles(full_name, first_name, email)").eq("course_id", id).order("enrolled_at", { ascending: false }),
    supabase.from("lesson_progress").select("student_id, time_spent_seconds, last_viewed_at").eq("course_id", id),
    supabase.from("exercises").select("id, title").eq("course_id", id).eq("is_published", true),
  ]);
  const exIds = (exercises ?? []).map((e) => e.id);
  const { data: attempts } = exIds.length ? await supabase.from("quiz_attempts").select("student_id, exercise_id, score, passed").in("exercise_id", exIds) : { data: [] };
  const best = new Map<string, number>();
  (attempts ?? []).forEach((a) => { const k = `${a.student_id}:${a.exercise_id}`; best.set(k, Math.max(best.get(k) ?? 0, Number(a.score))); });
  const time = new Map<string, { s: number; last: string | null }>();
  (progress ?? []).forEach((p) => { const t = time.get(p.student_id) ?? { s: 0, last: null }; t.s += p.time_spent_seconds; if (!t.last || p.last_viewed_at > t.last) t.last = p.last_viewed_at; time.set(p.student_id, t); });

  return (
    <div className="container-kd py-8">
      <Link href={`/enseignant/cours/${id}`} className="text-sm text-ink-500 hover:text-forest">← {course.title}</Link>
      <PageHeader title="Apprenants et résultats" description={`${(enr ?? []).length} inscription(s)`} />
      <Flash searchParams={sp} />
      {(enr ?? []).length === 0 ? <EmptyState icon={<Users className="h-10 w-10" />} title="Aucun apprenant inscrit pour le moment." /> : (
        <div className="overflow-x-auto rounded-2xl border border-sand-300 bg-white">
          <table className="table-kd">
            <thead><tr><th>Apprenant</th><th>Progression</th><th>Temps</th><th>Dernière activité</th>{(exercises ?? []).map((e) => <th key={e.id} className="min-w-24">{e.title}</th>)}<th>Statut</th></tr></thead>
            <tbody>
              {(enr ?? []).map((e) => {
                const p = e.profiles as unknown as { full_name: string; first_name: string; email: string } | null;
                const t = time.get(e.student_id);
                return (
                  <tr key={e.id}>
                    <td><div className="font-semibold">{p?.full_name || p?.first_name || "—"}</div><div className="text-xs text-ink-400">{p?.email}</div></td>
                    <td>{Math.round(Number(e.progress_percent))} %{e.status === "completed" && <Badge tone="green" className="ml-1">Terminé</Badge>}</td>
                    <td>{formatDuration(t?.s ?? 0)}</td>
                    <td className="whitespace-nowrap text-ink-500">{t?.last ? formatDate(t.last, { dateStyle: "short" }) : "—"}</td>
                    {(exercises ?? []).map((x) => { const s = best.get(`${e.student_id}:${x.id}`); return <td key={x.id}>{s === undefined ? "—" : `${Math.round(s)} %`}</td>; })}
                    <td>
                      <form action={setEnrollmentStatusAction}>
                        <input type="hidden" name="enrollment_id" value={e.id} /><input type="hidden" name="back" value={back} />
                        <input type="hidden" name="status" value={e.status === "suspended" ? "active" : "suspended"} />
                        <SubmitButton variant="ghost" size="sm" pendingLabel="…">{e.status === "suspended" ? "Réactiver" : "Suspendre"}</SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
