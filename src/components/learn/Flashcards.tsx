"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, Repeat2 } from "lucide-react";
import { Button, ProgressBar } from "@/components/ui";
import { reviewCard } from "@/app/cartes/actions";

export type Card = { id: string; headword: string; translation_fr: string; example?: { mandinka: string; french: string | null } | null; source?: string | null };

export function Flashcards({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [stats, setStats] = useState({ good: 0, again: 0 });
  const [, start] = useTransition();
  const card = cards[i];

  if (!card) {
    return (
      <div className="rounded-3xl bg-forest p-8 text-center text-white">
        <p className="text-2xl font-extrabold">Session terminée !</p>
        <p className="mt-2 text-forest-100">{stats.good} carte(s) retenue(s), {stats.again} à revoir. Les cartes reviendront au bon moment grâce à la répétition espacée.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="gold" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /> Nouvelle session</Button>
          <Link href="/tableau-de-bord" className="inline-flex h-10 items-center rounded-lg border border-white/30 px-4 font-semibold">Tableau de bord</Link>
        </div>
      </div>
    );
  }

  const grade = (q: number) => {
    start(async () => { await reviewCard(card.id, q); });
    setStats((s) => (q >= 3 ? { ...s, good: s.good + 1 } : { ...s, again: s.again + 1 }));
    setFlipped(false);
    setI((x) => x + 1);
  };
  const front = reverse ? card.translation_fr : card.headword;
  const back = reverse ? card.headword : card.translation_fr;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-ink-500">
        <span>Carte {i + 1} / {cards.length}</span>
        <button type="button" onClick={() => { setReverse((r) => !r); setFlipped(false); }} className="inline-flex items-center gap-1 font-semibold text-forest">
          <Repeat2 className="h-4 w-4" /> {reverse ? "Français → mandinka" : "Mandinka → français"}
        </button>
      </div>
      <ProgressBar value={(i / cards.length) * 100} className="mb-4" />
      <button type="button" onClick={() => setFlipped((f) => !f)} aria-live="polite"
        className="flex min-h-64 w-full flex-col items-center justify-center rounded-3xl border border-sand-300 bg-white p-8 text-center shadow-sm transition hover:shadow-md">
        <span className={`${reverse ? "" : "mnk"} text-3xl font-extrabold text-forest`}>{front}</span>
        {flipped ? (
          <span className="mt-6 border-t border-sand-300 pt-6">
            <span className={`${reverse ? "mnk" : ""} block text-2xl font-semibold`}>{back}</span>
            {card.example && <span className="mt-3 block text-sm text-ink-500"><span className="mnk font-semibold">{card.example.mandinka}</span>{card.example.french && ` — « ${card.example.french} »`}</span>}
            {card.source && <span className="mt-2 block text-xs text-ink-400">{card.source}</span>}
          </span>
        ) : <span className="mt-6 text-sm text-ink-400">Touchez pour voir la réponse</span>}
      </button>
      {flipped && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button variant="danger" onClick={() => grade(0)}>Oublié</Button>
          <Button variant="outline" onClick={() => grade(3)}>Difficile</Button>
          <Button variant="secondary" onClick={() => grade(4)}>Bien</Button>
          <Button onClick={() => grade(5)}>Facile</Button>
        </div>
      )}
    </div>
  );
}
