import { Field, Input, Select, Textarea } from "@/components/ui";
import { QUESTION_TYPE_LABELS } from "@/lib/utils";
import type { QuestionType } from "@/lib/types";

export const ANSWER_HELP: Record<QuestionType, string> = {
  mcq: "Une ligne par choix. Préfixez la bonne réponse par * (ex. : *vendredi).",
  multi: "Une ligne par choix. Préfixez chaque bonne réponse par *.",
  true_false: "Écrivez « Vrai » ou « Faux » (la bonne réponse).",
  fill_blank: "Réponses acceptées, une par ligne. Utilisez ____ dans l’énoncé pour le trou.",
  translation: "Traductions acceptées, une par ligne.",
  dictation: "Transcriptions acceptées, une par ligne (associez un audio).",
  short_answer: "Réponses acceptées, une par ligne.",
  word_order: "La phrase correcte (les mots seront mélangés pour l’apprenant).",
  matching: "Une paire par ligne : mot mandinka = traduction.",
};

type Q = { id?: string; type: QuestionType; prompt?: string; explanation?: string | null; points?: number; audio_id?: string | null; data?: Record<string, unknown>; answers?: { content: string; is_correct: boolean; match_key: string | null }[] };

export function answersToText(q: Q) {
  const a = q.answers ?? [];
  switch (q.type) {
    case "mcq": case "multi": return a.map((x) => `${x.is_correct ? "*" : ""}${x.content}`).join("\n");
    case "true_false": return a.find((x) => x.is_correct)?.content ?? "Vrai";
    case "matching": return a.map((x) => `${x.content} = ${x.match_key ?? ""}`).join("\n");
    default: return a.filter((x) => x.is_correct).map((x) => x.content).join("\n");
  }
}

export function QuestionFields({ q, audios }: { q: Q; audios: { id: string; title: string }[] }) {
  const tokens = (q.data?.tokens as string[] | undefined) ?? [];
  const correctWords = (q.answers?.[0]?.content ?? "").replace(/[.,!?;:]/g, " ").split(/\s+/).filter(Boolean);
  const distractors = tokens.slice(correctWords.length).join(" ");
  return (
    <div className="space-y-3">
      <input type="hidden" name="type" value={q.type} />
      <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{QUESTION_TYPE_LABELS[q.type]}</p>
      <Field label="Énoncé"><Textarea name="prompt" defaultValue={q.prompt} required className="mnk min-h-16" /></Field>
      <Field label="Réponses" hint={ANSWER_HELP[q.type]}><Textarea name="answers" defaultValue={answersToText(q)} className="mnk min-h-24" required /></Field>
      {q.type === "word_order" && <Field label="Mots pièges (facultatif)" hint="Mots supplémentaires, séparés par des espaces."><Input name="distractors" defaultValue={distractors} className="mnk" /></Field>}
      <Field label="Explication affichée après validation"><Textarea name="explanation" defaultValue={q.explanation ?? ""} className="min-h-16" /></Field>
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Field label="Points"><Input name="points" type="number" min={1} defaultValue={q.points ?? 1} /></Field>
        <Field label="Audio (écoute / dictée)"><Select name="audio_id" defaultValue={q.audio_id ?? ""}><option value="">Aucun</option>{audios.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</Select></Field>
      </div>
      {!["mcq", "multi", "true_false", "matching"].includes(q.type) && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ignore_tones" defaultChecked={(q.data?.ignore_tones as boolean | undefined) ?? true} className="accent-forest" /> Accepter les réponses sans accents tonals ni ŋ/ñ (recommandé pour les débutants)</label>
      )}
    </div>
  );
}
