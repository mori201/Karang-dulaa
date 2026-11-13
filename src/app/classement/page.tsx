import Link from "next/link";
import { Trophy } from "lucide-react";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Classement" };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/classement");
  const days = sp.periode === "mois" ? 30 : 7;
  const supabase = await createClient();
  const { data } = await supabase.rpc("leaderboard", { p_days: days });
  const rows = (data ?? []) as { user_id: string; display_name: string; xp: number; streak: number }[];
  return (
    <div className="container-kd max-w-2xl py-8">
      <PageHeader title="Classement" description="Un classement amical, uniquement entre les apprenants qui ont choisi d’y participer."
        actions={<div className="flex gap-1 rounded-lg bg-sand-300 p-1 text-sm">
          <Link href="/classement" className={`rounded-md px-3 py-1 ${days === 7 ? "bg-white font-semibold" : ""}`}>7 jours</Link>
          <Link href="/classement?periode=mois" className={`rounded-md px-3 py-1 ${days === 30 ? "bg-white font-semibold" : ""}`}>30 jours</Link>
        </div>} />
      {!user.profile.show_in_leaderboard && <Alert tone="info" className="mb-4">Vous n’apparaissez pas dans le classement. <Link href="/profil" className="link">Activer dans mon profil</Link></Alert>}
      {rows.length === 0 ? <EmptyState icon={<Trophy className="h-10 w-10" />} title="Personne n’apparaît encore dans le classement." /> : (
        <Card className="p-0">
          <ol className="divide-y divide-sand-300">
            {rows.map((r, i) => (
              <li key={r.user_id} className={`flex items-center gap-4 px-5 py-3 ${r.user_id === user.id ? "bg-forest-50" : ""}`}>
                <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold ${i < 3 ? "bg-gold text-ink" : "bg-sand-300"}`}>{i + 1}</span>
                <span className="flex-1 font-semibold">{r.display_name}{r.user_id === user.id && " (vous)"}</span>
                <span className="text-sm text-ink-500">🔥 {r.streak} j</span>
                <span className="w-20 text-right font-bold text-forest">{r.xp} XP</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
