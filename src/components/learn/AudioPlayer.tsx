"use client";
import { useRef, useState } from "react";
import { Gauge, Pause, Play, RotateCcw } from "lucide-react";

const RATES = [1, 0.75, 0.5];

/** Lecteur audio léger : lecture, réécoute, ralentissement (vitesse 0,75 / 0,5). */
export function AudioPlayer({ src, title, transcript, translation, speaker, compact = false }: {
  src: string; title?: string | null; transcript?: string | null; translation?: string | null; speaker?: string | null; compact?: boolean;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) void a.play(); else a.pause();
  };
  const replay = () => {
    const a = ref.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play();
  };
  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (ref.current) {
      ref.current.playbackRate = next;
      // conserve la hauteur de la voix quand on ralentit (si le navigateur le permet)
      (ref.current as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    }
  };

  return (
    <div className={compact ? "flex items-center gap-2" : "rounded-2xl border border-sand-300 bg-white p-4"}>
      <audio ref={ref} src={src} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <div className="flex items-center gap-2">
        <button type="button" onClick={toggle} className="grid h-11 w-11 place-items-center rounded-full bg-forest text-white hover:bg-forest-600" aria-label={playing ? "Pause" : "Écouter"}>
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
        </button>
        <button type="button" onClick={replay} className="grid h-9 w-9 place-items-center rounded-full bg-sand-200 text-ink-600 hover:bg-sand-300" aria-label="Réécouter depuis le début">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button type="button" onClick={cycleRate} className="inline-flex h-9 items-center gap-1 rounded-full bg-sand-200 px-3 text-sm font-semibold text-ink-600 hover:bg-sand-300" aria-label={`Vitesse de lecture : ${rate}`}>
          <Gauge className="h-4 w-4" /> ×{String(rate).replace(".", ",")}
        </button>
        {!compact && title && <span className="ml-1 font-semibold">{title}</span>}
      </div>
      {!compact && (transcript || translation) && (
        <div className="mt-3">
          {transcript && <div className="mnk text-lg font-semibold">{transcript}</div>}
          {translation && <div className="text-ink-500">« {translation} »</div>}
        </div>
      )}
      {!compact && speaker && <div className="mt-1 text-xs text-ink-400">Voix : {speaker}</div>}
    </div>
  );
}
