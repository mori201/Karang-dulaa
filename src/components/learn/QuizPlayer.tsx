"use client";
import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, CheckCircle2, RotateCcw, X, XCircle } from "lucide-react";
import { Alert, Badge, Button, Input } from "@/components/ui";
import { AudioPlayer } from "@/components/learn/AudioPlayer";
import { SpecialChars } from "@/components/learn/SpecialChars";
import { submitAttempt } from "@/app/exercices/actions";
import type { AttemptResult, StudentExercise } from "@/lib/types";
import { QUESTION_TYPE_LABELS, cn } from "@/lib/utils";

type Q = StudentExercise["questions"][number];
type Answers = Record<string, unknown>;

function isAnswered(q: Q, v: unknown) {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (q.type === "matching") return Object.keys(v as object).length === q.options.length;
  return true;
}

function renderExpected(expected: unknown) {
  if (!Array.isArray(expected)) return null;
  if (expected.length && typeof expected[0] === "object") {
    return (expected as { item: string; match: string }[]).map((e) => `${e.item} → ${e.match}`).join(" ; ");
  }
  return (expected as string[]).join(" / ");
}

export function QuizPlayer({ exercise, audioUrls }: { exercise: StudentExercise; audioUrls: Record<string, string> }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [orderState, setOrderState] = useState<Record<string, string[]>>({});
  const set = (id: string, v: unknown) => setAnswers((a) => ({ ...a, [id]: v }));
  const answeredCount = exercise.questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const resultById = useMemo(() => new Map((result?.results ?? []).map((r) => [r.question_id, r])), [result]);
  const attemptsLeft = exercise.max_attempts ? exercise.max_attempts - exercise.attempts_used - (result ? 1 : 0) : null;

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await submitAttempt(exercise.id, answers);
      if (res.ok) {
        setResult(res.result);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else setError(res.error);
    });
  };
  const restart = () => {
    setAnswers({});
    setOrderState({});
    setResult(null);
  };

  return (
    <div className="space-y-5">
      {result && (
        <div className={cn("rounded-2xl p-5 text-center", result.passed ? "bg-forest text-white" : "bg-gold-50 text-ink")}>
          <div className="text-4xl font-extrabold">{Math.round(result.score)} %</div>
          <div className="mt-1 font-semibold">{result.points} / {result.max_points} point{result.max_points > 1 ? "s" : ""}</div>
          <p className="mt-2">
            {result.passed ? (result.first_pass ? "Réussi ! Points d’expérience gagnés." : "Réussi !") : `Score requis : ${result.pass_score} %. Relisez les corrections et réessayez.`}
          </p>
          {(attemptsLeft === null || attemptsLeft > 0) && (
            <Button variant={result.passed ? "gold" : "primary"} className="mt-4" onClick={restart}><RotateCcw className="h-4 w-4" /> Recommencer</Button>
          )}
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      {exercise.questions.map((q, i) => {
        const r = resultById.get(q.id);
        const v = answers[q.id];
        const locked = !!result;
        return (
          <fieldset key={q.id} className={cn("rounded-2xl border bg-white p-5", r ? (r.correct ? "border-forest-300" : "border-red-300") : "border-sand-300")}>
            <legend className="sr-only">Question {i + 1}</legend>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-400">Question {i + 1} · {QUESTION_TYPE_LABELS[q.type]}</span>
              <span className="text-xs text-ink-400">{q.points} pt{q.points > 1 ? "s" : ""}</span>
            </div>
            <p className="mnk mt-2 text-lg font-semibold">{q.prompt}</p>
            {q.audio_id && audioUrls[q.audio_id] && <div className="mt-3"><AudioPlayer src={audioUrls[q.audio_id]} compact /></div>}

            <div className="mt-4">
              {(q.type === "mcq" || q.type === "true_false") && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((o) => (
                    <label key={o.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3", v === o.id ? "border-forest bg-forest-50" : "border-sand-300 hover:bg-sand-100", locked && "cursor-default")}>
                      <input type="radio" name={q.id} className="accent-forest" checked={v === o.id} disabled={locked} onChange={() => set(q.id, o.id)} />
                      <span className="mnk">{o.content}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "multi" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((o) => {
                    const arr = (v as string[] | undefined) ?? [];
                    const checked = arr.includes(o.id);
                    return (
                      <label key={o.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3", checked ? "border-forest bg-forest-50" : "border-sand-300 hover:bg-sand-100")}>
                        <input type="checkbox" className="accent-forest" checked={checked} disabled={locked}
                          onChange={() => set(q.id, checked ? arr.filter((x) => x !== o.id) : [...arr, o.id])} />
                        <span className="mnk">{o.content}</span>
                      </label>
                    );
                  })}
                  <p className="text-xs text-ink-400 sm:col-span-2">Plusieurs réponses possibles.</p>
                </div>
              )}

              {["fill_blank", "translation", "dictation", "short_answer"].includes(q.type) && (
                <div className="space-y-2">
                  <Input value={(v as string) ?? ""} disabled={locked} onChange={(e) => set(q.id, e.target.value)} placeholder="Votre réponse" className="mnk text-lg" aria-label="Votre réponse" lang="mnk" autoComplete="off" autoCapitalize="off" spellCheck={false} />
                  {!locked && <SpecialChars onInsert={(c) => set(q.id, `${(v as string) ?? ""}${c}`)} />}
                </div>
              )}

              {q.type === "word_order" && (() => {
                const chosen = orderState[q.id] ?? [];
                const remaining = [...q.tokens];
                chosen.forEach((c) => { const k = remaining.indexOf(c); if (k >= 0) remaining.splice(k, 1); });
                const update = (next: string[]) => { setOrderState((s) => ({ ...s, [q.id]: next })); set(q.id, next); };
                return (
                  <div className="space-y-3">
                    <div className="flex min-h-14 flex-wrap gap-2 rounded-xl border-2 border-dashed border-sand-400 p-2" aria-label="Votre phrase">
                      {chosen.length === 0 && <span className="self-center px-2 text-sm text-ink-400">Touchez les mots dans l’ordre…</span>}
                      {chosen.map((t, k) => (
                        <span key={k} className="mnk inline-flex items-center gap-1 rounded-lg bg-forest px-3 py-1.5 font-semibold text-white">
                          {t}
                          {!locked && (
                            <>
                              {k > 0 && <button type="button" aria-label="Déplacer à gauche" onClick={() => { const n = [...chosen]; [n[k - 1], n[k]] = [n[k], n[k - 1]]; update(n); }}><ArrowUp className="h-3.5 w-3.5 -rotate-90" /></button>}
                              {k < chosen.length - 1 && <button type="button" aria-label="Déplacer à droite" onClick={() => { const n = [...chosen]; [n[k + 1], n[k]] = [n[k], n[k + 1]]; update(n); }}><ArrowDown className="h-3.5 w-3.5 -rotate-90" /></button>}
                              <button type="button" aria-label={`Retirer ${t}`} onClick={() => update(chosen.filter((_, j) => j !== k))}><X className="h-3.5 w-3.5" /></button>
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                    {!locked && (
                      <div className="flex flex-wrap gap-2">
                        {remaining.map((t, k) => (
                          <button key={`${t}-${k}`} type="button" onClick={() => update([...chosen, t])} className="mnk rounded-lg border border-sand-400 bg-sand-100 px-3 py-1.5 font-semibold hover:bg-sand-200">{t}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {q.type === "matching" && (
                <div className="space-y-2">
                  {q.options.map((o) => {
                    const m = (v as Record<string, string> | undefined) ?? {};
                    return (
                      <div key={o.id} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr]">
                        <span className="mnk rounded-lg bg-sand-100 px-3 py-2 font-semibold">{o.content}</span>
                        <select className="h-10 rounded-lg border border-sand-400 bg-white px-3" value={m[o.id] ?? ""} disabled={locked}
                          onChange={(e) => set(q.id, { ...m, [o.id]: e.target.value })} aria-label={`Traduction de ${o.content}`}>
                          <option value="">— Choisir —</option>
                          {q.match_choices.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {r && (
              <div className={cn("mt-4 rounded-xl px-4 py-3 text-sm", r.correct ? "bg-forest-50 text-forest-800" : "bg-red-50 text-red-800")}>
                <div className="flex items-center gap-2 font-bold">
                  {r.correct ? <><CheckCircle2 className="h-4 w-4" /> Bonne réponse</> : <><XCircle className="h-4 w-4" /> Réponse incorrecte</>}
                </div>
                {!r.correct && renderExpected(r.expected) && <p className="mt-1">Réponse attendue : <span className="mnk font-semibold">{renderExpected(r.expected)}</span></p>}
                {r.explanation && <p className="mt-1 text-ink-600">{r.explanation}</p>}
              </div>
            )}
          </fieldset>
        );
      })}

      {!result && (
        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border border-sand-300 bg-white/95 p-3 shadow-lg backdrop-blur">
          <Badge>{answeredCount}/{exercise.questions.length} répondue{answeredCount > 1 ? "s" : ""}</Badge>
          <Button size="lg" onClick={submit} disabled={pending || answeredCount === 0}>
            <Check className="h-4 w-4" /> {pending ? "Correction…" : "Valider mes réponses"}
          </Button>
        </div>
      )}
    </div>
  );
}
