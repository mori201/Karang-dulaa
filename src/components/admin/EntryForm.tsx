import { Field, Input, Select, Textarea } from "@/components/ui";
import { ORTHOGRAPHY_LABELS, POS_LABELS } from "@/lib/utils";
import type { DictionaryEntry } from "@/lib/types";

export function EntryFields({ entry, examples, sources, categories, selected }: {
  entry?: Partial<DictionaryEntry>; examples?: { mandinka: string; french: string | null; source_page: string | null }[];
  sources: { id: string; author: string; year: number | null }[]; categories: { id: string; name: string }[]; selected?: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mot mandinka (orthographe exacte de la source)" required><Input name="headword" defaultValue={entry?.headword} required className="mnk text-lg" /></Field>
        <Field label="Variantes attestées" hint="Séparées par des virgules."><Input name="variants" defaultValue={entry?.variants?.join(", ")} className="mnk" /></Field>
      </div>
      <Field label="Traduction française" required><Input name="translation_fr" defaultValue={entry?.translation_fr} required /></Field>
      <Field label="Définition"><Textarea name="definition" defaultValue={entry?.definition ?? ""} className="min-h-16" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Catégorie grammaticale"><Select name="part_of_speech" defaultValue={entry?.part_of_speech ?? ""}><option value="">—</option>{Object.entries(POS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Prononciation"><Input name="pronunciation" defaultValue={entry?.pronunciation ?? ""} className="mnk" /></Field>
        <Field label="Variante régionale"><Input name="regional_variant" defaultValue={entry?.regional_variant ?? ""} /></Field>
      </div>
      <Field label="Informations tonales (si documentées)"><Input name="tone_notes" defaultValue={entry?.tone_notes ?? ""} /></Field>
      <Field label="Exemples" hint="Une ligne par exemple : phrase mandinka = traduction (= page, facultatif).">
        <Textarea name="examples" className="mnk min-h-24" defaultValue={(examples ?? []).map((e) => [e.mandinka, e.french ?? "", e.source_page ?? ""].filter((x, i) => i < 2 || x).join(" = ")).join("\n")} />
      </Field>
      <Field label="Informations complémentaires"><Textarea name="notes" defaultValue={entry?.notes ?? ""} className="min-h-16" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Source documentaire"><Select name="source_id" defaultValue={entry?.source_id ?? ""}><option value="">Aucune (saisie KARANG-DULAA)</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.author} {s.year}</option>)}</Select></Field>
        <Field label="Page de référence" hint="Obligatoire si une source est choisie."><Input name="source_page" defaultValue={entry?.source_page ?? ""} /></Field>
        <Field label="Convention d’écriture"><Select name="orthography" defaultValue={entry?.orthography ?? "karang_dulaa"}>{Object.entries(ORTHOGRAPHY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink-600">Thèmes</legend>
        <div className="flex flex-wrap gap-3">{categories.map((c) => <label key={c.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="categories" value={c.id} defaultChecked={selected?.includes(c.id)} className="accent-forest" /> {c.name}</label>)}</div>
      </fieldset>
      <Field label="Statut"><Select name="status" defaultValue={entry?.status ?? "draft"} className="max-w-xs"><option value="draft">Brouillon</option><option value="pending_review">À valider</option><option value="published">Publié</option><option value="rejected">Rejeté</option></Select></Field>
    </div>
  );
}
