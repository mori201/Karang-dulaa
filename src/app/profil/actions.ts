"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { humanError, withFlash } from "@/lib/flash";
import { checkFile, safeFileName, publicMediaUrl } from "@/lib/storage";
import { str } from "@/lib/utils";

const schema = z.object({
  first_name: z.string().min(1, "Le prénom est requis.").max(60),
  full_name: z.string().max(140),
  bio: z.string().max(1000),
  weekly_goal_minutes: z.coerce.number().int().min(10).max(1200),
  daily_goal_xp: z.coerce.number().int().min(5).max(500),
});

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser("/profil");
  const parsed = schema.safeParse({
    first_name: str(formData.get("first_name")),
    full_name: str(formData.get("full_name")),
    bio: str(formData.get("bio")),
    weekly_goal_minutes: formData.get("weekly_goal_minutes"),
    daily_goal_xp: formData.get("daily_goal_xp"),
  });
  if (!parsed.success) redirect(withFlash("/profil", "erreur", parsed.error.issues[0]?.message ?? "Formulaire invalide."));
  const supabase = await createClient();
  const update: Record<string, unknown> = {
    ...parsed.data,
    full_name: parsed.data.full_name || parsed.data.first_name,
    bio: parsed.data.bio || null,
    show_in_leaderboard: formData.get("show_in_leaderboard") === "on",
    recording_consent: formData.get("recording_consent") === "on",
  };
  const avatar = formData.get("avatar") as File | null;
  if (avatar && avatar.size > 0) {
    const err = checkFile(avatar, "image");
    if (err) redirect(withFlash("/profil", "erreur", err));
    const path = `avatars/${user.id}/${safeFileName(avatar.name)}`;
    const { error } = await supabase.storage.from("public-media").upload(path, avatar, { contentType: avatar.type, upsert: true });
    if (error) redirect(withFlash("/profil", "erreur", "La photo n’a pas pu être envoyée."));
    update.avatar_url = publicMediaUrl(path);
  }
  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) redirect(withFlash("/profil", "erreur", humanError(error)));
  if (user.isTeacher) {
    await supabase.from("teachers").update({ title: str(formData.get("teacher_title")) || null, bio: parsed.data.bio || null, is_public: formData.get("teacher_public") === "on" }).eq("user_id", user.id);
  }
  revalidatePath("/", "layout");
  redirect(withFlash("/profil", "ok", "Profil mis à jour."));
}

export async function submitTestimonialAction(formData: FormData) {
  const user = await requireUser("/profil");
  const content = str(formData.get("content"));
  if (content.length < 10) redirect(withFlash("/profil", "erreur", "Votre témoignage doit contenir au moins 10 caractères."));
  const supabase = await createClient();
  const { error } = await supabase.from("testimonials").insert({
    user_id: user.id, author_name: user.profile.full_name || user.profile.first_name || "Apprenant", author_context: str(formData.get("context")) || null, content: content.slice(0, 1000),
  });
  if (error) redirect(withFlash("/profil", "erreur", humanError(error)));
  redirect(withFlash("/profil", "ok", "Merci ! Votre témoignage sera publié après relecture."));
}

/** Suppression du compte (droit à l'effacement). */
export async function deleteAccountAction(formData: FormData) {
  const user = await requireUser("/profil");
  if (str(formData.get("confirm")) !== "SUPPRIMER") redirect(withFlash("/profil", "erreur", "Tapez SUPPRIMER pour confirmer."));
  const admin = createAdminClient();
  if (!admin) redirect(withFlash("/profil", "erreur", "La suppression automatique n’est pas disponible : contactez l’administrateur."));
  const supabase = await createClient();
  // fichiers personnels
  for (const bucket of ["recordings", "submissions"] as const) {
    const { data } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
    if (data?.length) await admin.storage.from(bucket).remove(data.map((f) => `${user.id}/${f.name}`));
  }
  await admin.from("audit_logs").insert({ actor_id: null, action: "account_deleted", entity_type: "profiles", entity_id: user.id, details: {} });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) redirect(withFlash("/profil", "erreur", "La suppression a échoué."));
  await supabase.auth.signOut();
  redirect("/?ok=" + encodeURIComponent("Votre compte a été supprimé."));
}
