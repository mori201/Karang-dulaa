import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { Alert, Badge, ButtonLink, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { signedUrl } from "@/lib/storage";
import { DOC_CATEGORIES, VISIBILITY_LABELS } from "@/lib/documents";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Document" };

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getSessionUser();
  const supabase = await createClient();
  const { data: d } = await supabase.from("documents").select("*, courses(title, slug), lessons(title), dictionary_sources(author, year, title)").eq("id", id).maybeSingle();
  if (!d) {
    return <div className="container-kd max-w-2xl py-12"><Alert tone="info">Ce document n’existe pas ou n’est pas accessible avec votre compte. {!user && <Link className="link" href={`/connexion?suivant=/bibliotheque/${id}`}>Se connecter</Link>}</Alert></div>;
  }
  const filename = d.storage_path ? d.storage_path.split("/").pop() : undefined;
  const viewUrl = d.storage_path ? await signedUrl("course-files", d.storage_path) : null;
  const downloadUrl = d.storage_path && d.is_downloadable ? await signedUrl("course-files", d.storage_path, 3600, filename) : null;
  const course = d.courses as unknown as { title: string; slug: string } | null;
  const src = d.dictionary_sources as unknown as { author: string; year: number; title: string } | null;
  const isPdf = d.mime_type === "application/pdf";
  const isImage = d.mime_type?.startsWith("image/");
  const isAudio = d.mime_type?.startsWith("audio/");
  const isVideo = d.mime_type?.startsWith("video/");

  return (
    <div className="container-kd max-w-4xl py-8">
      <Link href="/bibliotheque" className="text-sm text-ink-500 hover:text-forest">← Bibliothèque</Link>
      <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{d.title}</h1>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge>{DOC_CATEGORIES[d.category] ?? d.category}</Badge>
        {course && <Link href={`/academie/${course.slug}`}><Badge tone="green">{course.title}</Badge></Link>}
        {user?.isStaff && <Badge tone="blue">{VISIBILITY_LABELS[d.visibility]}</Badge>}
      </div>
      {d.description && <p className="mt-4 whitespace-pre-line text-ink-600">{d.description}</p>}
      {(d.rights_note || src) && (
        <Alert tone="warning" className="mt-4">
          {src && <p>Source : {src.author} ({src.year}), <i>{src.title}</i>.</p>}
          {d.rights_note && <p>{d.rights_note}</p>}
        </Alert>
      )}
      <Card className="mt-6">
        <div className="flex flex-wrap gap-3">
          {d.external_url && <ButtonLink href={d.external_url} target="_blank" rel="noopener"><ExternalLink className="h-4 w-4" /> Ouvrir le lien</ButtonLink>}
          {downloadUrl && <ButtonLink href={downloadUrl} variant="secondary"><Download className="h-4 w-4" /> Télécharger</ButtonLink>}
          {viewUrl && !downloadUrl && <span className="text-sm text-ink-500">Consultation en ligne uniquement (téléchargement non autorisé).</span>}
        </div>
        {viewUrl && (
          <div className="mt-4">
            {isPdf && <iframe src={`${viewUrl}#toolbar=${d.is_downloadable ? 1 : 0}`} title={d.title} loading="lazy" className="h-[70vh] w-full rounded-xl border border-sand-300" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {isImage && <img src={viewUrl} alt={d.title} loading="lazy" className="w-full rounded-xl" />}
            {isAudio && <audio src={viewUrl} controls preload="none" className="w-full" />}
            {isVideo && <video src={viewUrl} controls preload="none" className="w-full rounded-xl" />}
          </div>
        )}
        <p className="mt-4 text-xs text-ink-400">Ajouté le {formatDate(d.created_at)}</p>
      </Card>
    </div>
  );
}
