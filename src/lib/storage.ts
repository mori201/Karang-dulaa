import "server-only";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/env";

export type Bucket = "public-media" | "course-files" | "audio" | "sources" | "recordings" | "submissions";

export function publicMediaUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/public-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** URL signée (1 h) — la RLS du stockage vérifie que l'utilisateur y a droit. */
export async function signedUrl(bucket: Bucket, path: string | null | undefined, expiresIn = 3600, download?: string) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}

export async function signedUrls(bucket: Bucket, paths: string[]) {
  if (paths.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
  const map = new Map<string, string>();
  (data ?? []).forEach((d) => d.path && d.signedUrl && map.set(d.path, d.signedUrl));
  return map;
}

const MAX = { image: 5, audio: 20, doc: 50 } as const;
export const ALLOWED = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  audio: ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav", "audio/webm", "audio/aac"],
  doc: [
    "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain", "text/csv", "video/mp4", "video/webm", "image/jpeg", "image/png", "image/webp",
    "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm",
  ],
} as const;

/** Contrôle d'un fichier téléversé (type MIME + taille). */
export function checkFile(file: File | null, kind: keyof typeof ALLOWED): string | null {
  if (!file || file.size === 0) return "Aucun fichier sélectionné.";
  if (!(ALLOWED[kind] as readonly string[]).includes(file.type)) return `Type de fichier non autorisé (${file.type || "inconnu"}).`;
  if (file.size > MAX[kind] * 1024 * 1024) return `Fichier trop volumineux (maximum ${MAX[kind]} Mo).`;
  return null;
}

export function safeFileName(name: string) {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = name.replace(/\.[^.]+$/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "fichier";
  return `${Date.now()}-${base}${ext ? "." + ext : ""}`;
}
