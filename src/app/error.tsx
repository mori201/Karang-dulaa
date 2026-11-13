"use client";
import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="container-kd max-w-xl py-16">
      <EmptyState icon={<TriangleAlert className="h-12 w-12" />} title="Une erreur est survenue"
        description={<>Le contenu n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.{error.digest && <span className="mt-2 block font-mono text-xs">Réf. : {error.digest}</span>}</>}
        action={<Button onClick={reset}><RefreshCw className="h-4 w-4" /> Réessayer</Button>} />
    </div>
  );
}
