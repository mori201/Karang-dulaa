import Link from "next/link";
import { Eye, FileEdit, PenLine, Plus, Trash2, Users } from "lucide-react";
import { Alert, Badge, ButtonLink, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { CourseFields } from "@/components/teacher/CourseForm";
import { MoveButtons } from "@/components/teacher/MoveButtons";
import { loadManagedCourse } from "@/lib/teacher";
import { EXERCISE_KIND_LABELS, STATUS_LABELS } from "@/lib/utils";
import type { Lesson, Module } from "@/lib/types";
import {
  addLessonAction, addModuleAction, createExerciseAction, deleteCourseAction, deleteModuleAction, setCourseStatusAction, updateCourseAction, updateModuleAction,
} from "../../actions";

export const metadata = { title: "Modifier le cours" };

export default async function EditCoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { user, supabase, course } = await loadManagedCourse(id);
  const back = `/enseignant/cours/${id}`;
  const [{ data: categories }, { data: modules }, { data: lessons }, { data: exercises }, { data: teacherRow }] = await Promise.all([
    supabase.from("course_categories").select("id, name").order("position"),
    supabase.from("course_modules").select("*").eq("course_id", id).order("position"),
    supabase.from("lessons").select("*").eq("course_id", id).order("position"),
    supabase.from("exercises").select("id, title, kind, is_published, module_id, lesson_id, questions(count)").eq("course_id", id).order("created_at"),
    supabase.from("teachers").select("can_publish_directly").eq("user_id", user.id).maybeSingle(),
  ]);
  const canPublish = user.isAdmin || !!teacherRow?.can_publish_directly;

  return (
    <div className="container-kd py-8">
      <Link href="/enseignant" className="text-sm text-ink-500 hover:text-forest">← Espace enseignant</Link>
      <PageHeader title={course.title}
        eyebrow={<>Statut : {STATUS_LABELS[course.status]}</>}
        actions={<>
          <ButtonLink href={`/academie/${course.slug}`} variant="outline" size="sm"><Eye className="h-4 w-4" /> Aperçu</ButtonLink>
          <ButtonLink href={`${back}/apprenants`} variant="outline" size="sm"><Users className="h-4 w-4" /> Apprenants</ButtonLink>
          <ButtonLink href={`${back}/devoirs`} variant="outline" size="sm"><PenLine className="h-4 w-4" /> Devoirs</ButtonLink>
        </>} />
      <Flash searchParams={sp} />
      {course.status === "pending_review" && <Alert tone="warning" className="mb-4">Ce cours est en attente de validation par un administrateur.</Alert>}
      {course.review_notes && course.status === "draft" && <Alert tone="error" className="mb-4">Retour de l’administration : {course.review_notes}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Structure */}
          <Card>
            <h2 className="text-lg font-bold">Modules et leçons</h2>
            <div className="mt-4 space-y-4">
              {((modules ?? []) as Module[]).map((m) => (
                <div key={m.id} className="rounded-xl border border-sand-300">
                  <details className="group">
                    <summary className="flex cursor-pointer items-center gap-2 bg-sand-100 px-4 py-2.5">
                      <span className="flex-1 font-bold">{m.title}</span>
                      <MoveButtons table="course_modules" id={m.id} scope={id} back={back} />
                    </summary>
                    <div className="space-y-2 border-t border-sand-300 p-4">
                      <form action={updateModuleAction} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <input type="hidden" name="module_id" value={m.id} /><input type="hidden" name="back" value={back} />
                        <Input name="title" defaultValue={m.title} required aria-label="Titre du module" />
                        <Input name="description" defaultValue={m.description ?? ""} placeholder="Description" aria-label="Description du module" />
                        <SubmitButton size="sm" variant="secondary" pendingLabel="…">Renommer</SubmitButton>
                      </form>
                      <form action={deleteModuleAction}>
                        <input type="hidden" name="module_id" value={m.id} /><input type="hidden" name="back" value={back} />
                        <SubmitButton size="sm" variant="ghost" className="text-red-700" confirm="Supprimer ce module et toutes ses leçons ?" pendingLabel="…"><Trash2 className="h-4 w-4" /> Supprimer le module</SubmitButton>
                      </form>
                    </div>
                  </details>
                  <ol className="divide-y divide-sand-300 border-t border-sand-300">
                    {((lessons ?? []) as Lesson[]).filter((l) => l.module_id === m.id).map((l) => (
                      <li key={l.id} className="flex items-center gap-2 px-4 py-2">
                        <Link href={`${back}/lecons/${l.id}`} className="flex flex-1 items-center gap-2 hover:text-forest"><FileEdit className="h-4 w-4 text-ink-400" /> {l.title}</Link>
                        {l.is_preview && <Badge tone="blue">Aperçu</Badge>}
                        <MoveButtons table="lessons" id={l.id} scope={m.id} back={back} />
                      </li>
                    ))}
                    <li className="px-4 py-2">
                      <form action={addLessonAction} className="flex gap-2">
                        <input type="hidden" name="module_id" value={m.id} /><input type="hidden" name="back" value={back} />
                        <Input name="title" placeholder="Titre de la nouvelle leçon" required className="h-9" aria-label="Titre de la nouvelle leçon" />
                        <SubmitButton size="sm" variant="secondary" pendingLabel="…"><Plus className="h-4 w-4" /> Leçon</SubmitButton>
                      </form>
                    </li>
                  </ol>
                </div>
              ))}
              <form action={addModuleAction} className="grid gap-2 rounded-xl border-2 border-dashed border-sand-400 p-4 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="course_id" value={id} />
                <Input name="title" placeholder="Ex. : Module 1 : Découvrir le mandinka" required aria-label="Titre du nouveau module" />
                <SubmitButton pendingLabel="…"><Plus className="h-4 w-4" /> Ajouter un module</SubmitButton>
              </form>
            </div>
          </Card>

          {/* Exercices */}
          <Card>
            <h2 className="text-lg font-bold">Exercices, quiz et évaluations</h2>
            <ul className="mt-3 divide-y divide-sand-300">
              {(exercises ?? []).map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Link href={`${back}/exercices/${e.id}`} className="flex-1 font-semibold hover:text-forest">{e.title}</Link>
                  <Badge>{EXERCISE_KIND_LABELS[e.kind as keyof typeof EXERCISE_KIND_LABELS]}</Badge>
                  <Badge tone="blue">{(e.questions as unknown as { count: number }[])?.[0]?.count ?? 0} questions</Badge>
                  <Badge tone={e.is_published ? "green" : "neutral"}>{e.is_published ? "Publié" : "Brouillon"}</Badge>
                </li>
              ))}
            </ul>
            <form action={createExerciseAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_180px_auto]">
              <input type="hidden" name="course_id" value={id} />
              <Input name="title" placeholder="Titre de l’exercice" required aria-label="Titre de l’exercice" />
              <Select name="kind" aria-label="Type">{Object.entries(EXERCISE_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
              <Select name="module_id" aria-label="Module"><option value="">Tout le cours</option>{((modules ?? []) as Module[]).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Select>
              <SubmitButton pendingLabel="…"><Plus className="h-4 w-4" /> Créer</SubmitButton>
            </form>
          </Card>

          {/* Informations */}
          <Card>
            <h2 className="text-lg font-bold">Informations du cours</h2>
            <form action={updateCourseAction} className="mt-4 space-y-5">
              <input type="hidden" name="course_id" value={id} />
              <CourseFields course={course} categories={categories ?? []} />
              {course.cover_url && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remove_cover" className="accent-forest" /> Retirer l’image actuelle</label>}
              <div className="rounded-xl bg-sand-100 p-4">
                <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="certificate_enabled" defaultChecked={course.certificate_enabled} className="accent-forest" /> Délivrer un certificat</label>
                <Field label="Score moyen minimal aux contrôles et à l’évaluation finale (%)" htmlFor="certificate_min_score">
                  <Input id="certificate_min_score" name="certificate_min_score" type="number" min={0} max={100} defaultValue={course.certificate_min_score} className="max-w-32" />
                </Field>
                <p className="mt-2 text-xs text-ink-500">Critères : toutes les leçons terminées, tous les contrôles de module et évaluations finales publiés réussis.</p>
              </div>
              <SubmitButton>Enregistrer</SubmitButton>
            </form>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="font-bold">Publication</h2>
            <p className="mt-1 text-sm text-ink-500">Statut actuel : <strong>{STATUS_LABELS[course.status]}</strong></p>
            <div className="mt-3 flex flex-col gap-2">
              {course.status !== "published" && course.status !== "pending_review" && (
                <form action={setCourseStatusAction}><input type="hidden" name="course_id" value={id} /><input type="hidden" name="status" value="published" />
                  <SubmitButton className="w-full" pendingLabel="…">{canPublish ? "Publier" : "Soumettre à validation"}</SubmitButton></form>
              )}
              {course.status !== "draft" && (
                <form action={setCourseStatusAction}><input type="hidden" name="course_id" value={id} /><input type="hidden" name="status" value="draft" />
                  <SubmitButton variant="outline" className="w-full" pendingLabel="…">Repasser en brouillon</SubmitButton></form>
              )}
              {course.status !== "archived" && (
                <form action={setCourseStatusAction}><input type="hidden" name="course_id" value={id} /><input type="hidden" name="status" value="archived" />
                  <SubmitButton variant="ghost" className="w-full" confirm="Archiver ce cours ? Il ne sera plus visible des apprenants." pendingLabel="…">Archiver</SubmitButton></form>
              )}
            </div>
          </Card>
          {(course.status === "draft" || user.isAdmin) && (
            <Card className="border-red-200">
              <h2 className="font-bold text-red-800">Zone sensible</h2>
              <form action={deleteCourseAction} className="mt-2"><input type="hidden" name="course_id" value={id} />
                <SubmitButton variant="danger" size="sm" confirm="Supprimer définitivement ce cours, ses leçons, exercices et résultats ?" pendingLabel="…"><Trash2 className="h-4 w-4" /> Supprimer le cours</SubmitButton>
              </form>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
