import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Bell } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Notifications" };

async function markAllRead() {
  "use server";
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout");
}

async function markRead(formData: FormData) {
  "use server";
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", String(formData.get("id"))).eq("user_id", user.id);
  revalidatePath("/", "layout");
}

const TYPES: Record<string, string> = { badge: "Badge", course: "Cours", enrollment: "Inscription", grade: "Note", review: "Validation", submission: "Dictionnaire", announcement: "Annonce", reply: "Réponse", certificate: "Certificat", role: "Rôle", info: "Info" };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const supabase = await createClient();
  const [{ data: notes }, { data: general }] = await Promise.all([
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("announcements").select("id, title, body, created_at").is("course_id", null).order("created_at", { ascending: false }).limit(5),
  ]);
  const unread = (notes ?? []).filter((n) => !n.read_at).length;
  return (
    <div className="container-kd max-w-3xl py-8">
      <PageHeader title="Centre de notifications" description={unread ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est lu."}
        actions={unread ? <form action={markAllRead}><SubmitButton variant="outline" size="sm" pendingLabel="…">Tout marquer comme lu</SubmitButton></form> : undefined} />
      {(general ?? []).length > 0 && (
        <Card className="mb-6 bg-gold-50">
          <h2 className="font-bold">Annonces de l’école</h2>
          <ul className="mt-2 space-y-3">{(general ?? []).map((a) => <li key={a.id}><p className="font-semibold">{a.title}</p><p className="whitespace-pre-line text-sm text-ink-600">{a.body}</p><p className="text-xs text-ink-400">{formatDate(a.created_at)}</p></li>)}</ul>
        </Card>
      )}
      {(notes ?? []).length === 0 ? <EmptyState icon={<Bell className="h-10 w-10" />} title="Aucune notification." /> : (
        <ul className="space-y-2">
          {(notes ?? []).map((n) => (
            <li key={n.id} className={`rounded-xl border p-4 ${n.read_at ? "border-sand-300 bg-white" : "border-forest-200 bg-forest-50"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><Badge>{TYPES[n.type] ?? n.type}</Badge> <span className="text-xs text-ink-400">{formatDate(n.created_at, { dateStyle: "medium", timeStyle: "short" })}</span></div>
                  <p className="mt-1 font-semibold">{n.link ? <Link href={n.link} className="hover:text-forest">{n.title}</Link> : n.title}</p>
                  {n.body && <p className="text-sm text-ink-600">{n.body}</p>}
                </div>
                {!n.read_at && <form action={markRead}><input type="hidden" name="id" value={n.id} /><SubmitButton variant="ghost" size="sm" pendingLabel="…">Lu</SubmitButton></form>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
