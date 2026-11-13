import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Card, Field, PageHeader, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { signedUrl } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import { submitAssignmentAction } from "../actions";

export const metadata = { title: "Devoir" };

export default async function AssignmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/devoirs/${id}`);
  const supabase = await createClient();
  const { data: a } = await supabase.from("assignments").select("*, courses(title, slug)").eq("id", id).maybeSingle();
  if (!a) notFound();
  const { data: sub } = await supabase.from("assignment_submissions").select("*").eq("assignment_id", id).eq("student_id", user.id).maybeSingle();
  const fileUrl = sub?.file_path ? await signedUrl("submissions", sub.file_path) : null;
  const course = a.courses as unknown as { title: string; slug: string };
  const late = a.due_at && new Date(a.due_at) < new Date();

  return (
    <div className="container-kd max-w-3xl py-8">
      <Link href={`/academie/${course.slug}`} className="text-sm text-ink-500 hover:text-forest">← {course.title}</Link>
      <PageHeader eyebrow="Devoir" title={a.title} description={a.due_at ? `À rendre avant le ${formatDate(a.due_at, { dateStyle: "long", timeStyle: "short" })}` : undefined} />
      <Flash searchParams={sp} />
      <Card className="mb-6"><p className="whitespace-pre-line text-ink-600">{a.instructions}</p><p className="mt-3 text-sm text-ink-400">Noté sur {a.max_score}.</p></Card>
      {sub?.status === "graded" ? (
        <Card className="border-forest-200 bg-forest-50">
          <div className="flex items-center gap-2"><Badge tone="green">Corrigé</Badge> <span className="text-2xl font-extrabold text-forest">{sub.score} / {a.max_score}</span></div>
          {sub.feedback && <p className="mt-3 whitespace-pre-line text-ink-600">{sub.feedback}</p>}
          <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold">Ma copie</summary><p className="mt-2 whitespace-pre-line">{sub.content}</p>{fileUrl && <a className="link" href={fileUrl}>Fichier joint</a>}</details>
        </Card>
      ) : (
        <Card>
          {sub && <Alert tone="info" className="mb-4">Rendu le {formatDate(sub.submitted_at, { dateStyle: "medium", timeStyle: "short" })}. Vous pouvez le modifier tant qu’il n’est pas corrigé.</Alert>}
          {late && !sub && <Alert tone="warning" className="mb-4">La date limite est dépassée ; vous pouvez encore rendre votre travail.</Alert>}
          <form action={submitAssignmentAction} className="space-y-4">
            <input type="hidden" name="assignment_id" value={a.id} />
            <Field label="Votre réponse" htmlFor="content"><Textarea id="content" name="content" defaultValue={sub?.content ?? ""} className="mnk min-h-40" maxLength={20000} /></Field>
            <Field label="Fichier joint (facultatif)" htmlFor="file" hint="PDF, Word, texte, image ou audio — 50 Mo maximum.">
              <input id="file" name="file" type="file" className="block w-full text-sm" accept=".pdf,.doc,.docx,.txt,image/*,audio/*" />
            </Field>
            {fileUrl && <p className="text-sm">Fichier actuel : <a className="link" href={fileUrl}>ouvrir</a></p>}
            <SubmitButton pendingLabel="Envoi…">{sub ? "Mettre à jour mon devoir" : "Rendre le devoir"}</SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
