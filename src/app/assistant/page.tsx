import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import { Alert, ButtonLink, PageHeader } from "@/components/ui";
import { Chat } from "@/components/Chat";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "DULAA AI — Mon professeur mandinka" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/assistant");
  const supabase = await createClient();
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  const { data: convs } = await supabase.from("ai_conversations").select("id, title, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(20);
  const current = sp.c && (convs ?? []).some((c) => c.id === sp.c) ? sp.c : null;
  const { data: msgs } = current ? await supabase.from("ai_messages").select("role, content, sources").eq("conversation_id", current).order("created_at") : { data: [] };

  return (
    <div className="container-kd py-8">
      <PageHeader eyebrow="Assistant pédagogique" title="DULAA AI — Mon professeur mandinka"
        description="Expliquer un mot, comprendre une leçon, s’entraîner, corriger une phrase…"
        actions={<ButtonLink href="/assistant" variant="outline" size="sm"><MessageSquarePlus className="h-4 w-4" /> Nouvelle conversation</ButtonLink>} />
      {!configured && <Alert tone="warning" className="mb-4">DULAA AI n’est pas encore activé sur cette plateforme (clé du modèle de langage non configurée par l’administrateur).</Alert>}
      <Alert tone="info" className="mb-4">
        DULAA AI peut se tromper. Les réponses marquées « 📘 Documenté » s’appuient sur la base validée et citent leurs sources ; celles marquées « 💡 Suggestion » sont à vérifier auprès d’un enseignant.
      </Alert>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="order-2 lg:order-1">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-400">Mes conversations</h2>
          {(convs ?? []).length === 0 ? <p className="text-sm text-ink-500">Aucune conversation.</p> : (
            <ul className="space-y-1">
              {(convs ?? []).map((c) => (
                <li key={c.id}>
                  <Link href={`/assistant?c=${c.id}`} className={`block rounded-lg px-3 py-2 text-sm ${c.id === current ? "bg-forest-50 font-semibold text-forest-700" : "hover:bg-sand-200"}`}>
                    <span className="line-clamp-1">{c.title}</span>
                    <span className="text-xs text-ink-400">{formatDate(c.updated_at, { dateStyle: "short" })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <div className="order-1 lg:order-2">
          <Chat key={current ?? "new"} conversationId={current} configured={configured}
            initialMessages={(msgs ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content, sources: m.sources as never }))} />
        </div>
      </div>
    </div>
  );
}
