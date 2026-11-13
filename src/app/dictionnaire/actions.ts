"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { humanError, withFlash } from "@/lib/flash";
import { safeNext, str } from "@/lib/utils";

export async function toggleFavoriteAction(formData: FormData) {
  const entryId = str(formData.get("entry_id"));
  const back = safeNext(str(formData.get("back")), `/dictionnaire/${entryId}`);
  const user = await requireUser(back);
  const supabase = await createClient();
  const { data: fav } = await supabase.from("dictionary_favorites").select("entry_id").eq("user_id", user.id).eq("entry_id", entryId).maybeSingle();
  if (fav) await supabase.from("dictionary_favorites").delete().eq("user_id", user.id).eq("entry_id", entryId);
  else await supabase.from("dictionary_favorites").insert({ user_id: user.id, entry_id: entryId });
  revalidatePath(back);
  redirect(back);
}

export async function clearHistoryAction() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("search_history").delete().eq("user_id", user.id);
  redirect(withFlash("/dictionnaire/favoris", "ok", "Historique effacé."));
}

const submissionSchema = z.object({
  headword: z.string().min(1, "Indiquez le mot mandinka.").max(120),
  translation_fr: z.string().min(1, "Indiquez la traduction française.").max(500),
  definition: z.string().max(2000),
  part_of_speech: z.string().max(40),
  example_mandinka: z.string().max(500),
  example_french: z.string().max(500),
  regional_variant: z.string().max(200),
  source_info: z.string().min(3, "Précisez d’où vient l’information (locuteur, région, ouvrage…).").max(500),
});

export async function submitWordAction(formData: FormData) {
  const user = await requireUser("/dictionnaire/proposer");
  const raw = Object.fromEntries(["headword", "translation_fr", "definition", "part_of_speech", "example_mandinka", "example_french", "regional_variant", "source_info"].map((k) => [k, str(formData.get(k))]));
  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) redirect(withFlash("/dictionnaire/proposer", "erreur", parsed.error.issues[0]?.message ?? "Formulaire invalide."));
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("lexical_submissions").insert({
    submitted_by: user.id,
    headword: d.headword.normalize("NFC"),
    translation_fr: d.translation_fr,
    definition: d.definition || null,
    part_of_speech: d.part_of_speech || null,
    example_mandinka: d.example_mandinka.normalize("NFC") || null,
    example_french: d.example_french || null,
    regional_variant: d.regional_variant || null,
    source_info: d.source_info,
  });
  if (error) redirect(withFlash("/dictionnaire/proposer", "erreur", humanError(error)));
  revalidatePath("/dictionnaire/proposer");
  redirect(withFlash("/dictionnaire/proposer", "ok", "Merci ! Votre proposition sera vérifiée par un enseignant avant publication."));
}
