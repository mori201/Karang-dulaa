import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { moderateTestimonialAction } from "../actions";

export const metadata = { title: "Témoignages" };

export default async function TestimonialsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("testimonials").select("*").order("approved").order("created_at", { ascending: false });
  return (
    <div className="container-kd max-w-3xl py-8">
      <PageHeader title="Témoignages" description="Seuls les témoignages approuvés apparaissent sur la page d’accueil." />
      <Flash searchParams={sp} />
      {(data ?? []).length === 0 ? <EmptyState title="Aucun témoignage." /> : (
        <div className="space-y-3">{(data ?? []).map((t) => (
          <Card key={t.id}>
            <div className="flex items-center gap-2"><span className="font-bold">{t.author_name}</span>{t.author_context && <span className="text-sm text-ink-500">{t.author_context}</span>}<Badge tone={t.approved ? "green" : "gold"}>{t.approved ? "Publié" : "En attente"}</Badge><span className="ml-auto text-xs text-ink-400">{formatDate(t.created_at)}</span></div>
            <p className="mt-2 text-ink-600">« {t.content} »</p>
            <div className="mt-3 flex gap-2">
              {(["approve", "unapprove", "delete"] as const).filter((op) => (op === "approve" ? !t.approved : op === "unapprove" ? t.approved : true)).map((op) => (
                <form key={op} action={moderateTestimonialAction}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="op" value={op} />
                  <SubmitButton size="sm" variant={op === "approve" ? "primary" : "ghost"} confirm={op === "delete" ? "Supprimer ce témoignage ?" : undefined} pendingLabel="…">{op === "approve" ? "Publier" : op === "unapprove" ? "Retirer" : "Supprimer"}</SubmitButton></form>
              ))}
            </div>
          </Card>
        ))}</div>
      )}
    </div>
  );
}
