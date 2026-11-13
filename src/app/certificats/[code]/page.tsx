import type { Metadata } from "next";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { Alert } from "@/components/ui";
import { LogoMark } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { LEVEL_LABELS, formatDate } from "@/lib/utils";
import type { CourseLevel } from "@/lib/types";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Certificat", robots: { index: false } };

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { p_code: decodeURIComponent(code) });
  const c = data as null | { code: string; student_name: string; course_title: string; level: CourseLevel; score: number | null; issued_at: string; valid: boolean };
  if (!c) return <div className="container-kd max-w-xl py-12"><Alert tone="error">Aucun certificat ne correspond à l’identifiant « {decodeURIComponent(code)} ».</Alert></div>;
  const url = `${SITE_URL}/certificats/${c.code}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#126B4B", light: "#FFFFFF" } });

  return (
    <div className="container-kd max-w-4xl py-8">
      {!c.valid && <Alert tone="error" className="mb-4">Ce certificat a été révoqué et n’est plus valide.</Alert>}
      {c.valid && <Alert tone="success" className="no-print mb-4">Certificat authentique, délivré par KARANG-DULAA.</Alert>}
      <div className="no-print mb-4 flex justify-end"><PrintButton><Printer className="h-4 w-4" /> Imprimer / PDF</PrintButton></div>
      <article className="relative overflow-hidden rounded-3xl border-8 border-double border-gold bg-white p-8 text-center shadow-sm sm:p-12 print:shadow-none">
        <div className="absolute inset-x-0 top-0 h-3 bg-forest bg-kd-pattern" aria-hidden />
        <LogoMark className="mx-auto h-16 w-16" />
        <p className="mt-3 text-sm font-bold uppercase tracking-[0.3em] text-gold-600">KARANG-DULAA · École virtuelle de la langue mandinka</p>
        <h1 className="mt-6 font-serif text-3xl font-bold text-forest sm:text-4xl">Certificat de réussite</h1>
        <p className="mt-6 text-ink-500">Ce certificat est décerné à</p>
        <p className="mt-2 font-serif text-3xl font-bold sm:text-4xl">{c.student_name}</p>
        <p className="mt-6 text-ink-500">pour avoir suivi avec succès le cours</p>
        <p className="mt-2 text-2xl font-extrabold">« {c.course_title} »</p>
        <p className="mt-4">Niveau atteint : <strong>{LEVEL_LABELS[c.level]}</strong>{c.score !== null && <> · Score moyen aux évaluations : <strong>{Math.round(Number(c.score))} %</strong></>}</p>
        <div className="mt-10 flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-end">
          <div className="text-left text-sm">
            <p>Délivré le <strong>{formatDate(c.issued_at)}</strong></p>
            <p className="mt-1">Identifiant : <span className="font-mono font-bold">{c.code}</span></p>
            <p className="mt-1 text-xs text-ink-400">Vérification : {url}</p>
          </div>
          <div className="h-28 w-28" role="img" aria-label="QR code de vérification" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
      </article>
    </div>
  );
}
