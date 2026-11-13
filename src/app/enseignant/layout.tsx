import { SpaceNav } from "@/components/layout/SpaceNav";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  const supabase = await createClient();
  const { count } = await supabase.from("lexical_submissions").select("id", { count: "exact", head: true }).eq("status", "pending");
  return (
    <>
      <SpaceNav title="Espace enseignant" items={[
        { href: "/enseignant", label: "Tableau de bord" },
        { href: "/enseignant/cours/nouveau", label: "Nouveau cours" },
        { href: "/enseignant/questions", label: "Questions" },
        { href: "/enseignant/annonces", label: "Annonces" },
        { href: "/enseignant/audio", label: "Audio" },
        { href: "/enseignant/bibliotheque", label: "Bibliothèque" },
        { href: "/enseignant/propositions", label: "Propositions de mots", badge: count ?? 0 },
      ]} />
      {children}
    </>
  );
}
