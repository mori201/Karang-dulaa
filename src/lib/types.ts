export type AppRole = "admin" | "teacher" | "student";
export type CourseLevel = "debutant" | "intermediaire" | "avance";
export type ContentStatus = "draft" | "pending_review" | "published" | "archived";
export type EntryStatus = "draft" | "pending_review" | "published" | "rejected";
export type QuestionType =
  | "mcq" | "multi" | "true_false" | "fill_blank" | "word_order" | "translation" | "matching" | "dictation" | "short_answer";
export type ExerciseKind =
  | "exercise" | "quiz" | "module_test" | "final_exam" | "vocabulary" | "grammar" | "comprehension" | "reading";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  first_name: string;
  avatar_url: string | null;
  bio: string | null;
  level: CourseLevel;
  xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  weekly_goal_minutes: number;
  daily_goal_xp: number;
  show_in_leaderboard: boolean;
  recording_consent: boolean;
  is_active: boolean;
  last_lesson_id: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_url: string | null;
  level: CourseLevel;
  category_id: string | null;
  objectives: string[];
  estimated_minutes: number | null;
  teacher_id: string | null;
  status: ContentStatus;
  certificate_enabled: boolean;
  certificate_min_score: number;
  is_demo: boolean;
  review_notes: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  summary: string | null;
  position: number;
  estimated_minutes: number | null;
  is_preview: boolean;
  is_demo: boolean;
}

export interface LessonBlock {
  id: string;
  lesson_id: string;
  position: number;
  block_type: BlockType;
  data: Record<string, unknown>;
}

export type BlockType =
  | "heading" | "paragraph" | "vocabulary" | "table" | "image" | "audio" | "video"
  | "file" | "dialogue" | "example" | "note" | "exercise_link" | "assignment_link";

export interface DictionaryEntry {
  id: string;
  headword: string;
  variants: string[];
  translation_fr: string;
  definition: string | null;
  part_of_speech: string | null;
  pronunciation: string | null;
  tone_notes: string | null;
  notes: string | null;
  regional_variant: string | null;
  orthography: "creissels_2012" | "drame_2003" | "karang_dulaa" | "autre";
  source_id: string | null;
  source_page: string | null;
  audio_id: string | null;
  status: EntryStatus;
  is_demo: boolean;
  created_at: string;
}

export interface DictionarySource {
  id: string;
  slug: string;
  title: string;
  author: string;
  year: number | null;
  publisher: string | null;
  url: string | null;
  orthography_notes: string | null;
  rights_status: "verified" | "to_verify" | "restricted";
  rights_notes: string | null;
  public_display: boolean;
}

export interface StudentExercise {
  id: string;
  title: string;
  description: string | null;
  kind: ExerciseKind;
  difficulty: number;
  pass_score: number;
  max_attempts: number | null;
  attempts_used: number;
  course_id: string;
  lesson_id: string | null;
  questions: {
    id: string;
    type: QuestionType;
    prompt: string;
    points: number;
    audio_id: string | null;
    options: { id: string; content: string }[];
    match_choices: string[];
    tokens: string[];
  }[];
}

export interface AttemptResult {
  attempt_id: string;
  score: number;
  points: number;
  max_points: number;
  passed: boolean;
  pass_score: number;
  first_pass: boolean;
  results: {
    question_id: string;
    correct: boolean;
    points: number;
    max_points: number;
    expected: unknown;
    given: unknown;
    explanation: string | null;
  }[];
}
