"use server";
import { createClient } from "@/lib/supabase/server";

export async function reviewCard(entryId: string, quality: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_flashcard", { p_entry: entryId, p_quality: quality });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data as { interval_days: number } };
}
