import type { Metadata } from "next";
import Link from "next/link";
import { Headphones, Info } from "lucide-react";
import { Alert, Badge, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { AudioPlayer } from "@/components/learn/AudioPlayer";
import { ConsentToggle, DeleteRecordingButton, Recorder } from "@/components/learn/Recorder";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";
import { formatDate, fold } from "@/lib/utils";

export const metadata: Metadata = { title: "Laboratoire de prononciation" };

const KINDS: Record<string, string> = { word: "Mots", phrase: "Phrases", dialogue: "Dialogues", text: "Textes", other: "Autres" };

export default async function PronunciationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const supabase = await createClient();
  let query = supabase.from("audio_resources").select("id, title, kind, transcript, translation_fr, storage_path, speaker_name, speaker_region, lesson_id, lessons(title)").eq("status", "published").order("created_at", { ascending: false }).limit(60);
  if (sp.type && sp.type in KINDS) query = query.eq("kind", sp.type);
  const { data } = await query;
  const q = sp.q ? fold(sp.q) : "";
  const audios = (data ?? []).filter((a) => !q || fold(`${a.title} ${a.transcript ?? ""} ${a.translation_fr ?? ""}`).includes(q));
  const urls = await signedUrls("audio", audios.map((a) => a.storage_path));
  const { data: mine } = user
    ? await supabase.from("pronunciation_recordings").select("id, storage_path, created_at, audio_resources(title)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
    : { data: [] };
  const mineUrls = new Map<string, string>();
  if ((mine ?? []).length) {
    const { data: s } = await supabase.storage.from("recordings").createSignedUrls((mine ?? []).map((m) => m.storage_path), 3600);
    (s ?? []).forEach((x) => x.path && x.signedUrl && mineUrls.set(x.path, x.signedUrl));
  }

  return (
    <div className="container-kd py-8">
      <PageHeader eyebrow="Laboratoire" title="Écouter et prononcer"
        description="Écoutez des locuteurs mandinka, réécoutez, ralentissez, puis enregistrez-vous pour comparer votre prononciation au modèle." />
      <Alert tone="info" className="mb-6">
        <span className="inline-flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" />
          La comparaison se fait à l’oreille : KARANG-DULAA ne note pas automatiquement votre prononciation, car aucun modèle fiable n’existe encore pour évaluer le mandinka (tons, voyelles longues). Demandez l’avis de votre enseignant via les questions du cours.</span>
      </Alert>
      <form className="mb-6 grid gap-3 rounded-2xl border border-sand-300 bg-white p-4 sm:grid-cols-[1fr_200px_auto]" role="search">
        <Input name="q" defaultValue={sp.q} placeholder="Rechercher un mot, une phrase…" aria-label="Rechercher un enregistrement" />
        <Select name="type" defaultValue={sp.type ?? ""} aria-label="Type d’enregistrement">
          <option value="">Tous les types</option>
          {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <button className="h-10 rounded-lg bg-forest px-4 font-semibold text-white">Filtrer</button>
      </form>

      {user && <Card className="mb-6"><ConsentToggle consent={user.profile.recording_consent} /></Card>}

      {audios.length === 0 ? (
        <EmptyState icon={<Headphones className="h-10 w-10" />} title="Aucun enregistrement publié pour le moment."
          description="Les enseignants importent progressivement des enregistrements réalisés par des locuteurs mandinka, avec leur consentement." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {audios.map((a) => {
            const url = urls.get(a.storage_path);
            return (
              <Card key={a.id}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge>{KINDS[a.kind] ?? a.kind}</Badge>
                  {(a.lessons as unknown as { title: string } | null)?.title && <Badge tone="green">{(a.lessons as unknown as { title: string }).title}</Badge>}
                </div>
                {url ? <AudioPlayer src={url} title={a.title} transcript={a.transcript} translation={a.translation_fr} speaker={[a.speaker_name, a.speaker_region].filter(Boolean).join(", ") || null} />
                  : <p className="text-sm text-ink-400">Fichier indisponible.</p>}
                <div className="mt-3 border-t border-sand-300 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">À vous</p>
                  <Recorder audioId={a.id} loggedIn={!!user} consent={!!user?.profile.recording_consent} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {user && (mine ?? []).length > 0 && (
        <Card className="mt-8">
          <h2 className="font-bold">Mes enregistrements conservés</h2>
          <ul className="mt-3 divide-y divide-sand-300">
            {(mine ?? []).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="min-w-40 font-semibold">{(m.audio_resources as unknown as { title: string } | null)?.title ?? "Libre"}</span>
                <span className="text-ink-400">{formatDate(m.created_at, { dateStyle: "short", timeStyle: "short" })}</span>
                {mineUrls.get(m.storage_path) && <audio src={mineUrls.get(m.storage_path)} controls preload="none" className="h-9" />}
                <DeleteRecordingButton id={m.id} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      {!user && <p className="mt-6 text-sm text-ink-500"><Link className="link" href="/connexion?suivant=/prononciation">Connectez-vous</Link> pour conserver vos enregistrements.</p>}
    </div>
  );
}
