"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { humanError, withFlash } from "@/lib/flash";
import { checkFile, publicMediaUrl, safeFileName } from "@/lib/storage";
import { safeNext, slugify, str } from "@/lib/utils";
import type { BlockType, QuestionType } from "@/lib/types";

const fail = (back: string, e: { message?: string; code?: string } | string | null | undefined): never =>
  redirect(withFlash(back, "erreur", typeof e === "string" ? e : humanError(e)));
const done = (back: string, msg: string): never => { revalidatePath(back.split("?")[0]); redirect(withFlash(back, "ok", msg)); };
const back = (fd: FormData, fallback: string) => safeNext(str(fd.get("back")), fallback);
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const int = (v: FormDataEntryValue | null, d: number | null = null) => { const n = Number(v); return Number.isFinite(n) && String(v ?? "").trim() !== "" ? Math.round(n) : d; };

// ------------------------------------------------------------------ cours
const courseSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères.").max(200),
  description: z.string().max(5000),
  level: z.enum(["debutant", "intermediaire", "avance"]),
});

async function uploadCover(file: File | null, courseKey: string) {
  if (!file || file.size === 0) return null;
  const err = checkFile(file, "image");
  if (err) return { error: err };
  const supabase = await createClient();
  const path = `covers/${courseKey}/${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from("public-media").upload(path, file, { contentType: file.type, upsert: true });
  if (error) return { error: "L’image de couverture n’a pas pu être envoyée." };
  return { url: publicMediaUrl(path) };
}

export async function createCourseAction(fd: FormData) {
  const user = await requireStaff();
  const b = "/enseignant/cours/nouveau";
  const parsed = courseSchema.safeParse({ title: str(fd.get("title")), description: str(fd.get("description")), level: str(fd.get("level")) });
  if (!parsed.success) fail(b, parsed.error!.issues[0]?.message);
  const supabase = await createClient();
  let slug = slugify(str(fd.get("slug")) || parsed.data!.title);
  const { data: exists } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const { data, error } = await supabase.from("courses").insert({
    ...parsed.data, slug, teacher_id: user.id, status: "draft", category_id: str(fd.get("category_id")) || null,
    objectives: lines(str(fd.get("objectives"))), estimated_minutes: int(fd.get("estimated_minutes")),
  }).select("id").single();
  if (error || !data) fail(b, error);
  const cover = await uploadCover(fd.get("cover") as File | null, data!.id);
  if (cover && "url" in cover) await supabase.from("courses").update({ cover_url: cover.url }).eq("id", data!.id);
  redirect(withFlash(`/enseignant/cours/${data!.id}`, "ok", "Cours créé (brouillon). Ajoutez maintenant des modules et des leçons."));
}

export async function updateCourseAction(fd: FormData) {
  await requireStaff();
  const id = str(fd.get("course_id"));
  const b = `/enseignant/cours/${id}`;
  const parsed = courseSchema.safeParse({ title: str(fd.get("title")), description: str(fd.get("description")), level: str(fd.get("level")) });
  if (!parsed.success) fail(b, parsed.error!.issues[0]?.message);
  const supabase = await createClient();
  const update: Record<string, unknown> = {
    ...parsed.data,
    slug: slugify(str(fd.get("slug")) || parsed.data!.title),
    category_id: str(fd.get("category_id")) || null,
    objectives: lines(str(fd.get("objectives"))),
    estimated_minutes: int(fd.get("estimated_minutes")),
    certificate_enabled: fd.get("certificate_enabled") === "on",
    certificate_min_score: Math.min(100, Math.max(0, int(fd.get("certificate_min_score"), 70)!)),
  };
  const cover = await uploadCover(fd.get("cover") as File | null, id);
  if (cover && "error" in cover) fail(b, cover.error);
  if (cover && "url" in cover) update.cover_url = cover.url;
  if (fd.get("remove_cover") === "on") update.cover_url = null;
  const { error } = await supabase.from("courses").update(update).eq("id", id);
  if (error) fail(b, error);
  done(b, "Cours enregistré.");
}

export async function setCourseStatusAction(fd: FormData) {
  await requireStaff();
  const id = str(fd.get("course_id"));
  const status = str(fd.get("status"));
  const b = `/enseignant/cours/${id}`;
  if (!["draft", "published", "archived"].includes(status)) fail(b, "Statut invalide.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").update({ status }).eq("id", id).select("status").single();
  if (error) fail(b, error);
  const msg = data?.status === "pending_review" ? "Cours soumis à validation : un administrateur va le relire avant publication."
    : data?.status === "published" ? "Cours publié." : data?.status === "archived" ? "Cours archivé." : "Cours repassé en brouillon.";
  revalidatePath("/academie");
  done(b, msg);
}

export async function deleteCourseAction(fd: FormData) {
  await requireStaff();
  const id = str(fd.get("course_id"));
  const supabase = await createClient();
  const { error, count } = await supabase.from("courses").delete({ count: "exact" }).eq("id", id);
  if (error || !count) fail(`/enseignant/cours/${id}`, error ?? "Seuls les brouillons peuvent être supprimés par un enseignant (archivez plutôt le cours).");
  redirect(withFlash("/enseignant", "ok", "Cours supprimé."));
}

// ------------------------------------------------------------------ modules & leçons
export async function addModuleAction(fd: FormData) {
  await requireStaff();
  const courseId = str(fd.get("course_id"));
  const b = `/enseignant/cours/${courseId}`;
  const title = str(fd.get("title"));
  if (!title) fail(b, "Indiquez le titre du module.");
  const supabase = await createClient();
  const { count } = await supabase.from("course_modules").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  const { error } = await supabase.from("course_modules").insert({ course_id: courseId, title, description: str(fd.get("description")) || null, position: (count ?? 0) + 1 });
  if (error) fail(b, error);
  done(b, "Module ajouté.");
}

export async function updateModuleAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const supabase = await createClient();
  const { error } = await supabase.from("course_modules").update({ title: str(fd.get("title")), description: str(fd.get("description")) || null }).eq("id", str(fd.get("module_id")));
  if (error) fail(b, error);
  done(b, "Module enregistré.");
}

export async function deleteModuleAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const supabase = await createClient();
  const { error } = await supabase.from("course_modules").delete().eq("id", str(fd.get("module_id")));
  if (error) fail(b, error);
  done(b, "Module supprimé (avec ses leçons).");
}

async function swapPosition(table: "course_modules" | "lessons" | "lesson_contents" | "questions", id: string, dir: "up" | "down", scope: { col: string; val: string }) {
  const supabase = await createClient();
  const { data: rows } = await supabase.from(table).select("id, position").eq(scope.col, scope.val).order("position").order("created_at");
  const list = (rows ?? []).map((r, i) => ({ ...r, position: i + 1 }));
  const i = list.findIndex((r) => r.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i].position, list[j].position] = [list[j].position, list[i].position];
  await Promise.all(list.map((r) => supabase.from(table).update({ position: r.position }).eq("id", r.id)));
}

export async function moveAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const table = str(fd.get("table")) as "course_modules" | "lessons" | "lesson_contents" | "questions";
  const scopes = { course_modules: "course_id", lessons: "module_id", lesson_contents: "lesson_id", questions: "exercise_id" } as const;
  if (!(table in scopes)) fail(b, "Opération invalide.");
  await swapPosition(table, str(fd.get("id")), str(fd.get("dir")) === "up" ? "up" : "down", { col: scopes[table], val: str(fd.get("scope")) });
  revalidatePath(b.split("?")[0]);
  redirect(b);
}

export async function addLessonAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const moduleId = str(fd.get("module_id"));
  const title = str(fd.get("title"));
  if (!title) fail(b, "Indiquez le titre de la leçon.");
  const supabase = await createClient();
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
  const { data, error } = await supabase.from("lessons").insert({ module_id: moduleId, title, position: (count ?? 0) + 1 }).select("id, course_id").single();
  if (error || !data) fail(b, error);
  redirect(withFlash(`/enseignant/cours/${data!.course_id}/lecons/${data!.id}`, "ok", "Leçon créée : ajoutez son contenu."));
}

export async function updateLessonAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").update({
    title: str(fd.get("title")), summary: str(fd.get("summary")) || null,
    estimated_minutes: int(fd.get("estimated_minutes")), is_preview: fd.get("is_preview") === "on",
    ...(str(fd.get("module_id")) ? { module_id: str(fd.get("module_id")) } : {}),
  }).eq("id", str(fd.get("lesson_id")));
  if (error) fail(b, error);
  done(b, "Leçon enregistrée.");
}

export async function deleteLessonAction(fd: FormData) {
  await requireStaff();
  const courseId = str(fd.get("course_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").delete().eq("id", str(fd.get("lesson_id")));
  if (error) fail(`/enseignant/cours/${courseId}`, error);
  done(`/enseignant/cours/${courseId}`, "Leçon supprimée.");
}

// ------------------------------------------------------------------ blocs de contenu
async function blockDataFromForm(type: BlockType, fd: FormData, lessonId: string): Promise<Record<string, unknown> | string> {
  const supabase = await createClient();
  switch (type) {
    case "heading": return { text: str(fd.get("text")), level: str(fd.get("level")) === "3" ? 3 : 2 };
    case "paragraph": return { text: str(fd.get("text")) };
    case "note": return { text: str(fd.get("text")), variant: ["info", "warning", "culture", "source"].includes(str(fd.get("variant"))) ? str(fd.get("variant")) : "info" };
    case "example": return { mandinka: str(fd.get("mandinka")).normalize("NFC"), french: str(fd.get("french")), source: str(fd.get("source")) || undefined };
    case "vocabulary": {
      // une ligne par mot : mandinka = français [= id d'entrée facultatif]
      const items = lines(str(fd.get("items"))).map((l) => {
        const [m, f, id] = l.split("=").map((x) => x.trim());
        return { mandinka: (m ?? "").normalize("NFC"), french: f ?? "", ...(id && /^[0-9a-f-]{36}$/i.test(id) ? { entry_id: id } : {}) };
      }).filter((x) => x.mandinka);
      return { title: str(fd.get("title")) || undefined, items, source: str(fd.get("source")) || undefined };
    }
    case "dialogue": {
      // une ligne par réplique : Locuteur : texte mandinka = traduction
      const ls = lines(str(fd.get("lines"))).map((l) => {
        const [sp, rest = ""] = l.includes(":") ? [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 1)] : ["?", l];
        const [m, f] = rest.split("=").map((x) => x.trim());
        return { speaker: sp.trim(), mandinka: (m ?? "").normalize("NFC"), french: f ?? "" };
      });
      return { title: str(fd.get("title")) || undefined, lines: ls, source: str(fd.get("source")) || undefined };
    }
    case "table": {
      const rows = lines(str(fd.get("rows"))).map((l) => l.split("|").map((c) => c.trim()));
      return { caption: str(fd.get("caption")) || undefined, headers: str(fd.get("headers")).split("|").map((c) => c.trim()).filter(Boolean), rows };
    }
    case "image": {
      const file = fd.get("file") as File | null;
      let url = str(fd.get("url"));
      if (file && file.size > 0) {
        const err = checkFile(file, "image");
        if (err) return err;
        const path = `lessons/${lessonId}/${safeFileName(file.name)}`;
        const { error } = await supabase.storage.from("public-media").upload(path, file, { contentType: file.type });
        if (error) return "L’image n’a pas pu être envoyée.";
        url = publicMediaUrl(path);
      }
      if (url && !/^https:\/\//.test(url)) return "L’adresse de l’image doit commencer par https://";
      return { url, alt: str(fd.get("alt")), caption: str(fd.get("caption")) || undefined };
    }
    case "audio": return { audio_id: str(fd.get("audio_id")), title: str(fd.get("title")) || undefined };
    case "video": case "file": {
      const file = fd.get("file") as File | null;
      let path = str(fd.get("path")) || undefined;
      if (file && file.size > 0) {
        const err = checkFile(file, "doc");
        if (err) return err;
        path = `lessons/${lessonId}/${safeFileName(file.name)}`;
        const { error } = await supabase.storage.from("course-files").upload(path, file, { contentType: file.type });
        if (error) return "Le fichier n’a pas pu être envoyé.";
      }
      const url = str(fd.get("url"));
      if (url && !/^https:\/\//.test(url)) return "L’adresse doit commencer par https://";
      return { path, url: url || undefined, title: str(fd.get("title")) || undefined };
    }
    case "exercise_link": return { exercise_id: str(fd.get("exercise_id")), label: str(fd.get("label")) || undefined };
    case "assignment_link": return { assignment_id: str(fd.get("assignment_id")), label: str(fd.get("label")) || undefined };
  }
  return "Type de bloc inconnu.";
}

export async function saveBlockAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const lessonId = str(fd.get("lesson_id"));
  const type = str(fd.get("block_type")) as BlockType;
  const blockId = str(fd.get("block_id"));
  const data = await blockDataFromForm(type, fd, lessonId);
  if (typeof data === "string") fail(b, data);
  const supabase = await createClient();
  if (blockId) {
    // conserve un fichier existant si aucun nouveau n'est fourni
    const { data: old } = await supabase.from("lesson_contents").select("data").eq("id", blockId).single();
    const merged = { ...(old?.data as object), ...Object.fromEntries(Object.entries(data as object).filter(([, v]) => v !== undefined && v !== "")) };
    const { error } = await supabase.from("lesson_contents").update({ data: type === "image" || type === "file" || type === "video" ? merged : data }).eq("id", blockId);
    if (error) fail(b, error);
    done(b, "Bloc enregistré.");
  }
  const { count } = await supabase.from("lesson_contents").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId);
  const { error } = await supabase.from("lesson_contents").insert({ lesson_id: lessonId, block_type: type, data, position: (count ?? 0) + 1 });
  if (error) fail(b, error);
  done(b, "Bloc ajouté.");
}

export async function deleteBlockAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_contents").delete().eq("id", str(fd.get("block_id")));
  if (error) fail(b, error);
  done(b, "Bloc supprimé.");
}

// ------------------------------------------------------------------ exercices
export async function createExerciseAction(fd: FormData) {
  const user = await requireStaff();
  const courseId = str(fd.get("course_id"));
  const b = back(fd, `/enseignant/cours/${courseId}`);
  const title = str(fd.get("title"));
  if (!title) fail(b, "Indiquez le titre de l’exercice.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").insert({
    course_id: courseId, title, kind: str(fd.get("kind")) || "exercise",
    module_id: str(fd.get("module_id")) || null, lesson_id: str(fd.get("lesson_id")) || null, created_by: user.id,
  }).select("id").single();
  if (error || !data) fail(b, error);
  redirect(withFlash(`/enseignant/cours/${courseId}/exercices/${data!.id}`, "ok", "Exercice créé : ajoutez des questions puis publiez-le."));
}

export async function updateExerciseAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const supabase = await createClient();
  const { error } = await supabase.from("exercises").update({
    title: str(fd.get("title")), description: str(fd.get("description")) || null, kind: str(fd.get("kind")),
    difficulty: Math.min(3, Math.max(1, int(fd.get("difficulty"), 1)!)), pass_score: Math.min(100, Math.max(0, int(fd.get("pass_score"), 70)!)),
    max_attempts: int(fd.get("max_attempts")), module_id: str(fd.get("module_id")) || null, lesson_id: str(fd.get("lesson_id")) || null,
    is_published: fd.get("is_published") === "on",
  }).eq("id", str(fd.get("exercise_id")));
  if (error) fail(b, error);
  done(b, "Exercice enregistré.");
}

export async function deleteExerciseAction(fd: FormData) {
  await requireStaff();
  const courseId = str(fd.get("course_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("exercises").delete().eq("id", str(fd.get("exercise_id")));
  if (error) fail(`/enseignant/cours/${courseId}`, error);
  done(`/enseignant/cours/${courseId}`, "Exercice supprimé.");
}

/** Traduit le champ « réponses » selon le type de question. */
function parseAnswers(type: QuestionType, raw: string) {
  const ls = lines(raw);
  switch (type) {
    case "mcq": case "multi":
      return ls.map((l, i) => ({ position: i + 1, content: l.replace(/^\*\s*/, "").normalize("NFC"), is_correct: l.startsWith("*"), match_key: null }));
    case "true_false": {
      const truth = /^(vrai|v|true|oui)$/i.test(ls[0] ?? "");
      return [{ position: 1, content: "Vrai", is_correct: truth, match_key: null }, { position: 2, content: "Faux", is_correct: !truth, match_key: null }];
    }
    case "matching":
      return ls.map((l, i) => { const [a, m] = l.split("=").map((x) => x.trim()); return { position: i + 1, content: (a ?? "").normalize("NFC"), is_correct: false, match_key: m ?? "" }; });
    default:
      return ls.map((l, i) => ({ position: i + 1, content: l.normalize("NFC"), is_correct: true, match_key: null }));
  }
}

export async function saveQuestionAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const exerciseId = str(fd.get("exercise_id"));
  const questionId = str(fd.get("question_id"));
  const type = str(fd.get("type")) as QuestionType;
  const prompt = str(fd.get("prompt")).normalize("NFC");
  if (!prompt) fail(b, "L’énoncé est obligatoire.");
  const answers = parseAnswers(type, str(fd.get("answers")));
  if (["mcq", "multi"].includes(type) && (answers.length < 2 || !answers.some((a) => a.is_correct))) fail(b, "Indiquez au moins deux choix et marquez la ou les bonnes réponses avec *.");
  if (type === "matching" && (answers.length < 2 || answers.some((a) => !a.match_key))) fail(b, "Écrivez au moins deux paires « mot = traduction ».");
  if (!["mcq", "multi", "true_false", "matching"].includes(type) && answers.length === 0) fail(b, "Indiquez au moins une réponse acceptée.");
  const data: Record<string, unknown> = { ignore_tones: fd.get("ignore_tones") === "on" };
  if (type === "word_order") {
    const tokens = answers[0].content.replace(/[.,!?;:]/g, " ").split(/\s+/).filter(Boolean);
    const extra = str(fd.get("distractors")).split(/\s+/).filter(Boolean);
    data.tokens = [...tokens, ...extra];
  }
  const row = { exercise_id: exerciseId, type, prompt, explanation: str(fd.get("explanation")) || null, points: Math.max(1, int(fd.get("points"), 1)!), audio_id: str(fd.get("audio_id")) || null, data };
  const supabase = await createClient();
  let qid = questionId;
  if (qid) {
    const { error } = await supabase.from("questions").update(row).eq("id", qid);
    if (error) fail(b, error);
    await supabase.from("answers").delete().eq("question_id", qid);
  } else {
    const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("exercise_id", exerciseId);
    const { data: q, error } = await supabase.from("questions").insert({ ...row, position: (count ?? 0) + 1 }).select("id").single();
    if (error || !q) fail(b, error);
    qid = q!.id;
  }
  const { error } = await supabase.from("answers").insert(answers.map((a) => ({ ...a, question_id: qid })));
  if (error) fail(b, error);
  done(b, "Question enregistrée.");
}

export async function deleteQuestionAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().eq("id", str(fd.get("question_id")));
  if (error) fail(b, error);
  done(b, "Question supprimée.");
}

// ------------------------------------------------------------------ devoirs
export async function saveAssignmentAction(fd: FormData) {
  const user = await requireStaff();
  const courseId = str(fd.get("course_id"));
  const b = back(fd, `/enseignant/cours/${courseId}/devoirs`);
  const title = str(fd.get("title"));
  if (!title) fail(b, "Indiquez le titre du devoir.");
  const supabase = await createClient();
  const row = {
    course_id: courseId, title, instructions: str(fd.get("instructions")), lesson_id: str(fd.get("lesson_id")) || null,
    due_at: str(fd.get("due_at")) ? new Date(str(fd.get("due_at"))).toISOString() : null, max_score: Math.max(1, int(fd.get("max_score"), 20)!),
    is_published: fd.get("is_published") !== "off",
  };
  const id = str(fd.get("assignment_id"));
  const { error } = id ? await supabase.from("assignments").update(row).eq("id", id) : await supabase.from("assignments").insert({ ...row, created_by: user.id });
  if (error) fail(b, error);
  done(b, "Devoir enregistré.");
}

export async function gradeSubmissionAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const score = Number(str(fd.get("score")).replace(",", "."));
  const max = Number(fd.get("max_score"));
  if (!Number.isFinite(score) || score < 0 || score > max) fail(b, `La note doit être comprise entre 0 et ${max}.`);
  const supabase = await createClient();
  const { error } = await supabase.from("assignment_submissions").update({ score, feedback: str(fd.get("feedback")) || null, status: "graded" }).eq("id", str(fd.get("submission_id")));
  if (error) fail(b, error);
  done(b, "Copie corrigée : l’apprenant est notifié.");
}

// ------------------------------------------------------------------ inscriptions
export async function setEnrollmentStatusAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant");
  const status = str(fd.get("status"));
  if (!["active", "suspended"].includes(status)) fail(b, "Statut invalide.");
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").update({ status }).eq("id", str(fd.get("enrollment_id")));
  if (error) fail(b, error);
  done(b, status === "suspended" ? "Inscription suspendue." : "Inscription réactivée.");
}

// ------------------------------------------------------------------ annonces
export async function createAnnouncementAction(fd: FormData) {
  const user = await requireStaff();
  const b = "/enseignant/annonces";
  const title = str(fd.get("title"));
  const body = str(fd.get("body"));
  if (!title || !body) fail(b, "Titre et message sont obligatoires.");
  const courseId = str(fd.get("course_id")) || null;
  if (!courseId && !user.isAdmin) fail(b, "Choisissez un cours (seul un administrateur publie des annonces générales).");
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ course_id: courseId, author_id: user.id, title: title.slice(0, 200), body: body.slice(0, 5000) });
  if (error) fail(b, error);
  done(b, "Annonce publiée : les apprenants concernés sont notifiés.");
}

export async function deleteAnnouncementAction(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", str(fd.get("id")));
  done("/enseignant/annonces", "Annonce supprimée.");
}

// ------------------------------------------------------------------ audio
export async function uploadAudioAction(fd: FormData) {
  const user = await requireStaff();
  const b = "/enseignant/audio";
  if (fd.get("speaker_consent") !== "on") fail(b, "Le consentement du locuteur est obligatoire pour publier un enregistrement.");
  const file = fd.get("file") as File | null;
  const err = checkFile(file, "audio");
  if (err) fail(b, err);
  const title = str(fd.get("title"));
  if (!title) fail(b, "Indiquez un titre.");
  const supabase = await createClient();
  const path = `${new Date().getFullYear()}/${safeFileName(file!.name)}`;
  const { error: upErr } = await supabase.storage.from("audio").upload(path, file!, { contentType: file!.type });
  if (upErr) fail(b, "Le fichier audio n’a pas pu être envoyé.");
  const lessonId = str(fd.get("lesson_id")) || null;
  let courseId = str(fd.get("course_id")) || null;
  if (lessonId && !courseId) courseId = (await supabase.from("lessons").select("course_id").eq("id", lessonId).single()).data?.course_id ?? null;
  const { error } = await supabase.from("audio_resources").insert({
    title, kind: str(fd.get("kind")) || "word", transcript: str(fd.get("transcript")).normalize("NFC") || null, translation_fr: str(fd.get("translation_fr")) || null,
    storage_path: path, mime_type: file!.type, speaker_name: str(fd.get("speaker_name")) || null, speaker_region: str(fd.get("speaker_region")) || null,
    speaker_consent: true, course_id: courseId, lesson_id: lessonId, uploaded_by: user.id,
  });
  if (error) { await supabase.storage.from("audio").remove([path]); fail(b, error); }
  const entryId = str(fd.get("entry_id"));
  if (entryId) {
    const { data: a } = await supabase.from("audio_resources").select("id").eq("storage_path", path).single();
    if (a) await supabase.from("dictionary_entries").update({ audio_id: a.id }).eq("id", entryId);
  }
  done(b, "Enregistrement ajouté au laboratoire de prononciation.");
}

export async function deleteAudioAction(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from("audio_resources").select("storage_path").eq("id", str(fd.get("id"))).single();
  const { error } = await supabase.from("audio_resources").delete().eq("id", str(fd.get("id")));
  if (error) fail("/enseignant/audio", error);
  if (data) await supabase.storage.from("audio").remove([data.storage_path]);
  done("/enseignant/audio", "Enregistrement supprimé.");
}

// ------------------------------------------------------------------ bibliothèque
export async function uploadDocumentAction(fd: FormData) {
  const user = await requireStaff();
  const b = "/enseignant/bibliotheque";
  const title = str(fd.get("title"));
  if (!title) fail(b, "Indiquez un titre.");
  const file = fd.get("file") as File | null;
  const url = str(fd.get("external_url"));
  if ((!file || file.size === 0) && !url) fail(b, "Joignez un fichier ou indiquez un lien.");
  if (url && !/^https:\/\//.test(url)) fail(b, "Le lien doit commencer par https://");
  const supabase = await createClient();
  let path: string | null = null;
  if (file && file.size > 0) {
    const err = checkFile(file, "doc");
    if (err) fail(b, err);
    path = `library/${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from("course-files").upload(path, file, { contentType: file.type });
    if (error) fail(b, "Le fichier n’a pas pu être envoyé.");
  }
  const visibility = ["public", "enrolled", "staff", "private"].includes(str(fd.get("visibility"))) ? str(fd.get("visibility")) : "staff";
  const { error } = await supabase.from("documents").insert({
    title, description: str(fd.get("description")) || null, category: str(fd.get("category")) || "support",
    storage_path: path, external_url: url || null, mime_type: file && file.size ? file.type : null, size_bytes: file && file.size ? file.size : null,
    course_id: str(fd.get("course_id")) || null, lesson_id: str(fd.get("lesson_id")) || null, source_id: str(fd.get("source_id")) || null,
    visibility, is_downloadable: fd.get("is_downloadable") === "on", rights_note: str(fd.get("rights_note")) || null, uploaded_by: user.id,
  });
  if (error) { if (path) await supabase.storage.from("course-files").remove([path]); fail(b, error); }
  revalidatePath("/bibliotheque");
  done(b, "Document ajouté à la bibliothèque.");
}

export async function deleteDocumentAction(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("storage_path").eq("id", str(fd.get("id"))).single();
  const { error } = await supabase.from("documents").delete().eq("id", str(fd.get("id")));
  if (error) fail("/enseignant/bibliotheque", error);
  if (data?.storage_path) await supabase.storage.from("course-files").remove([data.storage_path]);
  revalidatePath("/bibliotheque");
  done("/enseignant/bibliotheque", "Document supprimé.");
}

// ------------------------------------------------------------------ propositions lexicales
export async function reviewSubmissionAction(fd: FormData) {
  await requireStaff();
  const b = back(fd, "/enseignant/propositions");
  const supabase = await createClient();
  const approve = str(fd.get("decision")) === "approve";
  const { error } = await supabase.rpc("review_lexical_submission", {
    p_id: str(fd.get("submission_id")), p_approve: approve, p_notes: str(fd.get("notes")) || null, p_publish: fd.get("publish") === "on",
  });
  if (error) fail(b, error);
  revalidatePath("/dictionnaire");
  done(b, approve ? "Proposition acceptée et ajoutée au dictionnaire." : "Proposition refusée ; le contributeur est notifié.");
}
