/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, Input, Select, Textarea } from "@/components/ui";
import type { BlockType } from "@/lib/types";

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Titre / sous-titre",
  paragraph: "Paragraphe",
  vocabulary: "Vocabulaire (mots et traductions)",
  example: "Exemple de phrase",
  dialogue: "Dialogue",
  table: "Tableau",
  note: "Encadré (info, attention, culture, source)",
  image: "Image / illustration",
  audio: "Enregistrement audio",
  video: "Vidéo",
  file: "Document (PDF, Word…)",
  exercise_link: "Lien vers un exercice / quiz",
  assignment_link: "Lien vers un devoir",
};

type Opts = { audios: { id: string; title: string }[]; exercises: { id: string; title: string }[]; assignments: { id: string; title: string }[] };

export function BlockFields({ type, data = {}, opts }: { type: BlockType; data?: Record<string, any>; opts: Opts }) {
  switch (type) {
    case "heading":
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label="Texte"><Input name="text" defaultValue={data.text} required /></Field>
          <Field label="Niveau"><Select name="level" defaultValue={String(data.level ?? 2)}><option value="2">Titre</option><option value="3">Sous-titre</option></Select></Field>
        </div>
      );
    case "paragraph":
      return <Field label="Texte"><Textarea name="text" defaultValue={data.text} required className="min-h-32" /></Field>;
    case "note":
      return (
        <div className="space-y-3">
          <Field label="Type"><Select name="variant" defaultValue={data.variant ?? "info"}><option value="info">Information</option><option value="warning">Attention / à valider</option><option value="culture">Culture</option><option value="source">Source</option></Select></Field>
          <Field label="Texte"><Textarea name="text" defaultValue={data.text} required /></Field>
        </div>
      );
    case "example":
      return (
        <div className="space-y-3">
          <Field label="Phrase en mandinka"><Input name="mandinka" defaultValue={data.mandinka} required className="mnk" /></Field>
          <Field label="Traduction"><Input name="french" defaultValue={data.french} /></Field>
          <Field label="Source (ouvrage, page)"><Input name="source" defaultValue={data.source} placeholder="Ex. : Creissels 2012, p. 46" /></Field>
        </div>
      );
    case "vocabulary":
      return (
        <div className="space-y-3">
          <Field label="Titre (facultatif)"><Input name="title" defaultValue={data.title} /></Field>
          <Field label="Mots" hint="Une ligne par mot : mandinka = français (= identifiant de l’entrée du dictionnaire, facultatif).">
            <Textarea name="items" className="mnk min-h-32" required defaultValue={(data.items ?? []).map((i: any) => [i.mandinka, i.french, i.entry_id].filter(Boolean).join(" = ")).join("\n")} placeholder={"àbáríká = merci\nbǐi = aujourd'hui"} />
          </Field>
          <Field label="Source"><Input name="source" defaultValue={data.source} /></Field>
        </div>
      );
    case "dialogue":
      return (
        <div className="space-y-3">
          <Field label="Titre (facultatif)"><Input name="title" defaultValue={data.title} /></Field>
          <Field label="Répliques" hint="Une ligne par réplique : Locuteur : texte mandinka = traduction.">
            <Textarea name="lines" className="mnk min-h-32" required defaultValue={(data.lines ?? []).map((l: any) => `${l.speaker} : ${l.mandinka}${l.french ? ` = ${l.french}` : ""}`).join("\n")} />
          </Field>
          <Field label="Source"><Input name="source" defaultValue={data.source} /></Field>
        </div>
      );
    case "table":
      return (
        <div className="space-y-3">
          <Field label="En-têtes" hint="Séparés par des barres verticales : Mandinka | Français"><Input name="headers" defaultValue={(data.headers ?? []).join(" | ")} /></Field>
          <Field label="Lignes" hint="Une ligne par rangée, cellules séparées par |"><Textarea name="rows" className="mnk min-h-32" required defaultValue={(data.rows ?? []).map((r: string[]) => r.join(" | ")).join("\n")} /></Field>
          <Field label="Légende"><Input name="caption" defaultValue={data.caption} /></Field>
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <Field label="Fichier image" hint="JPG, PNG, WebP — 5 Mo maximum."><input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="block text-sm" /></Field>
          <Field label="…ou adresse https://"><Input name="url" defaultValue={data.url} /></Field>
          <Field label="Texte alternatif (accessibilité)"><Input name="alt" defaultValue={data.alt} required /></Field>
          <Field label="Légende"><Input name="caption" defaultValue={data.caption} /></Field>
        </div>
      );
    case "audio":
      return (
        <div className="space-y-3">
          <Field label="Enregistrement" hint="Importez d’abord le fichier dans « Audio » (avec le consentement du locuteur).">
            <Select name="audio_id" defaultValue={data.audio_id ?? ""} required><option value="">— Choisir —</option>{opts.audios.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</Select>
          </Field>
          <Field label="Titre affiché (facultatif)"><Input name="title" defaultValue={data.title} /></Field>
        </div>
      );
    case "video":
    case "file":
      return (
        <div className="space-y-3">
          <Field label="Titre"><Input name="title" defaultValue={data.title} /></Field>
          <Field label={type === "video" ? "Fichier vidéo (MP4, WebM — 50 Mo max.)" : "Fichier (PDF, Word, texte — 50 Mo max.)"}>
            <input name="file" type="file" accept={type === "video" ? "video/mp4,video/webm" : ".pdf,.doc,.docx,.txt,.csv"} className="block text-sm" />
          </Field>
          {data.path && <p className="text-xs text-ink-500">Fichier actuel : {String(data.path).split("/").pop()}</p>}
          {type === "video" && <Field label="…ou lien YouTube / Vimeo"><Input name="url" defaultValue={data.url} placeholder="https://www.youtube.com/watch?v=…" /></Field>}
        </div>
      );
    case "exercise_link":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Exercice"><Select name="exercise_id" defaultValue={data.exercise_id ?? ""} required><option value="">— Choisir —</option>{opts.exercises.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</Select></Field>
          <Field label="Libellé du bouton"><Input name="label" defaultValue={data.label} /></Field>
        </div>
      );
    case "assignment_link":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Devoir"><Select name="assignment_id" defaultValue={data.assignment_id ?? ""} required><option value="">— Choisir —</option>{opts.assignments.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</Select></Field>
          <Field label="Libellé du bouton"><Input name="label" defaultValue={data.label} /></Field>
        </div>
      );
  }
}
