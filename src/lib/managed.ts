import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth";

/** Cours gérés par l'utilisateur (tous pour un admin). */
export async function managedCourses(user: SessionUser) {
  const supabase = await createClient();
  let q = supabase.from("courses").select("id, title, slug").order("title");
  if (!user.isAdmin) {
    const { data: co } = await supabase.from("course_teachers").select("course_id").eq("teacher_id", user.id);
    const ids = (co ?? []).map((c) => c.course_id);
    q = q.or([`teacher_id.eq.${user.id}`, `created_by.eq.${user.id}`, ...(ids.length ? [`id.in.(${ids.join(",")})`] : [])].join(","));
  }
  return (await q).data ?? [];
}
