import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Client « service_role » : contourne la RLS. À n'utiliser QUE dans des
 * actions serveur qui ont déjà vérifié que l'utilisateur est administrateur
 * (création de comptes enseignants, invitations).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
