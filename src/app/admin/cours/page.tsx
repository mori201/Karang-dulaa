import Link from "next/link";
import { Badge, Card, Input, PageHeader, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, formatDate } from "@/lib/utils";
import type { ContentStatus } from "@/lib/types";
import { assignTeacherAction, coTeacherAction, reviewCourseAction } from "../actions";

export const metadata = { title: "Cours — administration" };

export default async function AdminCourses({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: courses }, { data: teachers }, { data: co }] = await Promise.all([
    supabase.from("courses").select("id, title, slug, status, teacher_id, updated_at, is_demo, lessons(count), enrollments(count)").order("updated_at", { ascending: false }),
    supabase.from("users_roles").select("user_id, profiles!users_roles_user_id_fkey(full_name, first_name, email)").eq("role", "teacher"),
    supabase.from("course_teachers").select("course_id, teacher_id"),
  ]);
  const tName = (id: string | null) => {
    const t = (teachers ?? []).find((x) => x.user_id === id);
    const p = t?.profiles as unknown as { full_name: string; first_name: string; email: string } | undefined;
    return p ? p.full_name || p.first_name || p.email : "—";
  };
  const pending = (courses ?? []).filter((c) => c.status === "pending_review");
  return (
    <div className="container-kd py-8">
      <PageHeader title="Cours et validation des publications" />
      <Flash searchParams={sp} />
      <h2 className="mb-3 text-lg font-bold">En attente de validation ({pending.length})</h2>
      {pending.length === 0 ? <p className="mb-8 text-sm text-ink-500">Aucun cours en attente.</p> : (
        <div className="mb-8 space-y-3">
          {pending.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{c.title}</span><span className="text-sm text-ink-500">par {tName(c.teacher_id)}</span>
                <Link className="link text-sm" href={`/enseignant/cours/${c.id}`}>Relire le contenu</Link> · <Link className="link text-sm" href={`/academie/${c.slug}`}>Aperçu apprenant</Link></div>
              <form action={reviewCourseAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="course_id" value={c.id} /><input type="hidden" name="back" value="/admin/cours" />
                <Input name="notes" placeholder="Commentaire pour l’enseignant (obligatoire en cas de refus)" className="flex-1" aria-label="Commentaire" />
                <SubmitButton name="decision" value="approve" pendingLabel="…">Publier</SubmitButton>
                <SubmitButton name="decision" value="reject" variant="outline" pendingLabel="…">Demander des modifications</SubmitButton>
              </form>
            </Card>
          ))}
        </div>
      )}
      <h2 className="mb-3 text-lg font-bold">Tous les cours</h2>
      <div className="overflow-x-auto rounded-2xl border border-sand-300 bg-white">
        <table className="table-kd">
          <thead><tr><th>Cours</th><th>Statut</th><th>Leçons</th><th>Inscrits</th><th>Responsable</th><th>Co-enseignants</th></tr></thead>
          <tbody>
            {(courses ?? []).map((c) => (
              <tr key={c.id}>
                <td><Link href={`/enseignant/cours/${c.id}`} className="font-semibold hover:text-forest">{c.title}</Link>{c.is_demo && <Badge tone="gold" className="ml-1">Démo</Badge>}<div className="text-xs text-ink-400">{formatDate(c.updated_at, { dateStyle: "short" })}</div></td>
                <td><Badge>{STATUS_LABELS[c.status as ContentStatus]}</Badge></td>
                <td>{(c.lessons as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
                <td>{(c.enrollments as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
                <td>
                  <form action={assignTeacherAction} className="flex gap-1">
                    <input type="hidden" name="course_id" value={c.id} /><input type="hidden" name="back" value="/admin/cours" />
                    <Select name="teacher_id" defaultValue={c.teacher_id ?? ""} className="h-8 text-xs" aria-label="Enseignant responsable"><option value="">Équipe pédagogique</option>{(teachers ?? []).map((t) => <option key={t.user_id} value={t.user_id}>{tName(t.user_id)}</option>)}</Select>
                    <SubmitButton size="sm" variant="ghost" pendingLabel="…">OK</SubmitButton>
                  </form>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">{(co ?? []).filter((x) => x.course_id === c.id).map((x) => (
                    <form key={x.teacher_id} action={coTeacherAction}><input type="hidden" name="course_id" value={c.id} /><input type="hidden" name="teacher_id" value={x.teacher_id} /><input type="hidden" name="op" value="remove" /><input type="hidden" name="back" value="/admin/cours" />
                      <button className="rounded-full bg-sand-200 px-2 py-0.5 text-xs hover:bg-red-100" title="Retirer">{tName(x.teacher_id)} ×</button></form>
                  ))}</div>
                  <form action={coTeacherAction} className="mt-1 flex gap-1"><input type="hidden" name="course_id" value={c.id} /><input type="hidden" name="op" value="add" /><input type="hidden" name="back" value="/admin/cours" />
                    <Select name="teacher_id" className="h-8 text-xs" required aria-label="Ajouter un co-enseignant"><option value="">+ ajouter</option>{(teachers ?? []).filter((t) => t.user_id !== c.teacher_id).map((t) => <option key={t.user_id} value={t.user_id}>{tName(t.user_id)}</option>)}</Select>
                    <SubmitButton size="sm" variant="ghost" pendingLabel="…">+</SubmitButton></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
