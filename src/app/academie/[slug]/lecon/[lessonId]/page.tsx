import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, ListOrdered, PenLine } from "lucide-react";
import { Alert, Badge, ButtonLink } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { Blocks, resolveBlockMedia } from "@/components/course/Blocks";
import { StudyTimer } from "@/components/learn/StudyTimer";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { withFlash } from "@/lib/flash";
import type { Lesson, LessonBlock, Module } from "@/lib/types";
import { completeLessonAction } from "../../../actions";

type Props = { params: Promise<{ slug: string; lessonId: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("lessons").select("title").eq("id", lessonId).maybeSingle();
  return { title: data?.title ?? "Leçon" };
}

export default async function LessonPage({ params, searchParams }: Props) {
  const { slug, lessonId } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/academie/${slug}/lecon/${lessonId}`);
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("id, title, slug, is_demo").eq("slug", slug).maybeSingle();
  if (!course) notFound();
  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", lessonId).eq("course_id", course.id).maybeSingle<Lesson>();
  if (!lesson) notFound();

  const [{ data: enrollment }, { data: canManage }] = await Promise.all([
    supabase.from("enrollments").select("status").eq("course_id", course.id).eq("student_id", user.id).maybeSingle(),
    supabase.rpc("can_manage_course", { cid: course.id }),
  ]);
  const enrolled = !!enrollment && enrollment.status !== "dropped";
  if (!enrolled && !lesson.is_preview && !canManage) {
    redirect(withFlash(`/academie/${slug}`, "erreur", "Inscrivez-vous au cours pour accéder à cette leçon."));
  }

  const [{ data: modules }, { data: lessons }, { data: blocks }, { data: progress }, { data: lessonExercises }] = await Promise.all([
    supabase.from("course_modules").select("*").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id, title, module_id, position").eq("course_id", course.id).order("position"),
    supabase.from("lesson_contents").select("*").eq("lesson_id", lesson.id).order("position"),
    supabase.from("lesson_progress").select("lesson_id, status").eq("course_id", course.id).eq("student_id", user.id),
    supabase.from("exercises").select("id, title").eq("lesson_id", lesson.id).eq("is_published", true),
  ]);
  const ordered = ((modules ?? []) as Module[]).flatMap((m) => ((lessons ?? []) as Lesson[]).filter((l) => l.module_id === m.id).map((l) => ({ ...l, moduleTitle: m.title })));
  const idx = ordered.findIndex((l) => l.id === lesson.id);
  const prev = ordered[idx - 1];
  const next = ordered[idx + 1];
  const done = new Set((progress ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const resolved = await resolveBlockMedia((blocks ?? []) as LessonBlock[]);
  const linkedIds = new Set(((blocks ?? []) as LessonBlock[]).filter((b) => b.block_type === "exercise_link").map((b) => String(b.data.exercise_id)));
  const extraExercises = (lessonExercises ?? []).filter((e) => !linkedIds.has(e.id));

  return (
    <div className="container-kd grid gap-8 py-6 lg:grid-cols-[280px_1fr]">
      {enrolled && <StudyTimer lessonId={lesson.id} />}
      <aside className="order-2 lg:order-1">
        <details className="rounded-2xl border border-sand-300 bg-white lg:open:block" open>
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-bold"><ListOrdered className="h-4 w-4" /> Sommaire du cours</summary>
          <nav className="max-h-[70vh] overflow-y-auto border-t border-sand-300 p-2 text-sm" aria-label="Leçons du cours">
            {((modules ?? []) as Module[]).map((m) => (
              <div key={m.id} className="mb-2">
                <div className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-ink-400">{m.title}</div>
                {ordered.filter((l) => l.module_id === m.id).map((l) => (
                  <Link key={l.id} href={`/academie/${slug}/lecon/${l.id}`} aria-current={l.id === lesson.id ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${l.id === lesson.id ? "bg-forest-50 font-semibold text-forest-700" : "hover:bg-sand-100"}`}>
                    {done.has(l.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-forest" /> : <Circle className="h-4 w-4 shrink-0 text-sand-400" />}
                    <span className="line-clamp-2">{l.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </details>
      </aside>

      <article className="order-1 min-w-0 lg:order-2">
        <Link href={`/academie/${slug}`} className="text-sm text-ink-500 hover:text-forest">← {course.title}</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {ordered[idx] && <Badge>{ordered[idx].moduleTitle}</Badge>}
          {lesson.is_demo && <Badge tone="gold">Démonstration</Badge>}
          {done.has(lesson.id) && <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Terminée</Badge>}
        </div>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{lesson.title}</h1>
        {lesson.summary && <p className="mt-1 text-ink-500">{lesson.summary}</p>}
        <div className="mt-4"><Flash searchParams={sp} /></div>
        {!enrolled && lesson.is_preview && <Alert tone="info" className="mb-4">Leçon d’aperçu. <Link className="link" href={`/academie/${slug}`}>Inscrivez-vous</Link> pour suivre tout le cours.</Alert>}

        <div className="mt-6">
          {(blocks ?? []).length ? <Blocks blocks={(blocks ?? []) as LessonBlock[]} resolved={resolved} /> : <p className="text-ink-500">Le contenu de cette leçon est en cours de rédaction.</p>}
        </div>

        {extraExercises.length > 0 && (
          <div className="mt-6 space-y-2">
            {extraExercises.map((e) => (
              <Link key={e.id} href={`/exercices/${e.id}`} className="flex items-center gap-3 rounded-xl bg-forest px-4 py-3 font-semibold text-white hover:bg-forest-600">
                <PenLine className="h-5 w-5" /> {e.title}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-3 border-t border-sand-300 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {prev ? <ButtonLink href={`/academie/${slug}/lecon/${prev.id}`} variant="outline"><ChevronLeft className="h-4 w-4" /> Leçon précédente</ButtonLink> : <span />}
          {enrolled ? (
            <form action={completeLessonAction}>
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="next_id" value={next?.id ?? ""} />
              <SubmitButton size="lg" pendingLabel="Enregistrement…">
                {done.has(lesson.id) ? (next ? "Leçon suivante" : "Retour au cours") : next ? "Terminer et continuer" : "Terminer la leçon"} <ChevronRight className="h-4 w-4" />
              </SubmitButton>
            </form>
          ) : next ? <ButtonLink href={`/academie/${slug}/lecon/${next.id}`} variant="outline">Leçon suivante <ChevronRight className="h-4 w-4" /></ButtonLink> : null}
        </div>
      </article>
    </div>
  );
}
