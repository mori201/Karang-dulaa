import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { managedCourses } from "@/lib/managed";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Questions des apprenants" };

export default async function TeacherQuestions() {
  const user = await requireStaff();
  const supabase = await createClient();
  const courses = await managedCourses(user);
  const ids = courses.map((c) => c.id);
  const { data } = ids.length
    ? await supabase.from("course_questions").select("id, title, body, is_resolved, created_at, course_id, course_question_replies(count)").in("course_id", ids).order("is_resolved").order("created_at", { ascending: false }).limit(100)
    : { data: [] };
  return (
    <div className="container-kd max-w-4xl py-8">
      <PageHeader title="Questions des apprenants" description="Répondez depuis la page « Questions & échanges » de chaque cours." />
      {(data ?? []).length === 0 ? <EmptyState title="Aucune question." /> : (
        <ul className="space-y-3">
          {(data ?? []).map((q) => {
            const c = courses.find((x) => x.id === q.course_id)!;
            return (
              <Card key={q.id}>
                <Link href={`/academie/${c.slug}/questions`} className="font-semibold hover:text-forest">{q.title}</Link>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink-400">
                  <span>{c.title}</span><span>{formatDate(q.created_at)}</span>
                  <Badge tone={q.is_resolved ? "green" : "gold"}>{q.is_resolved ? "Résolue" : "Ouverte"}</Badge>
                  <Badge>{(q.course_question_replies as unknown as { count: number }[])?.[0]?.count ?? 0} réponse(s)</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-ink-600">{q.body}</p>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
