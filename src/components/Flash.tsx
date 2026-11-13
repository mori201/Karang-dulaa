import { Alert } from "@/components/ui";

/** Message de confirmation / d'erreur transmis par ?ok= ou ?erreur= après une action. */
export function Flash({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const ok = typeof searchParams.ok === "string" ? searchParams.ok : null;
  const err = typeof searchParams.erreur === "string" ? searchParams.erreur : null;
  if (!ok && !err) return null;
  return (
    <div className="mb-4 space-y-2">
      {ok && <Alert tone="success">{ok}</Alert>}
      {err && <Alert tone="error">{err}</Alert>}
    </div>
  );
}
