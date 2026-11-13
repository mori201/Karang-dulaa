import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, MessagesSquare } from "lucide-react";
import { Badge, Card, EmptyState, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { withFlash } from "@/lib/flash";
import { formatDate } from "@/lib/utils";
import { askQuestionAction, replyQuestionAction } from "../../actions";

export const metadata = { title: "Questions & échanges" };

export default async function QuestionsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/academie/${slug}/questions`);
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id, title").eq("slug", slug).maybeSingle();
  if (!course) notFound();
  const { data: allowed } = await supabase.rpc("can_read_course_content", { cid: course.id });
  if (!allowed) redirect(withFlash(`/academie/${slug}`, "erreur", "Inscrivez-vous au cours pour participer aux échanges."));
  const { data: canManage } = await supabase.rpc("can_manage_course", { cid: course.id });

  const { data: questions } = await supabase
    .from("course_questions")
    .select("id, title, body, is_resolved, created_at, author_id, course_question_replies(id, body, created_at, author_id)")
    .eq("course_id", course.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const authorIds = Array.from(new Set((questions ?? []).flatMap((q) => [q.author_id, ...(q.course_question_replies ?? []).map((r) => r.author_id)])));
  const { data: authors } = authorIds.length ? await supabase.from("profiles").select("id, first_name, full_name").in("id", authorIds) : { data: [] };
  const { data: staffRoles } = authorIds.length ? await supabase.from("teachers").select("user_id").in("user_id", authorIds) : { data: [] };
  const nameOf = (id: string) => {
    if (id === user.id) return "Vous";
    const a = (authors ?? []).find((x) => x.id === id);
    return a?.first_name || a?.full_name || "Un apprenant";
  };
  const isTeacher = (id: string) => (staffRoles ?? []).some((t) => t.user_id === id);

  return (
    <div className="container-kd max-w-4xl py-8">
      <Link href={`/academie/${slug}`} className="text-sm text-ink-500 hover:text-forest">← {course.title}</Link>
      <PageHeader title="Questions & échanges" description="Posez vos questions sur le cours : l’enseignant et les autres apprenants peuvent vous répondre. Restez courtois et bienveillant." />
      <Flash searchParams={sp} />
      <Card className="mb-8">
        <form action={askQuestionAction} className="space-y-3">
          <input type="hidden" name="course_id" value={course.id} />
          <input type="hidden" name="slug" value={slug} />
          <Field label="Titre" htmlFor="title"><Input id="title" name="title" required minLength={3} maxLength={200} placeholder="Ex. : Comment prononcer ŋ en début de mot ?" /></Field>
          <Field label="Votre question" htmlFor="body"><Textarea id="body" name="body" required maxLength={5000} /></Field>
          <SubmitButton pendingLabel="Publication…">Publier la question</SubmitButton>
        </form>
      </Card>
      {(questions ?? []).length === 0 ? (
        <EmptyState icon={<MessagesSquare className="h-10 w-10" />} title="Aucune question pour l’instant" description="Soyez le premier ou la première à lancer la discussion." />
      ) : (
        <div className="space-y-4">
          {(questions ?? []).map((q) => (
            <Card key={q.id}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold">{q.title}</h2>
                {q.is_resolved && <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Résolue</Badge>}
              </div>
              <p className="text-xs text-ink-400">{nameOf(q.author_id)} · {formatDate(q.created_at, { dateStyle: "medium", timeStyle: "short" })}</p>
              <p className="mt-2 whitespace-pre-line text-ink-600">{q.body}</p>
              <div className="mt-4 space-y-3 border-l-2 border-sand-300 pl-4">
                {(q.course_question_replies ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((r) => (
                  <div key={r.id}>
                    <p className="text-xs text-ink-400">
                      <span className="font-semibold text-ink-600">{nameOf(r.author_id)}</span>
                      {isTeacher(r.author_id) && <Badge tone="gold" className="ml-1">Enseignant</Badge>} · {formatDate(r.created_at, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    <p className="whitespace-pre-line text-sm text-ink-600">{r.body}</p>
                  </div>
                ))}
                <form action={replyQuestionAction} className="space-y-2">
                  <input type="hidden" name="question_id" value={q.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <Textarea name="body" required maxLength={5000} placeholder="Votre réponse…" className="min-h-16" aria-label="Votre réponse" />
                  <div className="flex items-center gap-3">
                    <SubmitButton size="sm" variant="secondary" pendingLabel="…">Répondre</SubmitButton>
                    {(canManage || q.author_id === user.id) && !q.is_resolved && (
                      <label className="flex items-center gap-1.5 text-xs text-ink-500"><input type="checkbox" name="resolve" className="accent-forest" /> Marquer comme résolue</label>
                    )}
                  </div>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
