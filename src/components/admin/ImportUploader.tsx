"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { processImportAction } from "@/app/admin/actions";
import { ORTHOGRAPHY_LABELS } from "@/lib/utils";

const ACCEPT = ["application/pdf", "text/plain", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

/** Téléverse l'ouvrage directement dans la bibliothèque privée « sources », puis lance l'extraction côté serveur. */
export function ImportUploader({ sources }: { sources: { id: string; author: string; year: number | null; title: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [ortho, setOrtho] = useState("autre");
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = () => start(async () => {
    setError(null);
    if (!file) return setError("Choisissez un fichier.");
    const mime = file.type || (file.name.endsWith(".csv") ? "text/csv" : file.name.endsWith(".txt") ? "text/plain" : "");
    if (!ACCEPT.includes(mime)) return setError("Formats acceptés : PDF, DOCX, TXT, CSV.");
    if (file.size > 50 * 1024 * 1024) return setError("Fichier trop volumineux (50 Mo maximum).");
    setStatus("Envoi du fichier dans la bibliothèque privée…");
    const safe = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
    const path = `imports/${Date.now()}-${safe}`;
    const { error: upErr } = await createClient().storage.from("sources").upload(path, file, { contentType: mime });
    if (upErr) { setStatus(null); return setError("Échec de l’envoi : " + upErr.message); }
    setStatus("Extraction du texte et structuration (peut prendre une minute)…");
    const res = await processImportAction({ path, filename: file.name, mime, sourceId: sourceId || null, orthography: ortho, pageOffset: offset });
    setStatus(null);
    if (!res.ok) { setError(res.error); if (res.jobId) router.push(`/admin/import/${res.jobId}`); return; }
    router.push(`/admin/import/${res.jobId}`);
  });

  return (
    <div className="space-y-4">
      <Field label="Document (PDF, DOCX, TXT, CSV)"><input type="file" accept=".pdf,.docx,.txt,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block text-sm" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Ouvrage source"><Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}><option value="">Aucun / à préciser</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.author} {s.year} — {s.title.slice(0, 40)}</option>)}</Select></Field>
        <Field label="Convention d’écriture"><Select value={ortho} onChange={(e) => setOrtho(e.target.value)}>{Object.entries(ORTHOGRAPHY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Décalage de pagination" hint="Si la page 1 du PDF n’est pas la page 1 de l’ouvrage."><Input type="number" value={offset} onChange={(e) => setOffset(Number(e.target.value) || 0)} /></Field>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {status && <Alert tone="info">{status}</Alert>}
      <Button onClick={run} disabled={pending || !file}><Upload className="h-4 w-4" /> {pending ? "Traitement…" : "Importer et analyser"}</Button>
    </div>
  );
}
