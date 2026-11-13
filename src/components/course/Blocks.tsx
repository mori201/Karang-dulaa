import Link from "next/link";
import { BookMarked, FileDown, Info, Lightbulb, PenLine, Quote, TriangleAlert } from "lucide-react";
import type { LessonBlock } from "@/lib/types";
import { AudioPlayer } from "@/components/learn/AudioPlayer";

type Resolved = { audio: Map<string, { url: string; title: string; transcript: string | null; translation_fr: string | null; speaker_name: string | null }>; files: Map<string, string> };

function youtubeEmbed(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean).pop()}`;
  } catch {}
  return null;
}

function Source({ text }: { text?: unknown }) {
  if (!text) return null;
  return <p className="mt-2 text-xs text-ink-400">Source : {String(text)}</p>;
}

export function Blocks({ blocks, resolved }: { blocks: LessonBlock[]; resolved: Resolved }) {
  return (
    <div className="space-y-5">
      {blocks.map((b) => {
        const d = b.data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        switch (b.block_type) {
          case "heading":
            return d.level === 3
              ? <h3 key={b.id} className="pt-2 text-lg font-bold">{d.text}</h3>
              : <h2 key={b.id} className="pt-3 text-xl font-extrabold text-forest-700">{d.text}</h2>;
          case "paragraph":
            return <div key={b.id} className="whitespace-pre-line leading-relaxed text-ink-600">{d.text}</div>;
          case "note": {
            const v = d.variant ?? "info";
            const styles: Record<string, [string, typeof Info]> = {
              info: ["border-sky-200 bg-sky-50 text-sky-900", Info],
              warning: ["border-gold-200 bg-gold-50 text-gold-700", TriangleAlert],
              culture: ["border-forest-200 bg-forest-50 text-forest-800", Lightbulb],
              source: ["border-sand-400 bg-sand-100 text-ink-500", BookMarked],
            };
            const [cls, Icon] = styles[v] ?? styles.info;
            return (
              <div key={b.id} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${cls}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="whitespace-pre-line">{d.text}</div>
              </div>
            );
          }
          case "vocabulary":
            return (
              <div key={b.id} className="overflow-hidden rounded-2xl border border-sand-300 bg-white">
                {d.title && <div className="border-b border-sand-300 bg-sand-100 px-4 py-2 text-sm font-bold">{d.title}</div>}
                <ul className="divide-y divide-sand-300">
                  {(d.items ?? []).map((it: any, i: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                    <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                      {it.entry_id ? (
                        <Link href={`/dictionnaire/${it.entry_id}`} className="mnk text-lg font-bold text-forest hover:underline">{it.mandinka}</Link>
                      ) : <span className="mnk text-lg font-bold text-forest">{it.mandinka}</span>}
                      <span className="text-ink-600">{it.french}</span>
                      {it.note && <span className="w-full text-xs text-ink-400">{it.note}</span>}
                    </li>
                  ))}
                </ul>
                {d.source && <p className="border-t border-sand-300 px-4 py-2 text-xs text-ink-400">Source : {d.source}</p>}
              </div>
            );
          case "table":
            return (
              <figure key={b.id} className="overflow-x-auto rounded-2xl border border-sand-300 bg-white">
                <table className="table-kd">
                  {d.headers?.length > 0 && <thead><tr>{d.headers.map((h: string, i: number) => <th key={i}>{h}</th>)}</tr></thead>}
                  <tbody>
                    {(d.rows ?? []).map((r: string[], i: number) => (
                      <tr key={i}>{r.map((c, j) => <td key={j} className={j === 0 ? "mnk font-semibold" : ""}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
                {d.caption && <figcaption className="px-4 py-2 text-xs text-ink-400">{d.caption}</figcaption>}
              </figure>
            );
          case "example":
            return (
              <div key={b.id} className="flex gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-sand-300">
                <Quote className="mt-1 h-4 w-4 shrink-0 text-gold-500" aria-hidden />
                <div>
                  <div className="mnk text-lg font-semibold text-ink">{d.mandinka}</div>
                  <div className="text-ink-500">« {d.french} »</div>
                  <Source text={d.source} />
                </div>
              </div>
            );
          case "dialogue":
            return (
              <div key={b.id} className="rounded-2xl border border-sand-300 bg-white p-4">
                {d.title && <div className="mb-3 font-bold">{d.title}</div>}
                <div className="space-y-2.5">
                  {(d.lines ?? []).map((l: any, i: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                    <div key={i} className={`flex gap-3 ${i % 2 ? "flex-row-reverse text-right" : ""}`}>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest-50 text-sm font-bold text-forest">{String(l.speaker ?? "?").slice(0, 2)}</span>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${i % 2 ? "bg-gold-50" : "bg-sand-200"}`}>
                        <div className="mnk font-semibold">{l.mandinka}</div>
                        {l.french && <div className="text-sm text-ink-500">{l.french}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <Source text={d.source} />
              </div>
            );
          case "image":
            return d.url ? (
              <figure key={b.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.url} alt={d.alt ?? ""} loading="lazy" decoding="async" className="w-full rounded-2xl border border-sand-300" />
                {d.caption && <figcaption className="mt-1 text-center text-xs text-ink-400">{d.caption}</figcaption>}
              </figure>
            ) : null;
          case "audio": {
            const a = d.audio_id ? resolved.audio.get(d.audio_id) : undefined;
            if (!a) return <p key={b.id} className="text-sm text-ink-400">Enregistrement audio indisponible.</p>;
            return <AudioPlayer key={b.id} src={a.url} title={d.title ?? a.title} transcript={a.transcript} translation={a.translation_fr} speaker={a.speaker_name} />;
          }
          case "video": {
            const embed = d.url ? youtubeEmbed(d.url) : null;
            const fileUrl = d.path ? resolved.files.get(d.path) : null;
            return (
              <figure key={b.id} className="overflow-hidden rounded-2xl border border-sand-300 bg-black">
                {embed ? (
                  <iframe src={embed} title={d.title ?? "Vidéo"} loading="lazy" className="aspect-video w-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
                ) : fileUrl ? (
                  <video src={fileUrl} controls preload="none" className="aspect-video w-full" />
                ) : <p className="p-4 text-sm text-white">Vidéo indisponible.</p>}
                {d.title && <figcaption className="bg-white px-4 py-2 text-sm">{d.title}</figcaption>}
              </figure>
            );
          }
          case "file": {
            const url = d.path ? resolved.files.get(d.path) : null;
            return url ? (
              <a key={b.id} href={url} className="flex items-center gap-3 rounded-xl border border-sand-300 bg-white px-4 py-3 hover:border-forest" target="_blank" rel="noopener">
                <FileDown className="h-5 w-5 text-forest" aria-hidden />
                <span className="font-semibold">{d.title ?? "Télécharger le document"}</span>
              </a>
            ) : <p key={b.id} className="text-sm text-ink-400">Document indisponible.</p>;
          }
          case "exercise_link":
            return (
              <Link key={b.id} href={`/exercices/${d.exercise_id}`} className="flex items-center gap-3 rounded-xl bg-forest px-4 py-3 font-semibold text-white hover:bg-forest-600">
                <PenLine className="h-5 w-5" aria-hidden /> {d.label ?? "Faire l’exercice"}
              </Link>
            );
          case "assignment_link":
            return (
              <Link key={b.id} href={`/devoirs/${d.assignment_id}`} className="flex items-center gap-3 rounded-xl border-2 border-gold bg-gold-50 px-4 py-3 font-semibold text-ink hover:bg-gold-100">
                <PenLine className="h-5 w-5 text-gold-600" aria-hidden /> {d.label ?? "Rendre le devoir"}
              </Link>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

/** Pré-calcule les URL signées des médias privés référencés par les blocs. */
export async function resolveBlockMedia(blocks: LessonBlock[]): Promise<Resolved> {
  const { createClient } = await import("@/lib/supabase/server");
  const { signedUrls } = await import("@/lib/storage");
  const supabase = await createClient();
  const audioIds = blocks.filter((b) => b.block_type === "audio" && b.data.audio_id).map((b) => String(b.data.audio_id));
  const filePaths = blocks.filter((b) => (b.block_type === "file" || b.block_type === "video") && b.data.path).map((b) => String(b.data.path));
  const audio = new Map<string, { url: string; title: string; transcript: string | null; translation_fr: string | null; speaker_name: string | null }>();
  if (audioIds.length) {
    const { data } = await supabase.from("audio_resources").select("id, title, storage_path, transcript, translation_fr, speaker_name").in("id", audioIds);
    const urls = await signedUrls("audio", (data ?? []).map((a) => a.storage_path));
    (data ?? []).forEach((a) => {
      const url = urls.get(a.storage_path);
      if (url) audio.set(a.id, { url, title: a.title, transcript: a.transcript, translation_fr: a.translation_fr, speaker_name: a.speaker_name });
    });
  }
  const files = await signedUrls("course-files", filePaths);
  return { audio, files };
}
