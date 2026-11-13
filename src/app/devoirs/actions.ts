"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { humanError, withFlash } from "@/lib/flash";
import { checkFile, safeFileName } from "@/lib/storage";
import { str } from "@/lib/utils";

export async function submitAssignmentAction(formData: FormData) {
  const assignmentId = str(formData.get("assignment_id"));
  const back = `/devoirs/${assignmentId}`;
  const user = await requireUser(back);
  const content = str(formData.get("content"));
  const file = formData.get("file") as File | null;
  const supabase = await createClient();

  let filePath: string | null = null;
  if (file && file.size > 0) {
    const err = checkFile(file, "doc");
    if (err) redirect(withFlash(back, "erreur", err));
    filePath = `${user.id}/${assignmentId}/${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from("submissions").upload(filePath, file, { contentType: file.type });
    if (error) redirect(withFlash(back, "erreur", "Le fichier n’a pas pu être envoyé."));
  }
  if (!content && !filePath) redirect(withFlash(back, "erreur", "Rédigez votre réponse ou joignez un fichier."));

  const { data: existing } = await supabase.from("assignment_submissions").select("id, file_path").eq("assignment_id", assignmentId).eq("student_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("assignment_submissions").update({ content, file_path: filePath ?? existing.file_path, submitted_at: new Date().toISOString() }).eq("id", existing.id)
    : await supabase.from("assignment_submissions").insert({ assignment_id: assignmentId, student_id: user.id, content, file_path: filePath });
  if (error) redirect(withFlash(back, "erreur", humanError(error, "Le devoir n’a pas pu être enregistré (il est peut-être déjà corrigé).")));
  revalidatePath(back);
  redirect(withFlash(back, "ok", "Devoir rendu. Vous serez notifié(e) lorsqu’il sera corrigé."));
}
