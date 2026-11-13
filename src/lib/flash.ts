/** Construit une URL de retour portant un message (?ok= / ?erreur=). */
export function withFlash(path: string, kind: "ok" | "erreur", message: string) {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete("ok");
  params.delete("erreur");
  params.set(kind, message);
  return `${base}?${params.toString()}`;
}

/** Traduit les erreurs PostgreSQL/Supabase en messages compréhensibles. */
export function humanError(error: { message?: string; code?: string } | null | undefined, fallback = "Une erreur est survenue.") {
  if (!error) return fallback;
  const m = error.message ?? "";
  if (error.code === "23505") return "Cet élément existe déjà (doublon).";
  if (error.code === "42501" || /row-level security|permission denied/i.test(m)) return "Vous n'avez pas l'autorisation d'effectuer cette action.";
  if (error.code === "23503") return "Cet élément est lié à d'autres données.";
  if (error.code === "23514") return "Une valeur saisie n'est pas valide.";
  // messages métier levés par nos fonctions SQL (en français)
  if (m && m.length < 200 && !/syntax|relation|column/i.test(m)) return m;
  return fallback;
}
