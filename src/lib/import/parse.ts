/**
 * Structuration assistée de documents lexicographiques.
 *
 * Principe : proposer, jamais décider. Les éléments extraits sont des
 * CANDIDATS présentés à un humain pour vérification ; le texte source
 * (raw_text) est toujours conservé tel quel, en Unicode NFC, sans
 * modification des caractères mandinka (ŋ, ñ, voyelles longues, tons).
 *
 * Module pur (sans dépendance Next/Supabase) pour être testable.
 */

export type ImportCandidate = {
  page: string | null;
  raw_text: string;
  headword: string | null;
  translation_fr: string | null;
  part_of_speech: string | null;
  examples: { mandinka: string; french: string }[];
  confidence: number;
};

export type Section = { title: string; page: string | null };

const STRONG_MNK = /[áàâǎíìîǐóòôǒúùûǔḿńňŋñɲɛɔ]/i; // marques propres au mandinka (hors é/è/ê, aussi français)
const TONE_OR_SPECIAL = /[áàâǎéèêěíìîǐóòôǒúùûǔḿńňŋñɲɛɔ]/i;
// mots-outils présents dans les deux langues (a, la, le, ka, ye…) : neutres
const AMBIGUOUS = new Set("a i la le ma ne se si ta to ye ka ko be bi mu ti fo de".split(" "));
const FR_WORDS = new Set(
  ("l un une des du et ou à au aux en dans pour par sur avec sans sous chez est sont était ont été être avoir " +
    "il elle ils elles on je tu nous vous me te lui leur leurs ce cet cette ces son sa ses mon mes ton tes notre votre " +
    "qui que quoi dont où pas plus jamais rien très bien tout tous toute toutes comme mais donc car quand qq qc qq’un " +
    "fait faire dit dire peut doit va aller c’est n’est qu’il qu’elle les " +
    // mots français à accent circonflexe ou grave, fréquents dans les gloses
    "tôt être même très côté âge âne fête tête bête baptême fenêtre forêt goût coût août île maître naître connaître " +
    "paraître dîner sûr mûr dû là déjà après près où voilà frère mère père pièce chèvre lèvre fièvre système problème")
    .split(" "),
);

const norm = (s: string) => s.normalize("NFC").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");
const bare = (t: string) => t.toLowerCase().replace(/[.,;!?()«»"=]/g, "");

function isFrenchToken(t: string) {
  const w = bare(t);
  if (!w || AMBIGUOUS.has(w)) return false;
  if (FR_WORDS.has(w)) return true;
  if (/^[ldjmnstcq][’']\p{L}/u.test(w)) return true; // l’enfant, qu’il, n’a…
  if (!STRONG_MNK.test(w) && /(tion|ment|eux|euse|ait|aient|ant|ée|ées|és|er|ez|ire|re|que|ge)$/.test(w) && w.length > 3) return true;
  if (!STRONG_MNK.test(w) && /é$/.test(w) && w.length >= 6) return true; // participes : accouché, désolé…
  if (/è[a-zç]{1,3}e$/.test(w) && !/[áàǎíìǐóòǒúùǔŋñ]/.test(w)) return true; // pièce, frère, chèvre…
  return false;
}

function isMandinkaToken(t: string) {
  const w = bare(t);
  if (!w || isFrenchToken(w)) return false;
  return TONE_OR_SPECIAL.test(w);
}

function frScore(t: string) {
  const w = bare(t);
  if (!w) return 0;
  if (isFrenchToken(w)) return 2;
  if (STRONG_MNK.test(w)) return -3;
  if (TONE_OR_SPECIAL.test(w)) return -1; // é/è seuls : plutôt mandinka si pas de morphologie française
  return AMBIGUOUS.has(w) ? 0.3 : 0.6;
}
function mnkScore(t: string) {
  const w = bare(t);
  if (!w) return 0;
  if (STRONG_MNK.test(w) && !isFrenchToken(w)) return 2;
  if (isFrenchToken(w)) return -3;
  if (TONE_OR_SPECIAL.test(w)) return 1;
  return AMBIGUOUS.has(w) ? 0.4 : 0.2;
}

/** Une forme de citation de dictionnaire : tous les mots portent une notation tonale (convention Creissels). */
function looksLikeHeadword(s: string) {
  const parts = s.split(/,\s*/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length || parts.length > 8) return false;
  return parts.every((p) => {
    const toks = p.split(/\s+/).filter((x) => x && x !== "-");
    return toks.length > 0 && toks.length <= 4 && toks.every((tk) => TONE_OR_SPECIAL.test(tk) || /^[(\-]/.test(tk) || tk === "=");
  });
}

/**
 * Coupe un segment « …glose française | début mandinka » au point qui
 * maximise la vraisemblance (mots français à gauche, mandinka à droite).
 */
function splitTail(piece: string): { head: string; tail: string } {
  const toks = piece.trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return { head: "", tail: "" };
  let best = toks.length;
  let bestScore = -Infinity;
  for (let s = 0; s < toks.length; s++) {
    let score = 0;
    for (let j = 0; j < s; j++) score += frScore(toks[j]);
    for (let j = s; j < toks.length; j++) score += mnkScore(toks[j]);
    // une ponctuation finale juste avant la coupure (« parti ? | í yé… ») est un bon indice
    if (s > 0 && /[?!.]$/.test(toks[s - 1])) score += 1.5;
    if (/^[?!.]$/.test(toks[s])) score -= 3; // ne pas commencer par une ponctuation
    if (score > bestScore) { bestScore = score; best = s; }
  }
  const tail = toks.slice(best);
  if (!tail.some(isMandinkaToken) && !tail.every((t) => AMBIGUOUS.has(bare(t)) || /^[?!]$/.test(t))) return { head: toks.join(" "), tail: "" };
  return { head: toks.slice(0, best).join(" "), tail: tail.join(" ") };
}

/** Repère les numéros de page de type « p. 12/274 » dans un texte continu. */
export function splitByPageMarkers(text: string): { page: string | null; text: string }[] {
  const re = /^[^\n]*?p\.\s*(\d+)\s*\/\s*\d+[^\n]*$/gm;
  const out: { page: string | null; text: string }[] = [];
  let last = 0;
  let page: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ page, text: text.slice(last, m.index) });
    page = m[1];
    last = m.index + m[0].length;
  }
  out.push({ page, text: text.slice(last) });
  return out.filter((p) => p.text.trim());
}

/** Détecte des titres de sections (lignes courtes en capitales ou numérotées). */
export function detectSections(pages: { page: string | null; text: string }[]): Section[] {
  const out: Section[] = [];
  for (const p of pages) {
    for (const line of p.text.split(/\n/)) {
      const l = line.trim();
      if (l.length < 4 || l.length > 90) continue;
      const caps = l === l.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(l) && !/\d{3,}/.test(l);
      const numbered = /^((\d+(\.\d+)*)|([IVX]+))[.)]?\s+[A-ZÀ-Ý]/.test(l);
      if (caps || numbered) out.push({ title: l, page: p.page });
    }
  }
  return out.slice(0, 300);
}

/** Extrait des candidats « entrée : traduction » + exemples d'un texte lexicographique. */
export function parseLexicon(pages: { page: string | null; text: string }[]): ImportCandidate[] {
  const out: ImportCandidate[] = [];
  let current: ImportCandidate | null = null;
  for (const p of pages) {
    const text = norm(p.text).replace(/\s*\n\s*/g, " ").replace(/\\([!*_])/g, "$1").replace(/[‣•]/g, " ");
    const pieces = text.split(/\s:\s/);
    if (pieces.length < 2) continue;
    // pour chaque séparateur k : partie mandinka = queue du morceau k ; partie française = tête du morceau k+1
    const splits = pieces.map((pc, idx) => (idx === 0 ? { head: "", tail: splitTail(pc).tail } : idx === pieces.length - 1 ? { head: pc.trim(), tail: "" } : splitTail(pc)));
    for (let k = 0; k < pieces.length - 1; k++) {
      const mnk = splits[k].tail.trim();
      const fr = splits[k + 1].head.trim();
      if (!mnk || !fr) continue;
      const raw = `${mnk} : ${fr}`;
      const shortBare = /^[a-zŋñ]{1,3}$/i.test(mnk) && fr.length <= 80; // ex. « a : lui, elle » (ton bas non noté)
      if (looksLikeHeadword(mnk) || shortBare) {
        const [first, ...variants] = mnk.split(/,\s*/);
        current = {
          page: p.page,
          raw_text: raw,
          headword: first.trim(),
          translation_fr: fr.replace(/^cf\.\s*/, "voir ").slice(0, 500),
          part_of_speech: null,
          examples: [],
          confidence: shortBare ? 0.5 : fr.length < 120 ? 0.8 : 0.6,
        };
        if (variants.length) current.raw_text = raw; // les variantes restent visibles dans raw_text
        out.push(current);
      } else if (current && mnk.split(/\s+/).some(isMandinkaToken)) {
        current.examples.push({ mandinka: mnk, french: fr });
        current.raw_text += ` ‖ ${raw}`;
      } else {
        out.push({ page: p.page, raw_text: raw, headword: null, translation_fr: null, part_of_speech: null, examples: [], confidence: 0.2 });
      }
    }
  }
  return out;
}

/** CSV : colonnes reconnues mot|headword, traduction|translation, categorie|pos, exemple, exemple_fr, page. */
export function parseCsvRows(rows: Record<string, string>[]): ImportCandidate[] {
  const pick = (r: Record<string, string>, keys: string[]) => {
    for (const k of Object.keys(r)) if (keys.includes(k.trim().toLowerCase())) return (r[k] ?? "").trim();
    return "";
  };
  return rows
    .map((r) => {
      const headword = pick(r, ["mot", "headword", "mandinka", "entree", "entrée"]).normalize("NFC");
      const translation = pick(r, ["traduction", "translation", "francais", "français", "sens"]);
      const ex = pick(r, ["exemple", "example", "exemple_mandinka"]).normalize("NFC");
      const exFr = pick(r, ["exemple_fr", "traduction_exemple", "example_fr"]);
      return {
        page: pick(r, ["page"]) || null,
        raw_text: Object.values(r).join(" | "),
        headword: headword || null,
        translation_fr: translation || null,
        part_of_speech: pick(r, ["categorie", "catégorie", "pos", "nature"]) || null,
        examples: ex ? [{ mandinka: ex, french: exFr }] : [],
        confidence: headword && translation ? 0.9 : 0.3,
      };
    })
    .filter((c) => c.headword || c.translation_fr);
}
