"use client";
import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { SpecialChars } from "@/components/learn/SpecialChars";

export function SearchBox({ defaultValue, lang }: { defaultValue?: string; lang?: string }) {
  const [v, setV] = useState(defaultValue ?? "");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden />
          <input ref={ref} name="q" value={v} onChange={(e) => setV(e.target.value)} placeholder="Mot mandinka ou français…" aria-label="Rechercher dans le dictionnaire"
            className="mnk h-12 w-full rounded-xl border border-sand-400 bg-white pl-10 pr-3 text-lg focus:border-forest focus:outline-none focus:ring-4 focus:ring-forest-100" autoComplete="off" autoCapitalize="off" spellCheck={false} />
        </div>
        <div className="flex gap-2">
        <select name="langue" defaultValue={lang ?? "auto"} className="h-12 flex-1 rounded-xl border border-sand-400 bg-white px-2 text-sm sm:flex-none" aria-label="Langue de recherche">
          <option value="auto">Les deux</option>
          <option value="mnk">Mandinka → FR</option>
          <option value="fr">Français → MNK</option>
        </select>
        <button className="h-12 rounded-xl bg-forest px-5 font-semibold text-white hover:bg-forest-600">Chercher</button>
        </div>
      </div>
      <SpecialChars chars={["ŋ", "ñ"]} onInsert={(c) => { setV((x) => x + c); ref.current?.focus(); }} />
    </div>
  );
}
