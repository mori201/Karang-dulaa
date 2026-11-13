import { Card, EmptyState, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { managedCourses } from "@/lib/managed";
import { formatDate } from "@/lib/utils";
import { createAnnouncementAction, deleteAnnouncementAction } from "../actions";

export const metadata = { title: "Annonces" };

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireStaff();
  const supabase = await createClient();
  const courses = await managedCourses(user);
  const ids = courses.map((c) => c.id);
  let q = supabase.from("announcements").select("id, title, body, created_at, course_id, author_id").order("created_at", { ascending: false }).limit(50);
  q = user.isAdmin ? q : q.in("course_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const { data: list } = await q;
  return (
    <div className="container-kd max-w-4xl py-8">
      <PageHeader title="Annonces" description="Les apprenants inscrits reçoivent une notification." />
      <Flash searchParams={sp} />
      <Card>
        <form action={createAnnouncementAction} className="space-y-3">
          <Field label="Destinataires"><Select name="course_id" required={!user.isAdmin}>
            {user.isAdmin && <option value="">Toute l’école (annonce générale)</option>}
            {courses.map((c) => <option key={c.id} value={c.id}>Apprenants de « {c.title} »</option>)}
          </Select></Field>
          <Field label="Titre"><Input name="title" required maxLength={200} /></Field>
          <Field label="Message"><Textarea name="body" required maxLength={5000} /></Field>
          <SubmitButton pendingLabel="Publication…">Publier l’annonce</SubmitButton>
        </form>
      </Card>
      <h2 className="mb-3 mt-8 font-bold">Annonces publiées</h2>
      {(list ?? []).length === 0 ? <EmptyState title="Aucune annonce." /> : (
        <ul className="space-y-3">
          {(list ?? []).map((a) => (
            <Card key={a.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="text-xs text-ink-400">{a.course_id ? courses.find((c) => c.id === a.course_id)?.title ?? "Cours" : "Toute l’école"} · {formatDate(a.created_at)}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-600">{a.body}</p>
              </div>
              {(user.isAdmin || a.author_id === user.id) && <form action={deleteAnnouncementAction}><input type="hidden" name="id" value={a.id} /><SubmitButton variant="ghost" size="sm" confirm="Supprimer cette annonce ?" pendingLabel="…">Supprimer</SubmitButton></form>}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
