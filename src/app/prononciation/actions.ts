"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function setRecordingConsent(consent: boolean) {
  const user = await requireUser("/prononciation");
  const supabase = await createClient();
  await supabase.from("profiles").update({ recording_consent: consent }).eq("id", user.id);
  revalidatePath("/prononciation");
}

export async function saveRecording(formData: FormData) {
  const user = await requireUser("/prononciation");
  if (!user.profile.recording_consent) return { ok: false, error: "Consentement requis pour conserver vos enregistrements." };
  const file = formData.get("audio") as File | null;
  const audioId = String(formData.get("audio_id") ?? "") || null;
  if (!file || file.size === 0 || file.size > 5 * 1024 * 1024) return { ok: false, error: "Enregistrement invalide (5 Mo maximum)." };
  const type = file.type.split(";")[0];
  if (!["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"].includes(type)) return { ok: false, error: "Format audio non pris en charge." };
  const ext = type === "audio/mp4" ? "m4a" : type.split("/")[1];
  const path = `${user.id}/${Date.now()}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from("recordings").upload(path, file, { contentType: type });
  if (error) return { ok: false, error: "Échec de l’enregistrement." };
  await supabase.from("pronunciation_recordings").insert({ user_id: user.id, audio_id: audioId, storage_path: path });
  revalidatePath("/prononciation");
  return { ok: true };
}

export async function deleteRecording(id: string) {
  const user = await requireUser("/prononciation");
  const supabase = await createClient();
  const { data } = await supabase.from("pronunciation_recordings").select("storage_path").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (data) {
    await supabase.storage.from("recordings").remove([data.storage_path]);
    await supabase.from("pronunciation_recordings").delete().eq("id", id);
  }
  revalidatePath("/prononciation");
}
