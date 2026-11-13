import Link from "next/link";
import { BookOpen, ClipboardCheck, MessagesSquare, PlusCircle, Users } from "lucide-react";
import { Badge, ButtonLink, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { LEVEL_LABELS, STATUS_LABELS, formatDate } from "@/lib/utils";
import type { ContentStatus } from "@/lib/types";

export const metadata = { title: "Espace enseignant" };

const TONE: Record<ContentStatus, "neutral" | "green" | "gold" | "red"> = { draft: "neutral", pending_review: "gold", published: "green", archived: "red" };

export default async function TeacherHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireStaff();
  const supabase = await createClient();
  // la RLS ne renvoie que les cours que l'utilisateur peut gérer (+ publiés) : on filtre sur la gestion
  let q = supabase.from("courses").select("id, title, slug, status, level, updated_at, review_notes, teacher_id, enrollments(count), lessons(count)").order("updated_at", { ascending: false });
  if (!user.isAdmin) {
    const { data: co } = await supabase.from("course_teachers").select("course_id").eq("teacher_id", user.id);
    const coIds = (co ?? []).map((c) => c.course_id);
    q = q.or([`teacher_id.eq.${user.id}`, `created_by.eq.${user.id}`, ...(coIds.length ? [`id.in.(${coIds.join(",")})`] : [])].join(","));
  }
  const { data: courses } = await q;
  const ids = (courses ?? []).map((c) => c.id);
  const [{ count: pendingSubs }, { count: openQuestions }] = await Promise.all([
    ids.length ? supabase.from("assignment_submissions").select("id, assignments!inner(course_id)", { count: "exact", head: true }).eq("status", "submitted").in("assignments.course_id", ids) : Promise.resolve({ count: 0 }),
    ids.length ? supabase.from("course_questions").select("id", { count: "exact", head: true }).eq("is_resolved", false).in("course_id", ids) : Promise.resolve({ count: 0 }),
  ]);
  const students = (courses ?? []).reduce((s, c) => s + ((c.enrollments as unknown as { count: number }[])?.[0]?.count ?? 0), 0);

  return (
    <div className="container-kd py-8">
      <PageHeader title="Espace enseignant" description={user.isAdmin ? "En tant qu’administrateur, vous voyez tous les cours." : "Vos cours, vos apprenants et vos contenus."}
        actions={<ButtonLink href="/enseignant/cours/nouveau"><PlusCircle className="h-4 w-4" /> Créer un cours</ButtonLink>} />
      <Flash searchParams={sp} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Cours" value={(courses ?? []).length} icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="Inscriptions" value={students} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Devoirs à corriger" value={pendingSubs ?? 0} icon={<ClipboardCheck className="h-5 w-5" />} />
        <StatCard label="Questions ouvertes" value={openQuestions ?? 0} icon={<MessagesSquare className="h-5 w-5" />} />
      </div>
      <h2 className="mb-3 mt-8 text-xl font-extrabold">Mes cours</h2>
      {(courses ?? []).length === 0 ? (
        <EmptyState icon={<BookOpen className="h-10 w-10" />} title="Vous n’avez pas encore de cours." action={<ButtonLink href="/enseignant/cours/nouveau">Créer mon premier cours</ButtonLink>} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-sand-300 bg-white">
          <table className="table-kd">
            <thead><tr><th>Cours</th><th>Statut</th><th>Niveau</th><th>Leçons</th><th>Inscrits</th><th>Modifié</th><th /></tr></thead>
            <tbody>
              {(courses ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold"><Link href={`/enseignant/cours/${c.id}`} className="hover:text-forest">{c.title}</Link>{c.review_notes && c.status === "draft" && <p className="text-xs text-red-700">À revoir : {c.review_notes}</p>}</td>
                  <td><Badge tone={TONE[c.status as ContentStatus]}>{STATUS_LABELS[c.status as ContentStatus]}</Badge></td>
                  <td>{LEVEL_LABELS[c.level as keyof typeof LEVEL_LABELS]}</td>
                  <td>{(c.lessons as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
                  <td>{(c.enrollments as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
                  <td className="whitespace-nowrap text-ink-500">{formatDate(c.updated_at, { dateStyle: "short" })}</td>
                  <td className="whitespace-nowrap"><Link className="link text-xs" href={`/enseignant/cours/${c.id}/apprenants`}>Apprenants</Link> · <Link className="link text-xs" href={`/enseignant/cours/${c.id}/devoirs`}>Devoirs</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
