import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { AppRole, Profile } from "@/lib/types";

export type SessionUser = {
  id: string;
  email: string | null;
  profile: Profile;
  roles: AppRole[];
  isAdmin: boolean;
  isTeacher: boolean;
  isStaff: boolean;
};

/** Utilisateur courant (null si non connecté). Mis en cache par requête. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("users_roles").select("role").eq("user_id", user.id),
  ]);
  if (!profile) return null;
  const r = ((roles ?? []) as { role: AppRole }[]).map((x) => x.role);
  const active = profile.is_active !== false;
  return {
    id: user.id,
    email: user.email ?? null,
    profile: profile as Profile,
    roles: r,
    isAdmin: active && r.includes("admin"),
    isTeacher: active && r.includes("teacher"),
    isStaff: active && (r.includes("admin") || r.includes("teacher")),
  };
});

export async function requireUser(next?: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/connexion${next ? `?suivant=${encodeURIComponent(next)}` : ""}`);
  if (user.profile.is_active === false) redirect("/compte-suspendu");
  return user;
}

export async function requireStaff() {
  const user = await requireUser();
  if (!user.isStaff) redirect("/acces-refuse");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/acces-refuse");
  return user;
}
