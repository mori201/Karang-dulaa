"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Circle, Mic, Save, Square, Trash2 } from "lucide-react";
import { Alert, Button } from "@/components/ui";
import { saveRecording, setRecordingConsent, deleteRecording } from "@/app/prononciation/actions";

/** Enregistreur de la voix de l'apprenant pour comparaison à l'écoute.
 *  Aucune note automatique : la comparaison est faite par l'apprenant (ou l'enseignant). */
export function Recorder({ audioId, loggedIn, consent }: { audioId?: string; loggedIn: boolean; consent: boolean }) {
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const begin = async () => {
    setError(null); setMsg(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Votre navigateur ne permet pas l’enregistrement audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setState("done");
      };
      rec.current = mr;
      mr.start();
      setState("recording");
      setTimeout(() => mr.state === "recording" && mr.stop(), 30_000); // 30 s maximum
    } catch {
      setError("Accès au micro refusé. Autorisez le micro dans votre navigateur pour vous enregistrer.");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {state !== "recording" ? (
          <Button type="button" variant="outline" size="sm" onClick={begin}><Mic className="h-4 w-4 text-red-600" /> {state === "done" ? "Recommencer" : "M’enregistrer"}</Button>
        ) : (
          <Button type="button" variant="danger" size="sm" onClick={() => rec.current?.stop()}><Square className="h-4 w-4" /> Arrêter <Circle className="h-2 w-2 animate-pulse fill-current" /></Button>
        )}
        {url && <audio src={url} controls className="h-9 max-w-full" />}
        {url && <Button type="button" variant="ghost" size="sm" onClick={() => { setUrl(null); setBlob(null); setState("idle"); }} aria-label="Effacer l’enregistrement"><Trash2 className="h-4 w-4" /></Button>}
        {url && loggedIn && consent && blob && (
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => {
            const fd = new FormData();
            fd.set("audio", new File([blob], "enregistrement", { type: blob.type }));
            if (audioId) fd.set("audio_id", audioId);
            const r = await saveRecording(fd);
            if (r.ok) setMsg("Enregistrement conservé dans votre espace privé."); else setError(r.error ?? "Erreur");
          })}><Save className="h-4 w-4" /> Conserver</Button>
        )}
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {msg && <Alert tone="success">{msg}</Alert>}
    </div>
  );
}

export function ConsentToggle({ consent }: { consent: boolean }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1 accent-forest" defaultChecked={consent} disabled={pending}
        onChange={(e) => start(() => setRecordingConsent(e.target.checked))} />
      <span>J’accepte que mes enregistrements soient conservés dans mon espace privé (visible par moi seul·e). Je peux les supprimer à tout moment.
        Sans ce consentement, les enregistrements restent sur mon appareil et disparaissent quand je quitte la page.</span>
    </label>
  );
}

export function DeleteRecordingButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => start(() => deleteRecording(id))} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></Button>;
}
