import { Badge, Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { AudioPlayer } from "@/components/learn/AudioPlayer";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { managedCourses } from "@/lib/managed";
import { signedUrls } from "@/lib/storage";
import { deleteAudioAction, uploadAudioAction } from "../actions";

export const metadata = { title: "Enregistrements audio" };

export default async function AudioAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireStaff();
  const supabase = await createClient();
  const courses = await managedCourses(user);
  const ids = courses.map((c) => c.id);
  const [{ data: audios }, { data: lessons }] = await Promise.all([
    supabase.from("audio_resources").select("id, title, kind, transcript, translation_fr, storage_path, speaker_name, speaker_region, uploaded_by").order("created_at", { ascending: false }).limit(100),
    ids.length ? supabase.from("lessons").select("id, title, course_id").in("course_id", ids).order("position") : Promise.resolve({ data: [] }),
  ]);
  const urls = await signedUrls("audio", (audios ?? []).map((a) => a.storage_path));
  return (
    <div className="container-kd max-w-5xl py-8">
      <PageHeader title="Enregistrements audio" description="Importez des enregistrements réalisés par des locuteurs mandinka. Ils alimentent le laboratoire de prononciation, les leçons, les dictées et le dictionnaire." />
      <Flash searchParams={sp} />
      <Card>
        <form action={uploadAudioAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Titre" required><Input name="title" required placeholder="Ex. : Salutations du matin" /></Field>
            <Field label="Type"><Select name="kind"><option value="word">Mot</option><option value="phrase">Phrase</option><option value="dialogue">Dialogue</option><option value="text">Texte</option><option value="other">Autre</option></Select></Field>
          </div>
          <Field label="Fichier audio" required hint="MP3, M4A, OGG, WAV, WebM — 20 Mo maximum."><input name="file" type="file" accept="audio/*" required className="block text-sm" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Transcription mandinka"><Input name="transcript" className="mnk" /></Field>
            <Field label="Traduction française"><Input name="translation_fr" /></Field>
            <Field label="Nom du locuteur (avec son accord)"><Input name="speaker_name" /></Field>
            <Field label="Région / parler"><Input name="speaker_region" placeholder="Ex. : Sédhiou" /></Field>
            <Field label="Leçon associée"><Select name="lesson_id"><option value="">Aucune</option>{(lessons ?? []).map((l) => <option key={l.id} value={l.id}>{courses.find((c) => c.id === l.course_id)?.title} › {l.title}</option>)}</Select></Field>
            <Field label="Entrée du dictionnaire (identifiant, facultatif)" hint="Copiez l’identifiant depuis l’adresse de la fiche du mot."><Input name="entry_id" pattern="[0-9a-fA-F\-]{36}" /></Field>
          </div>
          <label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" name="speaker_consent" required className="mt-1 accent-forest" /> Le locuteur a donné son accord pour la diffusion de cet enregistrement sur KARANG-DULAA.</label>
          <SubmitButton pendingLabel="Envoi…">Importer</SubmitButton>
        </form>
      </Card>
      <h2 className="mb-3 mt-8 font-bold">Bibliothèque audio</h2>
      {(audios ?? []).length === 0 ? <EmptyState title="Aucun enregistrement." /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {(audios ?? []).map((a) => (
            <Card key={a.id}>
              <div className="mb-2 flex items-center justify-between gap-2"><Badge>{a.kind}</Badge>
                {(user.isAdmin || a.uploaded_by === user.id) && <form action={deleteAudioAction}><input type="hidden" name="id" value={a.id} /><SubmitButton variant="ghost" size="sm" className="text-red-700" confirm="Supprimer cet enregistrement ?" pendingLabel="…">Supprimer</SubmitButton></form>}</div>
              {urls.get(a.storage_path) ? <AudioPlayer src={urls.get(a.storage_path)!} title={a.title} transcript={a.transcript} translation={a.translation_fr} speaker={a.speaker_name} /> : <p>{a.title}</p>}
              <p className="mt-2 font-mono text-[11px] text-ink-400">ID : {a.id}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
