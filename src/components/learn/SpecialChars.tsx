"use client";

const CHARS = ["ŋ", "ñ", "á", "à", "â", "ǎ", "é", "è", "í", "ì", "ó", "ò", "ú", "ù"];

/** Clavier des caractères mandinka (ŋ, ñ, voyelles tonales). */
export function SpecialChars({ onInsert, chars = CHARS }: { onInsert: (c: string) => void; chars?: string[] }) {
  return (
    <div className="flex flex-wrap gap-1" aria-label="Caractères spéciaux">
      {chars.map((c) => (
        <button key={c} type="button" onClick={() => onInsert(c)} className="mnk h-8 min-w-8 rounded-md border border-sand-400 bg-white px-2 text-base hover:bg-forest-50" aria-label={`Insérer ${c}`}>
          {c}
        </button>
      ))}
    </div>
  );
}
