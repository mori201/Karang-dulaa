"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { humanError, withFlash } from "@/lib/flash";
import { str } from "@/lib/utils";

export async function enrollAction(formData: FormData) {
  const courseId = str(formData.get("course_id"));
  const slug = str(formData.get("slug"));
  await requireUser(`/academie/${slug}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("enroll_in_course", { p_course: courseId });
  if (error) redirect(withFlash(`/academie/${slug}`, "erreur", humanError(error)));
  revalidatePath(`/academie/${slug}`);
  redirect(withFlash(`/academie/${slug}`, "ok", "Inscription confirmée. Bonne découverte !"));
}

export async function unenrollAction(formData: FormData) {
  const courseId = str(formData.get("course_id"));
  const slug = str(formData.get("slug"));
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").delete().eq("course_id", courseId).eq("student_id", user.id);
  if (error) redirect(withFlash(`/academie/${slug}`, "erreur", humanError(error)));
  revalidatePath("/tableau-de-bord");
  redirect(withFlash(`/academie/${slug}`, "ok", "Vous êtes désinscrit(e) de ce cours. Votre progression est conservée si vous revenez."));
}

export async function completeLessonAction(formData: FormData) {
  const lessonId = str(formData.get("lesson_id"));
  const slug = str(formData.get("slug"));
  const nextId = str(formData.get("next_id"));
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_lesson", { p_lesson: lessonId });
  if (error) redirect(withFlash(`/academie/${slug}/lecon/${lessonId}`, "erreur", humanError(error)));
  revalidatePath(`/academie/${slug}`);
  const pct = Math.round(Number((data as { course_progress?: number })?.course_progress ?? 0));
  const msg = (data as { newly_completed?: boolean })?.newly_completed ? `Leçon terminée : +10 XP. Progression du cours : ${pct} %.` : `Leçon déjà terminée. Progression : ${pct} %.`;
  if (nextId) redirect(withFlash(`/academie/${slug}/lecon/${nextId}`, "ok", msg));
  redirect(withFlash(`/academie/${slug}`, "ok", pct >= 100 ? "Bravo, vous avez terminé toutes les leçons du cours !" : msg));
}

/** Battement d'activité appelé par le lecteur de leçon (temps d'apprentissage). */
export async function recordStudyTime(lessonId: string, seconds: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("record_study_time", { p_lesson: lessonId, p_seconds: Math.round(seconds) });
}

export async function requestCertificateAction(formData: FormData) {
  const courseId = str(formData.get("course_id"));
  const slug = str(formData.get("slug"));
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_certificate", { p_course: courseId });
  if (error) redirect(withFlash(`/academie/${slug}`, "erreur", humanError(error)));
  redirect(`/certificats/${data}`);
}

export async function askQuestionAction(formData: FormData) {
  const courseId = str(formData.get("course_id"));
  const slug = str(formData.get("slug"));
  const title = str(formData.get("title"));
  const body = str(formData.get("body"));
  const user = await requireUser();
  const back = `/academie/${slug}/questions`;
  if (title.length < 3 || !body) redirect(withFlash(back, "erreur", "Indiquez un titre (3 caractères minimum) et votre question."));
  const supabase = await createClient();
  const { error } = await supabase.from("course_questions").insert({
    course_id: courseId, author_id: user.id, title: title.slice(0, 200), body: body.slice(0, 5000),
    lesson_id: str(formData.get("lesson_id")) || null,
  });
  if (error) redirect(withFlash(back, "erreur", humanError(error)));
  revalidatePath(back);
  redirect(withFlash(back, "ok", "Question publiée. L’équipe pédagogique vous répondra ici."));
}

export async function replyQuestionAction(formData: FormData) {
  const questionId = str(formData.get("question_id"));
  const slug = str(formData.get("slug"));
  const body = str(formData.get("body"));
  const user = await requireUser();
  const back = `/academie/${slug}/questions`;
  if (!body) redirect(withFlash(back, "erreur", "La réponse est vide."));
  const supabase = await createClient();
  const { error } = await supabase.from("course_question_replies").insert({ question_id: questionId, author_id: user.id, body: body.slice(0, 5000) });
  if (error) redirect(withFlash(back, "erreur", humanError(error)));
  if (formData.get("resolve") === "on") await supabase.from("course_questions").update({ is_resolved: true }).eq("id", questionId);
  revalidatePath(back);
  redirect(withFlash(back, "ok", "Réponse publiée."));
}
