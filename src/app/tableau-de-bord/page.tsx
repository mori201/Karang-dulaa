import type { Metadata } from "next";
import Link from "next/link";
import { Award, BookOpen, CalendarCheck, Clock, Flame, GraduationCap, Layers, PlayCircle, Star, Target, Trophy } from "lucide-react";
import { Alert, Badge, ButtonLink, Card, EmptyState, ProgressBar, StatCard } from "@/components/ui";
import { CourseCard } from "@/components/course/CourseCard";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { EXERCISE_KIND_LABELS, LEVEL_LABELS, displayName, formatDate, formatDuration, xpLevel } from "@/lib/utils";

export const metadata: Metadata = { title: "Mon tableau de bord" };

function startOfWeek() {
  const d = new Date();
  const day = (d.getUTCDay() + 6) % 7; // lundi = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/tableau-de-bord");
  const p = user.profile;
  const supabase = await createClient();
  const week = startOfWeek();
  const today = new Date().toISOString().slice(0, 10);

  const [enrRes, progRes, actRes, attemptsRes, badgesRes, allBadgesRes, gradesRes, flashRes, lastLessonRes] = await Promise.all([
    supabase.from("enrollments").select("course_id, status, progress_percent, last_lesson_id, courses(id, slug, title, description, level, cover_url, estimated_minutes, is_demo)").eq("student_id", user.id).neq("status", "dropped"),
    supabase.from("lesson_progress").select("lesson_id, status, time_spent_seconds, last_viewed_at, completed_at, lessons(title), courses(slug, title)").eq("student_id", user.id).order("last_viewed_at", { ascending: false }),
    supabase.from("daily_activity").select("day, seconds, xp, lessons_completed").eq("user_id", user.id).gte("day", week),
    supabase.from("quiz_attempts").select("id, score, passed, submitted_at, exercises(id, title, kind)").eq("student_id", user.id).order("submitted_at", { ascending: false }).limit(6),
    supabase.from("student_achievements").select("awarded_at, achievements(code, title, description)").eq("student_id", user.id).order("awarded_at", { ascending: false }),
    supabase.from("achievements").select("code, title"),
    supabase.from("assignment_submissions").select("id, score, status, graded_at, assignments(title, max_score)").eq("student_id", user.id).eq("status", "graded").order("graded_at", { ascending: false }).limit(3),
    supabase.from("xp_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("reason", "flashcard").gte("created_at", week),
    p.last_lesson_id ? supabase.from("lessons").select("id, title, courses(slug, title)").eq("id", p.last_lesson_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const enrollments = enrRes.data ?? [];
  const progress = progRes.data ?? [];
  const activity = actRes.data ?? [];
  const completedLessons = progress.filter((x) => x.status === "completed").length;
  const totalSeconds = progress.reduce((s, x) => s + (x.time_spent_seconds ?? 0), 0);
  const weekSeconds = activity.reduce((s, a) => s + a.seconds, 0);
  const weekLessons = activity.reduce((s, a) => s + a.lessons_completed, 0);
  const todayXp = activity.find((a) => a.day === today)?.xp ?? 0;
  const avgProgress = enrollments.length ? enrollments.reduce((s, e) => s + Number(e.progress_percent), 0) / enrollments.length : 0;
  const lvl = xpLevel(p.xp);
  const last = lastLessonRes.data as null | { id: string; title: string; courses: { slug: string; title: string } };
  const lastCourse = last?.courses as unknown as { slug: string; title: string } | undefined;

  const enrolledIds = enrollments.map((e) => e.course_id);
  let recoQuery = supabase.from("courses").select("id, slug, title, description, level, cover_url, estimated_minutes, is_demo, lessons(count)").eq("status", "published").limit(3);
  if (enrolledIds.length) recoQuery = recoQuery.not("id", "in", `(${enrolledIds.join(",")})`);
  const { data: reco } = await recoQuery;
  const recommended = (reco ?? []).sort((a, b) => Number(b.level === p.level) - Number(a.level === p.level));

  const challenges = [
    { label: "Terminer 3 leçons cette semaine", value: weekLessons, goal: 3, icon: BookOpen },
    { label: "Réviser 20 cartes mémoire cette semaine", value: flashRes.count ?? 0, goal: 20, icon: Layers },
  ];
  const earned = new Set((badgesRes.data ?? []).map((b) => (b.achievements as unknown as { code: string }).code));

  return (
    <div className="container-kd py-8">
      {sp.bienvenue && <Alert tone="success" className="mb-6">Bienvenue à KARANG-DULAA ! Commencez par le cours « Initiation au mandinka » ou explorez le dictionnaire.</Alert>}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Bonjour {displayName({ ...p, email: user.email })} 👋</h1>
          <p className="mt-1 text-ink-500">Niveau d’apprentissage : <strong>{LEVEL_LABELS[p.level]}</strong> · Niveau {lvl.level} ({p.xp} XP)</p>
        </div>
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-ink-500"><span>Niveau {lvl.level}</span><span>{p.xp - lvl.current} / {lvl.next - lvl.current} XP</span></div>
          <ProgressBar value={lvl.progress} className="mt-1" label="Progression vers le niveau suivant" />
        </div>
      </div>

      {/* Continuer mon apprentissage */}
      {last && lastCourse ? (
        <Link href={`/academie/${lastCourse.slug}/lecon/${last.id}`} className="mb-6 flex items-center gap-4 rounded-2xl bg-forest p-5 text-white shadow-sm hover:bg-forest-600">
          <PlayCircle className="h-12 w-12 shrink-0 text-gold-300" />
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-widest text-gold-200">Continuer mon apprentissage</div>
            <div className="truncate text-lg font-bold">{last.title}</div>
            <div className="truncate text-sm text-forest-100">{lastCourse.title}</div>
          </div>
        </Link>
      ) : enrollments.length === 0 ? (
        <Card className="mb-6 flex flex-col items-start gap-3 bg-gold-50 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-bold">Prêt(e) à commencer ?</p><p className="text-sm text-ink-500">Inscrivez-vous à votre premier cours pour suivre votre progression.</p></div>
          <ButtonLink href="/academie">Découvrir les cours</ButtonLink>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Cours suivis" value={enrollments.length} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label="Leçons terminées" value={completedLessons} icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="Temps d’apprentissage" value={formatDuration(totalSeconds)} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Série" value={`${p.current_streak} j`} hint={`Record : ${p.longest_streak} j`} icon={<Flame className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between"><h2 className="font-bold">Mes cours</h2><span className="text-sm text-ink-500">Progression générale : {Math.round(avgProgress)} %</span></div>
            {enrollments.length === 0 ? <p className="mt-3 text-sm text-ink-500">Aucun cours pour l’instant.</p> : (
              <ul className="mt-3 space-y-3">
                {enrollments.map((e) => {
                  const c = e.courses as unknown as { slug: string; title: string; level: keyof typeof LEVEL_LABELS };
                  return (
                    <li key={e.course_id}>
                      <Link href={`/academie/${c.slug}`} className="block rounded-xl border border-sand-300 p-3 hover:border-forest">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold">{c.title}</span>
                          {e.status === "completed" ? <Badge tone="green">Terminé</Badge> : <Badge>{LEVEL_LABELS[c.level]}</Badge>}
                        </div>
                        <ProgressBar value={Number(e.progress_percent)} className="mt-2" />
                        <div className="mt-1 text-xs text-ink-500">{Math.round(Number(e.progress_percent))} %</div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-bold">Résultats des évaluations</h2>
            {(attemptsRes.data ?? []).length === 0 && (gradesRes.data ?? []).length === 0 ? <p className="mt-3 text-sm text-ink-500">Pas encore d’évaluation réalisée.</p> : (
              <ul className="mt-3 divide-y divide-sand-300 text-sm">
                {(attemptsRes.data ?? []).map((a) => {
                  const ex = a.exercises as unknown as { id: string; title: string; kind: keyof typeof EXERCISE_KIND_LABELS };
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                      <Link href={`/exercices/${ex.id}`} className="hover:text-forest"><span className="font-semibold">{ex.title}</span> <span className="text-xs text-ink-400">{EXERCISE_KIND_LABELS[ex.kind]} · {formatDate(a.submitted_at, { dateStyle: "short" })}</span></Link>
                      <Badge tone={a.passed ? "green" : "red"}>{Math.round(Number(a.score))} %</Badge>
                    </li>
                  );
                })}
                {(gradesRes.data ?? []).map((g) => {
                  const as = g.assignments as unknown as { title: string; max_score: number };
                  return <li key={g.id} className="flex justify-between py-2"><span><span className="font-semibold">{as.title}</span> <span className="text-xs text-ink-400">Devoir</span></span><Badge tone="blue">{g.score} / {as.max_score}</Badge></li>;
                })}
              </ul>
            )}
            <Link href="/exercices" className="link mt-3 inline-block text-sm">Tous mes exercices →</Link>
          </Card>

          <Card>
            <h2 className="font-bold">Dernières activités</h2>
            {progress.length === 0 ? <p className="mt-3 text-sm text-ink-500">Aucune activité récente.</p> : (
              <ul className="mt-3 space-y-2 text-sm">
                {progress.slice(0, 6).map((x) => {
                  const c = x.courses as unknown as { slug: string; title: string };
                  const l = x.lessons as unknown as { title: string };
                  return (
                    <li key={x.lesson_id} className="flex justify-between gap-2">
                      <Link href={`/academie/${c.slug}/lecon/${x.lesson_id}`} className="hover:text-forest">{x.status === "completed" ? "✓ " : "… "}{l.title} <span className="text-ink-400">— {c.title}</span></Link>
                      <span className="shrink-0 text-xs text-ink-400">{formatDate(x.last_viewed_at, { dateStyle: "short" })}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="flex items-center gap-2 font-bold"><Target className="h-4 w-4 text-gold-500" /> Mes objectifs</h2>
            <div className="mt-3 space-y-4 text-sm">
              <div>
                <div className="flex justify-between"><span>Cette semaine</span><span>{Math.round(weekSeconds / 60)} / {p.weekly_goal_minutes} min</span></div>
                <ProgressBar value={(weekSeconds / 60 / p.weekly_goal_minutes) * 100} className="mt-1" />
              </div>
              <div>
                <div className="flex justify-between"><span>Aujourd’hui</span><span>{todayXp} / {p.daily_goal_xp} XP</span></div>
                <ProgressBar value={(todayXp / p.daily_goal_xp) * 100} className="mt-1" />
              </div>
              <Link href="/profil" className="link text-xs">Modifier mes objectifs</Link>
            </div>
          </Card>
          <Card>
            <h2 className="flex items-center gap-2 font-bold"><CalendarCheck className="h-4 w-4 text-gold-500" /> Défis de la semaine</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {challenges.map((c) => (
                <li key={c.label}>
                  <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><c.icon className="h-4 w-4 text-forest" /> {c.label}</span>{c.value >= c.goal && <Star className="h-4 w-4 fill-gold text-gold" />}</div>
                  <ProgressBar value={(c.value / c.goal) * 100} className="mt-1" />
                  <div className="text-xs text-ink-400">{Math.min(c.value, c.goal)} / {c.goal}</div>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Award className="h-4 w-4 text-gold-500" /> Badges</h2><span className="text-xs text-ink-400">{earned.size}/{(allBadgesRes.data ?? []).length}</span></div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {(allBadgesRes.data ?? []).map((b) => (
                <li key={b.code}><Badge tone={earned.has(b.code) ? "gold" : "neutral"} className={earned.has(b.code) ? "" : "opacity-50"} title={earned.has(b.code) ? "Obtenu" : "À débloquer"}>{earned.has(b.code) ? "🏅" : "🔒"} {b.title}</Badge></li>
              ))}
            </ul>
          </Card>
          <Card className="flex items-center justify-between gap-3">
            <div><p className="font-bold">Classement</p><p className="text-xs text-ink-500">Facultatif, entre apprenants volontaires.</p></div>
            <ButtonLink href="/classement" variant="outline" size="sm"><Trophy className="h-4 w-4" /> Voir</ButtonLink>
          </Card>
        </div>
      </div>

      {recommended.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-extrabold">Cours recommandés</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((c) => <CourseCard key={c.id} course={c} lessons={(c.lessons as unknown as { count: number }[])?.[0]?.count ?? 0} />)}
          </div>
        </section>
      )}
      {enrollments.length === 0 && recommended.length === 0 && <EmptyState title="Aucun cours publié pour le moment." />}
    </div>
  );
}
