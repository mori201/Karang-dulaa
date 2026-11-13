import { SpaceNav } from "@/components/layout/SpaceNav";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const supabase = await createClient();
  const [{ count: pendingCourses }, { count: pendingSubs }, { count: pendingTesti }] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("lexical_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("testimonials").select("id", { count: "exact", head: true }).eq("approved", false),
  ]);
  return (
    <>
      <SpaceNav title="Administration" items={[
        { href: "/admin", label: "Statistiques" },
        { href: "/admin/utilisateurs", label: "Utilisateurs" },
        { href: "/admin/cours", label: "Cours", badge: pendingCourses ?? 0 },
        { href: "/admin/dictionnaire", label: "Dictionnaire" },
        { href: "/enseignant/propositions", label: "Propositions", badge: pendingSubs ?? 0 },
        { href: "/admin/import", label: "Import documentaire" },
        { href: "/admin/sources", label: "Sources" },
        { href: "/admin/categories", label: "Catégories" },
        { href: "/enseignant/bibliotheque", label: "Documents" },
        { href: "/enseignant/annonces", label: "Notifications" },
        { href: "/admin/temoignages", label: "Témoignages", badge: pendingTesti ?? 0 },
        { href: "/admin/parametres", label: "Paramètres" },
        { href: "/admin/journal", label: "Journal" },
      ]} />
      {children}
    </>
  );
}
