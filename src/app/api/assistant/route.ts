import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getFeatures } from "@/lib/settings";
import { SYSTEM_PROMPT, buildContext, extractTerms, type KnowledgeItem } from "@/lib/ai/prompt";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(4000),
});

const HOURLY_LIMIT = 40;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "DULAA AI n’est pas encore configuré sur cette plateforme." }, { status: 503 });

  if (!(await getFeatures()).ai_assistant) return Response.json({ error: "DULAA AI est désactivé par l’administration." }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Connexion requise." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Message invalide." }, { status: 400 });
  const { message } = parsed.data;

  // Limitation d'usage
  const { data: convs } = await supabase.from("ai_conversations").select("id").eq("user_id", user.id);
  const convIds = (convs ?? []).map((c) => c.id);
  if (convIds.length) {
    const { count } = await supabase.from("ai_messages").select("id", { count: "exact", head: true })
      .in("conversation_id", convIds).eq("role", "user").gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= HOURLY_LIMIT) return Response.json({ error: "Limite atteinte : réessayez dans une heure." }, { status: 429 });
  }

  // Conversation
  let conversationId = parsed.data.conversationId ?? null;
  if (conversationId && !convIds.includes(conversationId)) conversationId = null;
  if (!conversationId) {
    const { data: conv, error } = await supabase.from("ai_conversations").insert({ user_id: user.id, title: message.slice(0, 80) }).select("id").single();
    if (error || !conv) return Response.json({ error: "Impossible de créer la conversation." }, { status: 500 });
    conversationId = conv.id;
  }
  const { data: history } = await supabase.from("ai_messages").select("role, content").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(12);
  await supabase.from("ai_messages").insert({ conversation_id: conversationId, role: "user", content: message });

  // Recherche documentaire (RLS de l'utilisateur)
  const terms = extractTerms(message);
  let items: KnowledgeItem[] = [];
  if (terms.length) {
    const { data } = await supabase.rpc("search_knowledge", { p_terms: terms, p_limit: 12 });
    items = (data ?? []) as KnowledgeItem[];
  }
  const sources = items.map((it, i) => ({ n: i + 1, kind: it.kind, id: it.ref_id, title: it.title, source: it.source }));

  const past = (history ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const client = new Anthropic({ apiKey });
  const model = process.env.DULAA_AI_MODEL || "claude-opus-5-5";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      send({ type: "meta", conversationId, sources });
      let full = "";
      try {
        const s = client.beta.messages.stream({
          model,
          max_tokens: 4000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium" },
          system: SYSTEM_PROMPT,
          messages: [
            ...past,
            { role: "user", content: `${buildContext(items)}\n\nQuestion de l'apprenant :\n${message}` },
          ],
        });
        for await (const event of s) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            full += event.delta.text;
            send({ type: "text", text: event.delta.text });
          }
        }
        const final = await s.finalMessage();
        if (final.stop_reason === "refusal") {
          const note = "\n\nJe ne peux pas répondre à cette demande. Reformulez votre question sur la langue mandinka.";
          full += note;
          send({ type: "text", text: note });
        }
        await supabase.from("ai_messages").insert({ conversation_id: conversationId, role: "assistant", content: full || "(réponse vide)", sources });
        await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
        send({ type: "done" });
      } catch (err) {
        const status = err instanceof Anthropic.APIError ? err.status : undefined;
        const msg = status === 429 ? "Le service est très sollicité. Réessayez dans un instant."
          : status === 401 ? "La clé d’accès au modèle de langage est invalide."
          : "DULAA AI n’a pas pu répondre. Réessayez.";
        send({ type: "error", error: msg });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
