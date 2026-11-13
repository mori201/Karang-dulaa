import { fold } from "@/lib/utils";

export const ALPHABET = ["a", "b", "c", "d", "e", "f", "h", "i", "j", "k", "l", "ŋ", "m", "n", "ñ", "o", "p", "r", "s", "t", "u", "w", "y"];

/** Nettoie une saisie pour un filtre PostgREST (pas de virgule, parenthèse, %…). */
export function cleanQuery(q: string) {
  return fold(q).replace(/[^a-z0-9 \-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Classement : correspondance exacte > début de mot > contient. */
export function rankEntries<T extends { headword: string; translation_fr: string; variants: string[] }>(rows: T[], q: string, lang: string) {
  const f = cleanQuery(q);
  const score = (r: T) => {
    const hw = [r.headword, ...r.variants].map(fold);
    const tr = fold(r.translation_fr).split(/[;,]/).map((s) => s.trim());
    let s = 0;
    if (lang !== "fr") {
      if (hw.some((h) => h === f)) s = Math.max(s, 100);
      else if (hw.some((h) => h.startsWith(f))) s = Math.max(s, 70);
      else if (hw.some((h) => h.includes(f))) s = Math.max(s, 40);
    }
    if (lang !== "mnk") {
      if (tr.some((t) => t === f)) s = Math.max(s, 95);
      else if (tr.some((t) => t.startsWith(f) || t.split(" ").includes(f))) s = Math.max(s, 65);
      else if (fold(r.translation_fr).includes(f)) s = Math.max(s, 35);
    }
    return s;
  };
  return rows.map((r) => ({ r, s: score(r) })).sort((a, b) => b.s - a.s || fold(a.r.headword).localeCompare(fold(b.r.headword))).map((x) => x.r);
}
