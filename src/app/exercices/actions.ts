"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { humanError } from "@/lib/flash";
import type { AttemptResult } from "@/lib/types";

export async function submitAttempt(exerciseId: string, responses: Record<string, unknown>): Promise<{ ok: true; result: AttemptResult } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Votre session a expiré : reconnectez-vous." };
  const { data, error } = await supabase.rpc("submit_quiz_attempt", { p_exercise: exerciseId, p_responses: responses });
  if (error) return { ok: false, error: humanError(error, "La correction n’a pas pu être enregistrée.") };
  revalidatePath(`/exercices/${exerciseId}`);
  revalidatePath("/tableau-de-bord");
  return { ok: true, result: data as AttemptResult };
}
