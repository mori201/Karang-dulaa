import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type Features = { ai_assistant: boolean; leaderboard: boolean; lexical_submissions: boolean; recordings: boolean };
const DEFAULTS: Features = { ai_assistant: true, leaderboard: true, lexical_submissions: true, recordings: true };

/** Fonctionnalités activées par l'administration (platform_settings.features). */
export const getFeatures = cache(async (): Promise<Features> => {
  if (!isSupabaseConfigured()) return DEFAULTS;
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("value").eq("key", "features").maybeSingle();
  return { ...DEFAULTS, ...((data?.value as Partial<Features>) ?? {}) };
});
