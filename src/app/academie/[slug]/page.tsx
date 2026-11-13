import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CheckCircle2, Circle, Clock, Eye, FileText, Megaphone, MessagesSquare, PenLine, Target } from "lucide-react";
import { Alert, Badge, ButtonLink, Card, ProgressBar } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { EXERCISE_KIND_LABELS, LEVEL_LABELS, formatDate } from "@/lib/utils";
import type { Course, Lesson, Module } from "@/lib/types";
import { enrollAction, requestCertificateAction, unenrollAction } from "../actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("title, description").eq("slug", slug).maybeSingle();
  return { title: data?.title ?? "Cours", description: data?.description?.slice(0, 160) };
}

export default async function CoursePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await getSessionUser();

  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle<Course>();
  if (!course) notFound();

  const [{ data: modules }, { data: lessons }, { data: teacher }, enrollmentRes, progressRes, exercisesRes, announcementsRes, docsRes] = await Promise.all([
    supabase.from("course_modules").select("*").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("*").eq("course_id", course.id).order("position"),
    course.teacher_id
      ? supabase.from("profiles").select("full_name, first_name").eq("id", course.teacher_id).maybeSingle()
      : Promise.resolve({ data: null }),
    user ? supabase.from("enrollments").select("*").eq("course_id", course.id).eq("student_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from("lesson_progress").select("lesson_id, status").eq("course_id", course.id).eq("student_id", user.id) : Promise.resolve({ data: [] }),
    user ? supabase.from("exercises").select("id, title, kind, module_id, lesson_id, pass_score").eq("course_id", course.id).eq("is_published", true).order("created_at") : Promise.resolve({ data: [] }),
    supabase.from("announcements").select("id, title, body, created_at").eq("course_id", course.id).order("created_at", { ascending: false }).limit(3),
    supabase.from("documents").select("id, title, category").eq("course_id", course.id).limit(10),
  ]);
  const enrollment = enrollmentRes.data as null | { status: string; progress_percent: number; last_lesson_id: string | null };
  const done = new Set(((progressRes.data ?? []) as { lesson_id: string; status: string }[]).filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const exercises = (exercisesRes.data ?? []) as { id: string; title: string; kind: keyof typeof EXERCISE_KIND_LABELS; module_id: string | null; lesson_id: string | null }[];
  const attempts = user && exercises.length
    ? ((await supabase.from("quiz_attempts").select("exercise_id, score, passed").in("exercise_id", exercises.map((e) => e.id)).eq("student_id", user.id)).data ?? [])
    : [];
  const best = new Map<string, { score: number; passed: boolean }>();
  attempts.forEach((a) => {
    const prev = best.get(a.exercise_id);
    if (!prev || a.score > prev.score) best.set(a.exercise_id, { score: Number(a.score), passed: a.passed });
  });
  const certificate = user && course.certificate_enabled
    ? (await supabase.from("certificates").select("code").eq("course_id", course.id).eq("student_id", user.id).eq("revoked", false).maybeSingle()).data
    : null;

  const allLessons = (lessons ?? []) as Lesson[];
  const firstLesson = (modules ?? []).flatMap((m: Module) => allLessons.filter((l) => l.module_id === m.id))[0];
  const resume = enrollment?.last_lesson_id ?? firstLesson?.id;
  const isEnrolled = !!enrollment && enrollment.status !== "dropped";
  const totalMin = course.estimated_minutes ?? allLessons.reduce((s, l) => s + (l.estimated_minutes ?? 0), 0);
  const teacherName = (teacher as { full_name?: string; first_name?: string } | null)?.full_name || (teacher as { first_name?: string } | null)?.first_name;

  return (
    <div>
      <section className="relative overflow-hidden bg-forest text-white">
        <div className="absolute inset-0 bg-kd-pattern opacity-50" aria-hidden />
        <div className="container-kd relative py-10">
          <Link href="/academie" className="text-sm text-forest-100 hover:text-white">← Académie</Link>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="gold">{LEVEL_LABELS[course.level]}</Badge>
            {course.is_demo && <Badge className="bg-white/90 text-ink-600">Données de démonstration</Badge>}
            {course.certificate_enabled && <Badge className="bg-white/15 text-white"><Award className="h-3 w-3" /> Certificat</Badge>}
            {course.status !== "published" && <Badge tone="red">Non publié</Badge>}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{course.title}</h1>
          <p className="mt-3 max-w-3xl text-forest-100">{course.description}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-forest-100">
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> environ {Math.max(1, Math.round(totalMin / 60))} h</span>
            <span>{allLessons.length} leçons</span>
            <span>Enseignant : {teacherName ?? "Équipe pédagogique KARANG-DULAA"}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {isEnrolled ? (
              resume && <ButtonLink href={`/academie/${slug}/lecon/${resume}`} variant="gold" size="lg">{done.size ? "Continuer le cours" : "Commencer le cours"}</ButtonLink>
            ) : user ? (
              course.status === "published" && (
                <form action={enrollAction}>
                  <input type="hidden" name="course_id" value={course.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <SubmitButton variant="gold" size="lg" pendingLabel="Inscription…">S’inscrire gratuitement</SubmitButton>
                </form>
              )
            ) : (
              <ButtonLink href={`/connexion?suivant=/academie/${slug}`} variant="gold" size="lg">Se connecter pour s’inscrire</ButtonLink>
            )}
            {isEnrolled && (
              <ButtonLink href={`/academie/${slug}/questions`} size="lg" className="border border-white/30 bg-white/10 hover:bg-white/20">
                <MessagesSquare className="h-4 w-4" /> Questions & échanges
              </ButtonLink>
            )}
          </div>
        </div>
      </section>

      <div className="container-kd grid gap-8 py-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <Flash searchParams={sp} />
          {course.is_demo && (
            <Alert tone="warning" className="mb-6">
              Ce cours est une <strong>démonstration</strong> construite à partir des ouvrages de référence. Ses contenus doivent être relus et validés
              par l’équipe pédagogique et des locuteurs compétents.
            </Alert>
          )}
          {course.objectives.length > 0 && (
            <Card className="mb-6">
              <h2 className="flex items-center gap-2 font-bold"><Target className="h-5 w-5 text-gold-500" /> Objectifs pédagogiques</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {course.objectives.map((o) => <li key={o} className="flex gap-2 text-sm text-ink-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> {o}</li>)}
              </ul>
            </Card>
          )}

          <h2 className="mb-3 text-xl font-extrabold">Programme</h2>
          <div className="space-y-4">
            {((modules ?? []) as Module[]).map((m) => {
              const ml = allLessons.filter((l) => l.module_id === m.id);
              const mex = exercises.filter((e) => e.module_id === m.id && !e.lesson_id);
              return (
                <Card key={m.id} className="p-0">
                  <div className="border-b border-sand-300 px-5 py-3">
                    <h3 className="font-bold">{m.title}</h3>
                    {m.description && <p className="text-sm text-ink-500">{m.description}</p>}
                  </div>
                  <ol className="divide-y divide-sand-300">
                    {ml.map((l) => {
                      const canOpen = isEnrolled || l.is_preview;
                      const inner = (
                        <>
                          {done.has(l.id) ? <CheckCircle2 className="h-5 w-5 shrink-0 text-forest" aria-label="Terminée" /> : <Circle className="h-5 w-5 shrink-0 text-sand-400" aria-hidden />}
                          <span className="flex-1">
                            <span className="font-semibold">{l.title}</span>
                            {l.summary && <span className="block text-xs text-ink-400">{l.summary}</span>}
                          </span>
                          {l.is_preview && !isEnrolled && <Badge tone="blue"><Eye className="h-3 w-3" /> Aperçu</Badge>}
                          {l.estimated_minutes && <span className="text-xs text-ink-400">{l.estimated_minutes} min</span>}
                        </>
                      );
                      return (
                        <li key={l.id}>
                          {canOpen ? (
                            <Link href={`/academie/${slug}/lecon/${l.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-sand-100">{inner}</Link>
                          ) : <div className="flex items-center gap-3 px-5 py-3 text-ink-500">{inner}</div>}
                        </li>
                      );
                    })}
                    {mex.map((e) => (
                      <li key={e.id}>
                        <Link href={`/exercices/${e.id}`} className="flex items-center gap-3 bg-gold-50/50 px-5 py-3 hover:bg-gold-50">
                          <PenLine className="h-5 w-5 shrink-0 text-gold-600" />
                          <span className="flex-1 font-semibold">{e.title} <span className="text-xs font-normal text-ink-400">— {EXERCISE_KIND_LABELS[e.kind]}</span></span>
                          {best.get(e.id) && <Badge tone={best.get(e.id)!.passed ? "green" : "red"}>{Math.round(best.get(e.id)!.score)} %</Badge>}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </Card>
              );
            })}
            {exercises.filter((e) => !e.module_id && !e.lesson_id).map((e) => (
              <Link key={e.id} href={`/exercices/${e.id}`} className="flex items-center gap-3 rounded-2xl border-2 border-gold bg-gold-50 px-5 py-4 hover:bg-gold-100">
                <Award className="h-6 w-6 text-gold-600" />
                <span className="flex-1 font-bold">{e.title} <span className="text-xs font-normal text-ink-500">— {EXERCISE_KIND_LABELS[e.kind]}</span></span>
                {best.get(e.id) && <Badge tone={best.get(e.id)!.passed ? "green" : "red"}>{Math.round(best.get(e.id)!.score)} %</Badge>}
              </Link>
            ))}
            {!user && <p className="text-sm text-ink-500">Les exercices et évaluations sont accessibles après inscription au cours.</p>}
          </div>
        </div>

        <aside className="space-y-4">
          {isEnrolled && enrollment && (
            <Card>
              <h2 className="font-bold">Ma progression</h2>
              <ProgressBar value={Number(enrollment.progress_percent)} className="mt-3" />
              <p className="mt-2 text-sm text-ink-500">{Math.round(Number(enrollment.progress_percent))} % — {done.size}/{allLessons.length} leçons terminées</p>
              {course.certificate_enabled && (
                <div className="mt-4 border-t border-sand-300 pt-4">
                  {certificate ? (
                    <ButtonLink href={`/certificats/${certificate.code}`} variant="gold" className="w-full"><Award className="h-4 w-4" /> Voir mon certificat</ButtonLink>
                  ) : enrollment.status === "completed" ? (
                    <form action={requestCertificateAction}>
                      <input type="hidden" name="course_id" value={course.id} />
                      <input type="hidden" name="slug" value={slug} />
                      <SubmitButton variant="gold" className="w-full" pendingLabel="Vérification…"><Award className="h-4 w-4" /> Obtenir mon certificat</SubmitButton>
                      <p className="mt-2 text-xs text-ink-400">Requiert la réussite des contrôles de module et de l’évaluation finale (score moyen ≥ {course.certificate_min_score} %).</p>
                    </form>
                  ) : (
                    <p className="text-xs text-ink-500">Terminez toutes les leçons et réussissez les évaluations pour obtenir le certificat.</p>
                  )}
                </div>
              )}
              <form action={unenrollAction} className="mt-4">
                <input type="hidden" name="course_id" value={course.id} />
                <input type="hidden" name="slug" value={slug} />
                <SubmitButton variant="ghost" size="sm" className="w-full text-ink-400" confirm="Se désinscrire de ce cours ?" pendingLabel="…">Se désinscrire</SubmitButton>
              </form>
            </Card>
          )}
          {(announcementsRes.data ?? []).length > 0 && (
            <Card>
              <h2 className="flex items-center gap-2 font-bold"><Megaphone className="h-4 w-4 text-gold-500" /> Annonces</h2>
              <ul className="mt-3 space-y-3">
                {(announcementsRes.data ?? []).map((a) => (
                  <li key={a.id}>
                    <div className="text-sm font-semibold">{a.title}</div>
                    <div className="text-xs text-ink-400">{formatDate(a.created_at)}</div>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink-600">{a.body}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {(docsRes.data ?? []).length > 0 && (
            <Card>
              <h2 className="flex items-center gap-2 font-bold"><FileText className="h-4 w-4 text-gold-500" /> Ressources du cours</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {(docsRes.data ?? []).map((d) => <li key={d.id}><Link className="link" href={`/bibliotheque/${d.id}`}>{d.title}</Link></li>)}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
