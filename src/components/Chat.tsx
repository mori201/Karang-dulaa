"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookMarked, Bot, Send, User } from "lucide-react";
import { Alert, Button } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { SpecialChars } from "@/components/learn/SpecialChars";

type Source = { n: number; kind: string; id: string; title: string; source: string };
type Msg = { role: "user" | "assistant"; content: string; sources?: Source[] };

const SUGGESTIONS = [
  "Que signifie « àbáríká » ?",
  "Comment dit-on « vendredi » en mandinka ?",
  "Explique-moi la forme déterminée des noms",
  "Propose-moi un petit exercice sur les jours",
];

export function Chat({ initialMessages, conversationId: initialId, configured }: { initialMessages: Msg[]; conversationId: string | null; configured: boolean }) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [conversationId, setConversationId] = useState(initialId);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setBusy(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId, message }) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({ error: "Erreur inattendue." }));
        throw new Error(j.error);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l);
          if (ev.type === "meta") {
            setConversationId(ev.conversationId);
            setMessages((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], sources: ev.sources }; return c; });
            if (!conversationId) window.history.replaceState(null, "", `/assistant?c=${ev.conversationId}`);
          } else if (ev.type === "text") {
            setMessages((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + ev.text }; return c; });
          } else if (ev.type === "error") throw new Error(ev.error);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
      setMessages((m) => (m[m.length - 1]?.content ? m : m.slice(0, -1)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col rounded-2xl border border-sand-300 bg-white">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="py-6 text-center">
            <Bot className="mx-auto h-10 w-10 text-forest" />
            <p className="mt-2 font-semibold">Bonjour ! Je suis DULAA AI.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">Je m’appuie d’abord sur la base documentaire validée de KARANG-DULAA et je signale ce qui n’est qu’une suggestion.</p>
            {configured && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-sand-400 bg-sand-100 px-3 py-1.5 text-sm hover:border-forest">{s}</button>)}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === "user" ? "bg-gold text-ink" : "bg-forest text-white"}`}>
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </span>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] ${m.role === "user" ? "bg-gold-50" : "bg-sand-100"}`}>
              {m.content ? <Markdown text={m.content} /> : <span className="animate-pulse text-ink-400">DULAA AI réfléchit…</span>}
              {m.role === "assistant" && m.sources && m.sources.length > 0 && m.content && (
                <details className="mt-3 border-t border-sand-300 pt-2 text-xs text-ink-500">
                  <summary className="flex cursor-pointer items-center gap-1 font-semibold"><BookMarked className="h-3.5 w-3.5" /> Extraits consultés ({m.sources.length})</summary>
                  <ul className="mt-1 space-y-1">
                    {m.sources.map((s) => (
                      <li key={s.n}>[S{s.n}] {s.kind === "dictionnaire" ? <Link className="link mnk" href={`/dictionnaire/${s.id}`}>{s.title}</Link> : <span>{s.title}</span>} — {s.source}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <Alert tone="error" className="mx-4 mb-2">{error}</Alert>}
      <form className="border-t border-sand-300 p-3" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        <div className="flex gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} disabled={!configured || busy} rows={2} maxLength={4000}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
            placeholder={configured ? "Posez votre question sur le mandinka…" : "Assistant non configuré"} aria-label="Votre message"
            className="mnk flex-1 resize-none rounded-xl border border-sand-400 px-3 py-2 focus:border-forest focus:outline-none focus:ring-4 focus:ring-forest-100" />
          <Button type="submit" disabled={!configured || busy || !input.trim()} className="h-auto" aria-label="Envoyer"><Send className="h-5 w-5" /></Button>
        </div>
        <div className="mt-2"><SpecialChars chars={["ŋ", "ñ", "á", "à", "â", "ǎ"]} onInsert={(c) => setInput((x) => x + c)} /></div>
      </form>
    </div>
  );
}
