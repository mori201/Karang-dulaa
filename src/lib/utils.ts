import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ContentStatus, CourseLevel, ExerciseKind, QuestionType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const LEVEL_LABELS: Record<CourseLevel, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Brouillon",
  pending_review: "En attente de validation",
  published: "Publié",
  archived: "Archivé",
};

export const EXERCISE_KIND_LABELS: Record<ExerciseKind, string> = {
  exercise: "Exercice",
  quiz: "Quiz",
  module_test: "Contrôle de module",
  final_exam: "Évaluation finale",
  vocabulary: "Évaluation de vocabulaire",
  grammar: "Évaluation grammaticale",
  comprehension: "Compréhension",
  reading: "Lecture",
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Choix unique",
  multi: "Choix multiples",
  true_false: "Vrai / Faux",
  fill_blank: "Compléter la phrase",
  word_order: "Remettre les mots dans l'ordre",
  translation: "Traduction",
  matching: "Association mot / traduction",
  dictation: "Dictée (audio)",
  short_answer: "Réponse courte",
};

export const POS_LABELS: Record<string, string> = {
  nom: "nom", verbe: "verbe", adjectif: "adjectif", adverbe: "adverbe", pronom: "pronom",
  postposition: "postposition", conjonction: "conjonction", interjection: "interjection",
  numeral: "numéral", determinant: "déterminant", particule: "particule", locution: "locution",
  expression: "expression", autre: "autre",
};

export const ORTHOGRAPHY_LABELS: Record<string, string> = {
  creissels_2012: "Notation Creissels (2012) — tons notés",
  drame_2003: "Notation Dramé (2003)",
  karang_dulaa: "Saisie KARANG-DULAA",
  autre: "Autre convention",
};

/** Normalisation identique à public.kd_fold (recherche sans diacritiques). */
export function fold(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[ŋñɲ]/g, "n")
    .replace(/ɛ/g, "e")
    .replace(/ɔ/g, "o")
    .replace(/[’'ˋ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(input: string) {
  return fold(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "cours";
}

export function formatDate(d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "long" }) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", opts).format(new Date(d));
}

export function formatDuration(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, "0")}`;
}

/** Niveau de progression (gamification) dérivé de l'XP. */
export function xpLevel(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const current = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  return { level, current, next, progress: Math.min(100, Math.round(((xp - current) / (next - current)) * 100)) };
}

export function displayName(p: { first_name?: string | null; full_name?: string | null; email?: string | null }) {
  return p.first_name || p.full_name?.split(" ")[0] || p.email?.split("@")[0] || "Apprenant";
}

/** Garde les redirections internes uniquement (évite les redirections ouvertes). */
export function safeNext(next: string | null | undefined, fallback = "/tableau-de-bord") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export function str(v: FormDataEntryValue | null | undefined) {
  return typeof v === "string" ? v.trim() : "";
}
