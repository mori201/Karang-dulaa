import Link from "next/link";
import { Activity, BookOpen, BookOpenText, ClipboardList, GraduationCap, Library, UserPlus, Users } from "lucide-react";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Administration" };

export default async function AdminHome() {
  const supabase = await createClient();
  const [{ data: s }, { data: recent }, { data: logs }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.from("profiles").select("id, full_name, first_name, email, created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("audit_logs").select("id, action, entity_type, created_at").order("created_at", { ascending: false }).limit(8),
  ]);
  const st = (s ?? {}) as Record<string, number>;
  return (
    <div className="container-kd py-8">
      <PageHeader title="Tableau de bord administrateur" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Utilisateurs" value={st.users ?? 0} hint={`${st.students ?? 0} apprenants · ${st.teachers ?? 0} enseignants · ${st.admins ?? 0} admins`} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Actifs (7 j)" value={st.active_7d ?? 0} hint={`${st.signups_30d ?? 0} inscriptions sur 30 j`} icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Cours publiés" value={st.courses_published ?? 0} hint={`${st.courses_pending ?? 0} en attente · ${st.courses_draft ?? 0} brouillons`} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label="Inscriptions" value={st.enrollments ?? 0} hint={`${st.lessons_completed ?? 0} leçons terminées`} icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="Dictionnaire" value={st.entries_published ?? 0} hint={`${st.entries_pending ?? 0} entrées à valider`} icon={<BookOpenText className="h-5 w-5" />} />
        <StatCard label="Propositions" value={st.submissions_pending ?? 0} hint="en attente" icon={<UserPlus className="h-5 w-5" />} />
        <StatCard label="Tentatives d’exercices" value={st.attempts ?? 0} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard label="Documents" value={st.documents ?? 0} icon={<Library className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex justify-between"><h2 className="font-bold">Dernières inscriptions</h2><Link href="/admin/utilisateurs" className="link text-sm">Gérer</Link></div>
          <ul className="mt-3 divide-y divide-sand-300 text-sm">{(recent ?? []).map((u) => <li key={u.id} className="flex justify-between py-2"><span>{u.full_name || u.first_name || u.email}</span><span className="text-ink-400">{formatDate(u.created_at, { dateStyle: "short" })}</span></li>)}</ul>
        </Card>
        <Card>
          <div className="flex justify-between"><h2 className="font-bold">Activité récente</h2><Link href="/admin/journal" className="link text-sm">Journal complet</Link></div>
          <ul className="mt-3 divide-y divide-sand-300 text-sm">{(logs ?? []).map((l) => <li key={l.id} className="flex justify-between py-2"><span>{l.action} · {l.entity_type}</span><span className="text-ink-400">{formatDate(l.created_at, { dateStyle: "short", timeStyle: "short" })}</span></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
