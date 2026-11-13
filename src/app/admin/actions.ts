"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { humanError, withFlash } from "@/lib/flash";
import { extractDocument } from "@/lib/import/extract";
import { SITE_URL } from "@/lib/env";
import { safeNext, slugify, str } from "@/lib/utils";
import type { AppRole } from "@/lib/types";

const fail = (back: string, e: { message?: string; code?: string } | string | null | undefined): never =>
  redirect(withFlash(back, "erreur", typeof e === "string" ? e : humanError(e)));
const done = (back: string, msg: string): never => { revalidatePath(back.split("?")[0]); redirect(withFlash(back, "ok", msg)); };
const back = (fd: FormData, fallback: string) => safeNext(str(fd.get("back")), fallback);
const POS = ["nom", "verbe", "adjectif", "adverbe", "pronom", "postposition", "conjonction", "interjection", "numeral", "determinant", "particule", "locution", "expression", "autre"];

// ------------------------------------------------------------------ utilisateurs
export async function setRoleAction(fd: FormData) {
  const admin = await requireAdmin();
  const b = back(fd, "/admin/utilisateurs");
  const userId = str(fd.get("user_id"));
  const role = str(fd.get("role")) as AppRole;
  const grant = str(fd.get("grant")) === "1";
  if (!["admin", "teacher", "student"].includes(role)) fail(b, "Rôle invalide.");
  if (!grant && role === "admin" && userId === admin.id) fail(b, "Vous ne pouvez pas retirer votre propre rôle d’administrateur.");
  const supabase = await createClient();
  const { error } = grant
    ? await supabase.from("users_roles").insert({ user_id: userId, role, granted_by: admin.id })
    : await supabase.from("users_roles").delete().eq("user_id", userId).eq("role", role);
  if (error) fail(b, error);
  done(b, grant ? "Rôle attribué." : "Rôle retiré.");
}

export async function updateUserAction(fd: FormData) {
  const admin = await requireAdmin();
  const b = back(fd, "/admin/utilisateurs");
  const userId = str(fd.get("user_id"));
  const supabase = await createClient();
  const isActive = fd.get("is_active") === "on";
  if (!isActive && userId === admin.id) fail(b, "Vous ne pouvez pas suspendre votre propre compte.");
  const { error } = await supabase.from("profiles").update({ is_active: isActive, level: str(fd.get("level")) || "debutant" }).eq("id", userId);
  if (error) fail(b, error);
  if (fd.has("can_publish_directly")) {
    await supabase.from("teachers").update({ can_publish_directly: fd.get("can_publish_directly") === "on" }).eq("user_id", userId);
  }
  await supabase.rpc("kd_log", { p_action: isActive ? "user_updated" : "user_suspended", p_entity_type: "profiles", p_entity_id: userId, p_details: { level: str(fd.get("level")) } });
  done(b, "Utilisateur mis à jour.");
}

/** Création d'un compte enseignant par invitation e-mail (clé service côté serveur uniquement). */
export async function inviteTeacherAction(fd: FormData) {
  const admin = await requireAdmin();
  const b = "/admin/utilisateurs";
  const email = str(fd.get("email")).toLowerCase();
  const first = str(fd.get("first_name"));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(b, "Adresse e-mail invalide.");
  const svc = createAdminClient();
  if (!svc) fail(b, "La clé SUPABASE_SERVICE_ROLE_KEY n’est pas configurée : demandez à l’enseignant de créer son compte, puis attribuez-lui le rôle « enseignant » ci-dessous.");
  const { data, error } = await svc!.auth.admin.inviteUserByEmail(email, {
    data: { first_name: first, last_name: str(fd.get("last_name")) },
    redirectTo: `${SITE_URL}/auth/callback?suivant=/reinitialiser`,
  });
  if (error || !data.user) fail(b, error?.message?.includes("already") ? "Un compte existe déjà avec cet e-mail : attribuez-lui le rôle depuis la liste." : "L’invitation n’a pas pu être envoyée.");
  const supabase = await createClient();
  const { error: rErr } = await supabase.from("users_roles").insert({ user_id: data.user!.id, role: "teacher", granted_by: admin.id });
  if (rErr) fail(b, rErr);
  done(b, `Invitation envoyée à ${email}. Le compte enseignant est créé.`);
}

// ------------------------------------------------------------------ cours
export async function reviewCourseAction(fd: FormData) {
  await requireAdmin();
  const b = back(fd, "/admin/cours");
  const supabase = await createClient();
  const approve = str(fd.get("decision")) === "approve";
  const notes = str(fd.get("notes"));
  if (!approve && !notes) fail(b, "Indiquez à l’enseignant ce qu’il faut revoir.");
  const { error } = await supabase.rpc("review_course", { p_course: str(fd.get("course_id")), p_approve: approve, p_notes: notes || null });
  if (error) fail(b, error);
  revalidatePath("/academie");
  done(b, approve ? "Cours publié." : "Cours renvoyé à l’enseignant.");
}

export async function assignTeacherAction(fd: FormData) {
  await requireAdmin();
  const b = back(fd, "/admin/cours");
  const supabase = await createClient();
  const { error } = await supabase.from("courses").update({ teacher_id: str(fd.get("teacher_id")) || null }).eq("id", str(fd.get("course_id")));
  if (error) fail(b, error);
  done(b, "Enseignant responsable mis à jour.");
}

export async function coTeacherAction(fd: FormData) {
  await requireAdmin();
  const b = back(fd, "/admin/cours");
  const supabase = await createClient();
  const courseId = str(fd.get("course_id"));
  const teacherId = str(fd.get("teacher_id"));
  const { error } = str(fd.get("op")) === "remove"
    ? await supabase.from("course_teachers").delete().eq("course_id", courseId).eq("teacher_id", teacherId)
    : await supabase.from("course_teachers").insert({ course_id: courseId, teacher_id: teacherId });
  if (error) fail(b, error);
  done(b, "Co-enseignants mis à jour.");
}

// ------------------------------------------------------------------ dictionnaire
function entryFromForm(fd: FormData) {
  const pos = str(fd.get("part_of_speech"));
  return {
    headword: str(fd.get("headword")).normalize("NFC"),
    variants: str(fd.get("variants")).split(",").map((v) => v.trim().normalize("NFC")).filter(Boolean),
    translation_fr: str(fd.get("translation_fr")),
    definition: str(fd.get("definition")) || null,
    part_of_speech: POS.includes(pos) ? pos : null,
    pronunciation: str(fd.get("pronunciation")) || null,
    tone_notes: str(fd.get("tone_notes")) || null,
    notes: str(fd.get("notes")) || null,
    regional_variant: str(fd.get("regional_variant")) || null,
    orthography: str(fd.get("orthography")) || "karang_dulaa",
    source_id: str(fd.get("source_id")) || null,
    source_page: str(fd.get("source_page")) || null,
    status: str(fd.get("status")) || "draft",
  };
}

export async function saveEntryAction(fd: FormData) {
  const user = await requireStaff();
  const id = str(fd.get("entry_id"));
  const b = back(fd, id ? `/admin/dictionnaire/${id}` : "/admin/dictionnaire");
  const row = entryFromForm(fd);
  if (!row.headword || !row.translation_fr) fail(b, "Le mot et sa traduction sont obligatoires.");
  if (row.source_id && !row.source_page) fail(b, "Indiquez la page de référence de la source.");
  if (row.status === "published" && !user.isAdmin && !user.isTeacher) fail(b, "Publication non autorisée.");
  const supabase = await createClient();
  let entryId = id;
  if (id) {
    const { error } = await supabase.from("dictionary_entries").update(row).eq("id", id);
    if (error) fail(b, error);
  } else {
    const { data, error } = await supabase.from("dictionary_entries").insert({ ...row, created_by: user.id }).select("id").single();
    if (error || !data) fail(b, error);
    entryId = data!.id;
  }
  // catégories
  const cats = fd.getAll("categories").map(String).filter(Boolean);
  await supabase.from("dictionary_entry_categories").delete().eq("entry_id", entryId);
  if (cats.length) await supabase.from("dictionary_entry_categories").insert(cats.map((c) => ({ entry_id: entryId, category_id: c })));
  // exemples : une ligne « mandinka = français (= page) »
  if (fd.has("examples")) {
    await supabase.from("dictionary_examples").delete().eq("entry_id", entryId);
    const ex = str(fd.get("examples")).split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const [m, f, pg] = l.split("=").map((x) => x.trim());
      return { entry_id: entryId, mandinka: (m ?? "").normalize("NFC"), french: f || null, source_page: pg || null, position: i };
    }).filter((e) => e.mandinka);
    if (ex.length) await supabase.from("dictionary_examples").insert(ex);
  }
  revalidatePath("/dictionnaire");
  if (!id) redirect(withFlash(`/admin/dictionnaire/${entryId}`, "ok", "Entrée créée."));
  done(b, "Entrée enregistrée.");
}

export async function deleteEntryAction(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("dictionary_entries").delete().eq("id", str(fd.get("entry_id")));
  if (error) fail(`/admin/dictionnaire/${str(fd.get("entry_id"))}`, error);
  revalidatePath("/dictionnaire");
  redirect(withFlash("/admin/dictionnaire", "ok", "Entrée supprimée."));
}

// ------------------------------------------------------------------ import documentaire
export async function processImportAction(input: { path: string; filename: string; mime: string; sourceId: string | null; orthography: string; pageOffset: number }) {
  const user = await requireAdmin();
  const supabase = await createClient();
  if (!input.path.startsWith("imports/")) return { ok: false as const, error: "Chemin invalide." };
  const { data: job, error: jErr } = await supabase.from("import_jobs").insert({
    filename: input.filename.slice(0, 200), storage_path: input.path, mime_type: input.mime, source_id: input.sourceId,
    orthography: ["creissels_2012", "drame_2003", "karang_dulaa", "autre"].includes(input.orthography) ? input.orthography : "autre", created_by: user.id,
  }).select("id").single();
  if (jErr || !job) return { ok: false as const, error: humanError(jErr) };
  try {
    const { data: blob, error } = await supabase.storage.from("sources").download(input.path);
    if (error || !blob) throw new Error("Fichier introuvable dans la bibliothèque privée.");
    const result = await extractDocument(Buffer.from(await blob.arrayBuffer()), input.mime, input.filename, input.pageOffset);
    for (let i = 0; i < result.candidates.length; i += 500) {
      const chunk = result.candidates.slice(i, i + 500).map((c) => ({
        job_id: job.id, page: c.page, raw_text: c.raw_text.slice(0, 8000), headword: c.headword, translation_fr: c.translation_fr,
        part_of_speech: c.part_of_speech, examples: c.examples, confidence: c.confidence,
      }));
      const { error: iErr } = await supabase.from("import_items").insert(chunk);
      if (iErr) throw new Error(humanError(iErr));
    }
    await supabase.from("import_jobs").update({ status: "reviewing", page_count: result.pageCount, char_count: result.charCount, sections: result.sections }).eq("id", job.id);
    return { ok: true as const, jobId: job.id as string };
  } catch (e) {
    await supabase.from("import_jobs").update({ status: "failed", error: e instanceof Error ? e.message : "Erreur" }).eq("id", job.id);
    return { ok: false as const, error: e instanceof Error ? e.message : "L’extraction a échoué.", jobId: job.id as string };
  }
}

export async function reviewImportItemAction(fd: FormData) {
  const user = await requireAdmin();
  const b = back(fd, "/admin/import");
  const decision = str(fd.get("decision"));
  const supabase = await createClient();
  const examples = str(fd.get("examples")).split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [m, f] = l.split("=").map((x) => x.trim());
    return { mandinka: (m ?? "").normalize("NFC"), french: f ?? "" };
  });
  const pos = str(fd.get("part_of_speech"));
  const { error } = await supabase.from("import_items").update({
    headword: str(fd.get("headword")).normalize("NFC") || null, translation_fr: str(fd.get("translation_fr")) || null,
    part_of_speech: POS.includes(pos) ? pos : null, page: str(fd.get("page")) || null, examples,
    status: decision === "reject" ? "rejected" : decision === "approve" ? "approved" : "pending",
    reviewed_by: user.id, reviewed_at: new Date().toISOString(),
  }).eq("id", str(fd.get("item_id"))).neq("status", "imported");
  if (error) fail(b, error);
  revalidatePath(b.split("?")[0]);
  redirect(b);
}

export async function bulkApproveAction(fd: FormData) {
  const user = await requireAdmin();
  const jobId = str(fd.get("job_id"));
  const b = back(fd, `/admin/import/${jobId}`);
  const min = Number(fd.get("min_confidence") ?? 0.8);
  const supabase = await createClient();
  const { error, count } = await supabase.from("import_items").update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() }, { count: "exact" })
    .eq("job_id", jobId).eq("status", "pending").gte("confidence", min).not("headword", "is", null).not("translation_fr", "is", null);
  if (error) fail(b, error);
  done(b, `${count ?? 0} élément(s) marqué(s) comme approuvé(s). Vérifiez-les avant l’enregistrement définitif.`);
}

/** Enregistre les éléments approuvés dans le dictionnaire (statut choisi), sans jamais modifier leur texte. */
export async function commitImportAction(fd: FormData) {
  const user = await requireAdmin();
  const jobId = str(fd.get("job_id"));
  const b = `/admin/import/${jobId}`;
  const status = ["draft", "pending_review", "published"].includes(str(fd.get("status"))) ? str(fd.get("status")) : "draft";
  const supabase = await createClient();
  const { data: job } = await supabase.from("import_jobs").select("*").eq("id", jobId).single();
  if (!job) fail(b, "Import introuvable.");
  if (status === "published" && job!.source_id) {
    const { data: src } = await supabase.from("dictionary_sources").select("rights_status").eq("id", job!.source_id).single();
    if (src?.rights_status === "restricted") fail(b, "La source est en diffusion restreinte : enregistrez en brouillon.");
  }
  const { data: items } = await supabase.from("import_items").select("*").eq("job_id", jobId).eq("status", "approved").limit(2000);
  let created = 0;
  let skipped = 0;
  for (const it of items ?? []) {
    if (!it.headword || !it.translation_fr) { skipped++; continue; }
    if (job!.source_id && !it.page) { skipped++; continue; }
    const { data: dup } = await supabase.from("dictionary_entries").select("id").eq("headword", it.headword).eq("translation_fr", it.translation_fr).eq("source_id", job!.source_id).maybeSingle();
    if (dup) { await supabase.from("import_items").update({ status: "imported", entry_id: dup.id }).eq("id", it.id); skipped++; continue; }
    const { data: e, error } = await supabase.from("dictionary_entries").insert({
      headword: it.headword, translation_fr: it.translation_fr, part_of_speech: it.part_of_speech, orthography: job!.orthography,
      source_id: job!.source_id, source_page: it.page, status, created_by: user.id,
      notes: `Import documentaire (${job!.filename}) validé par l’administration.`,
    }).select("id").single();
    if (error || !e) { skipped++; continue; }
    const ex = ((it.examples ?? []) as { mandinka: string; french: string }[]).filter((x) => x.mandinka).map((x, i) => ({ entry_id: e.id, mandinka: x.mandinka, french: x.french || null, source_page: it.page, position: i }));
    if (ex.length) await supabase.from("dictionary_examples").insert(ex);
    await supabase.from("import_items").update({ status: "imported", entry_id: e.id }).eq("id", it.id);
    created++;
  }
  const { count: left } = await supabase.from("import_items").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "pending");
  if (!left) await supabase.from("import_jobs").update({ status: "completed" }).eq("id", jobId);
  await supabase.rpc("kd_log", { p_action: "import_commit", p_entity_type: "import_jobs", p_entity_id: jobId, p_details: { created, skipped, status } });
  revalidatePath("/dictionnaire");
  done(b, `${created} entrée(s) ajoutée(s) au dictionnaire (${status === "published" ? "publiées" : status === "draft" ? "en brouillon" : "à valider"}), ${skipped} ignorée(s) (doublons ou champs manquants).`);
}

export async function deleteImportJobAction(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: job } = await supabase.from("import_jobs").select("storage_path").eq("id", str(fd.get("job_id"))).single();
  await supabase.from("import_jobs").delete().eq("id", str(fd.get("job_id")));
  if (job && fd.get("delete_file") === "on") await supabase.storage.from("sources").remove([job.storage_path]);
  done("/admin/import", "Import supprimé (les entrées déjà ajoutées au dictionnaire sont conservées).");
}

// ------------------------------------------------------------------ sources, catégories, témoignages, paramètres
export async function saveSourceAction(fd: FormData) {
  await requireAdmin();
  const b = "/admin/sources";
  const row = {
    title: str(fd.get("title")), author: str(fd.get("author")), year: Number(fd.get("year")) || null, publisher: str(fd.get("publisher")) || null,
    url: str(fd.get("url")) || null, orthography_notes: str(fd.get("orthography_notes")) || null,
    rights_status: ["verified", "to_verify", "restricted"].includes(str(fd.get("rights_status"))) ? str(fd.get("rights_status")) : "to_verify",
    rights_notes: str(fd.get("rights_notes")) || null, public_display: fd.get("public_display") === "on",
  };
  if (!row.title || !row.author) fail(b, "Titre et auteur sont obligatoires.");
  if (row.public_display && row.rights_status !== "verified") fail(b, "L’affichage public n’est possible qu’une fois les droits vérifiés.");
  const supabase = await createClient();
  const id = str(fd.get("source_id"));
  const { error } = id ? await supabase.from("dictionary_sources").update(row).eq("id", id)
    : await supabase.from("dictionary_sources").insert({ ...row, slug: slugify(`${row.author}-${row.year ?? ""}-${row.title}`).slice(0, 60) });
  if (error) fail(b, error);
  revalidatePath("/dictionnaire");
  done(b, "Source enregistrée.");
}

export async function saveCategoryAction(fd: FormData) {
  await requireAdmin();
  const b = "/admin/categories";
  const table = str(fd.get("table")) === "vocabulary_categories" ? "vocabulary_categories" : "course_categories";
  const name = str(fd.get("name"));
  if (!name) fail(b, "Le nom est obligatoire.");
  const supabase = await createClient();
  const id = str(fd.get("id"));
  const row = { name, description: str(fd.get("description")) || null };
  const { error } = id ? await supabase.from(table).update(row).eq("id", id) : await supabase.from(table).insert({ ...row, slug: slugify(name) });
  if (error) fail(b, error);
  done(b, "Catégorie enregistrée.");
}

export async function deleteCategoryAction(fd: FormData) {
  await requireAdmin();
  const table = str(fd.get("table")) === "vocabulary_categories" ? "vocabulary_categories" : "course_categories";
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", str(fd.get("id")));
  if (error) fail("/admin/categories", error);
  done("/admin/categories", "Catégorie supprimée.");
}

export async function moderateTestimonialAction(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = str(fd.get("id"));
  const op = str(fd.get("op"));
  const { error } = op === "delete" ? await supabase.from("testimonials").delete().eq("id", id) : await supabase.from("testimonials").update({ approved: op === "approve" }).eq("id", id);
  if (error) fail("/admin/temoignages", error);
  revalidatePath("/");
  done("/admin/temoignages", "Témoignage mis à jour.");
}

export async function saveSettingsAction(fd: FormData) {
  await requireAdmin();
  const b = "/admin/parametres";
  const supabase = await createClient();
  const emails = str(fd.get("admin_bootstrap_emails")).split(/[\s,;]+/).map((e) => e.toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+$/.test(e));
  const rows = [
    { key: "site", value: { name: str(fd.get("site_name")) || "KARANG-DULAA", tagline: str(fd.get("tagline")), contact_email: str(fd.get("contact_email")) || null } },
    { key: "features", value: { ai_assistant: fd.get("ai_assistant") === "on", leaderboard: fd.get("leaderboard") === "on", lexical_submissions: fd.get("lexical_submissions") === "on", recordings: fd.get("recordings") === "on" } },
    { key: "admin_bootstrap_emails", value: emails },
  ];
  for (const r of rows) {
    const { error } = await supabase.from("platform_settings").upsert({ ...r, updated_at: new Date().toISOString() });
    if (error) fail(b, error);
  }
  done(b, "Paramètres enregistrés.");
}
