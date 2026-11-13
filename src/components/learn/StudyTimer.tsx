"use client";
import { useEffect, useRef } from "react";
import { recordStudyTime } from "@/app/academie/actions";

/** Envoie le temps passé sur la leçon (onglet visible uniquement), toutes les 60 s. */
export function StudyTimer({ lessonId }: { lessonId: string }) {
  const acc = useRef(0);
  useEffect(() => {
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      if (document.visibilityState === "visible") acc.current += (now - last) / 1000;
      last = now;
    };
    const flush = () => {
      tick();
      const s = Math.min(120, Math.floor(acc.current));
      if (s >= 5) {
        acc.current -= s;
        void recordStudyTime(lessonId, s);
      }
    };
    void recordStudyTime(lessonId, 0); // marque la leçon comme « dernière consultée »
    const interval = setInterval(flush, 60_000);
    const onVis = () => (document.visibilityState === "hidden" ? flush() : (last = Date.now()));
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, [lessonId]);
  return null;
}
