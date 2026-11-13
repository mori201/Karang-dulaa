import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import type { Course } from "@/lib/types";

/** Charge un cours que l'utilisateur peut gérer, sinon refuse l'accès. */
export async function loadManagedCourse(id: string) {
  const user = await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: course }, { data: can }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle<Course>(),
    supabase.rpc("can_manage_course", { cid: id }),
  ]);
  if (!course) notFound();
  if (!can) redirect("/acces-refuse");
  return { user, supabase, course };
}
