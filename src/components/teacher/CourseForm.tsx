import { Field, Input, Select, Textarea } from "@/components/ui";
import { LEVEL_LABELS } from "@/lib/utils";
import type { Course } from "@/lib/types";

export function CourseFields({ course, categories }: { course?: Partial<Course>; categories: { id: string; name: string }[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre" htmlFor="title" required><Input id="title" name="title" defaultValue={course?.title} required minLength={3} maxLength={200} /></Field>
        <Field label="Adresse (slug)" htmlFor="slug" hint="Générée à partir du titre si vide."><Input id="slug" name="slug" defaultValue={course?.slug} pattern="[a-z0-9\-]*" /></Field>
      </div>
      <Field label="Description" htmlFor="description"><Textarea id="description" name="description" defaultValue={course?.description} maxLength={5000} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Niveau" htmlFor="level"><Select id="level" name="level" defaultValue={course?.level ?? "debutant"}>{Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Catégorie" htmlFor="category_id"><Select id="category_id" name="category_id" defaultValue={course?.category_id ?? ""}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Durée estimée (minutes)" htmlFor="estimated_minutes"><Input id="estimated_minutes" name="estimated_minutes" type="number" min={1} defaultValue={course?.estimated_minutes ?? ""} /></Field>
      </div>
      <Field label="Objectifs pédagogiques" htmlFor="objectives" hint="Un objectif par ligne."><Textarea id="objectives" name="objectives" defaultValue={course?.objectives?.join("\n")} /></Field>
      <Field label="Image de couverture" htmlFor="cover" hint="JPG, PNG ou WebP, 5 Mo maximum.">
        <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="block text-sm" />
      </Field>
    </div>
  );
}
