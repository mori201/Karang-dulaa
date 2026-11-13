-- =====================================================================
-- KARANG-DULAA — Schéma principal
-- École virtuelle de la langue mandinka
-- =====================================================================
-- Conventions :
--  * Toutes les tables sont dans le schéma public, protégées par RLS
--    (voir 20261113000002_security.sql).
--  * Les données linguistiques gardent TOUJOURS leur orthographe source :
--    la colonne `orthography` indique la convention (Creissels 2012,
--    Dramé 2003, KARANG-DULAA). Aucune fusion automatique n'est faite.
--  * Les champs *_fold sont des formes normalisées (minuscules, sans
--    diacritiques tonals) utilisées UNIQUEMENT pour la recherche.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Normalisation pour la recherche (immutable pour les index)
-- á à â ǎ → a ; ŋ → n ; ñ → n ; ɛ → e ; ɔ → o ; apostrophes supprimées
-- ---------------------------------------------------------------------
create or replace function public.kd_fold(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(
           translate(
             lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(input, ''))),
             'ŋñɲɛɔ’''ˋ',
             'nnneo'
           ),
           '\s+', ' ', 'g'
         );
$$;

create or replace function public.kd_fold_array(input text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select public.kd_fold(array_to_string(coalesce(input, '{}'::text[]), ' '));
$$;

-- ---------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------
create type public.app_role as enum ('admin', 'teacher', 'student');
create type public.content_status as enum ('draft', 'pending_review', 'published', 'archived');
create type public.course_level as enum ('debutant', 'intermediaire', 'avance');
create type public.entry_status as enum ('draft', 'pending_review', 'published', 'rejected');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.question_type as enum (
  'mcq',          -- choix unique
  'multi',        -- choix multiples
  'true_false',
  'fill_blank',   -- compléter la phrase
  'word_order',   -- remettre les mots dans l'ordre
  'translation',  -- traduction (mandinka→français ou inverse)
  'matching',     -- association mot / traduction
  'dictation',    -- dictée (audio → texte)
  'short_answer'
);
create type public.exercise_kind as enum (
  'exercise', 'quiz', 'module_test', 'final_exam', 'vocabulary', 'grammar', 'comprehension', 'reading'
);
create type public.doc_visibility as enum ('public', 'enrolled', 'staff', 'private');

-- ---------------------------------------------------------------------
-- Utilisateurs, rôles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  first_name text not null default '',
  avatar_url text,
  bio text,
  level public.course_level not null default 'debutant',
  xp integer not null default 0 check (xp >= 0),
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  weekly_goal_minutes integer not null default 60 check (weekly_goal_minutes between 10 and 1200),
  daily_goal_xp integer not null default 20 check (daily_goal_xp between 5 and 500),
  show_in_leaderboard boolean not null default false,
  recording_consent boolean not null default false,
  is_active boolean not null default true,
  last_lesson_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.teachers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  title text,
  bio text,
  specialties text[] not null default '{}',
  is_public boolean not null default true,
  -- si false, les cours de l'enseignant passent par une validation admin
  can_publish_directly boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.students (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  native_language text,
  learning_goal text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Cours (LMS)
-- ---------------------------------------------------------------------
create table public.course_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 200),
  description text not null default '',
  cover_url text,
  level public.course_level not null default 'debutant',
  category_id uuid references public.course_categories (id) on delete set null,
  objectives text[] not null default '{}',
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  teacher_id uuid references public.profiles (id) on delete set null,
  status public.content_status not null default 'draft',
  certificate_enabled boolean not null default false,
  certificate_min_score integer not null default 70 check (certificate_min_score between 0 and 100),
  is_demo boolean not null default false,
  review_notes text,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_status_idx on public.courses (status);
create index courses_teacher_idx on public.courses (teacher_id);

-- co-enseignants autorisés
create table public.course_teachers (
  course_id uuid not null references public.courses (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  primary key (course_id, teacher_id)
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index course_modules_course_idx on public.course_modules (course_id, position);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  summary text,
  position integer not null default 0,
  estimated_minutes integer,
  is_preview boolean not null default false, -- consultable sans inscription
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_module_idx on public.lessons (module_id, position);
create index lessons_course_idx on public.lessons (course_id);

alter table public.profiles
  add constraint profiles_last_lesson_fk foreign key (last_lesson_id) references public.lessons (id) on delete set null;

-- Blocs de contenu de leçon (éditeur pédagogique riche)
create table public.lesson_contents (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position integer not null default 0,
  block_type text not null check (block_type in (
    'heading', 'paragraph', 'vocabulary', 'table', 'image', 'audio', 'video',
    'file', 'dialogue', 'example', 'note', 'exercise_link', 'assignment_link'
  )),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lesson_contents_lesson_idx on public.lesson_contents (lesson_id, position);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'dropped', 'suspended')),
  progress_percent numeric(5, 2) not null default 0,
  last_lesson_id uuid references public.lessons (id) on delete set null,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, student_id)
);
create index enrollments_student_idx on public.enrollments (student_id);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  time_spent_seconds integer not null default 0,
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (lesson_id, student_id)
);
create index lesson_progress_student_idx on public.lesson_progress (student_id, last_viewed_at desc);

-- Activité quotidienne (temps d'apprentissage, objectifs, séries)
create table public.daily_activity (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  seconds integer not null default 0,
  xp integer not null default 0,
  lessons_completed integer not null default 0,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------
-- Dictionnaire
-- ---------------------------------------------------------------------
create table public.dictionary_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  author text not null,
  year integer,
  publisher text,
  url text,
  orthography_notes text,
  rights_status text not null default 'to_verify' check (rights_status in ('verified', 'to_verify', 'restricted')),
  rights_notes text,
  public_display boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.vocabulary_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.audio_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'word' check (kind in ('word', 'phrase', 'dialogue', 'text', 'other')),
  transcript text,          -- texte mandinka, orthographe de l'enregistrement
  translation_fr text,
  storage_path text not null,
  mime_type text,
  duration_seconds numeric(8, 2),
  speaker_name text,
  speaker_region text,
  speaker_consent boolean not null default false,
  course_id uuid references public.courses (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  status public.content_status not null default 'published',
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index audio_resources_lesson_idx on public.audio_resources (lesson_id);

create table public.dictionary_entries (
  id uuid primary key default gen_random_uuid(),
  headword text not null,                    -- forme exacte de la source (tons, ŋ, ñ, voyelles longues)
  variants text[] not null default '{}',     -- variantes attestées
  translation_fr text not null,
  definition text,
  part_of_speech text check (part_of_speech is null or part_of_speech in (
    'nom', 'verbe', 'adjectif', 'adverbe', 'pronom', 'postposition', 'conjonction',
    'interjection', 'numeral', 'determinant', 'particule', 'locution', 'expression', 'autre'
  )),
  pronunciation text,
  tone_notes text,
  notes text,
  regional_variant text,
  orthography text not null default 'karang_dulaa' check (orthography in ('creissels_2012', 'drame_2003', 'karang_dulaa', 'autre')),
  source_id uuid references public.dictionary_sources (id) on delete restrict,
  source_page text,
  audio_id uuid references public.audio_resources (id) on delete set null,
  status public.entry_status not null default 'draft',
  is_demo boolean not null default false,
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  headword_fold text generated always as (public.kd_fold(headword)) stored,
  variants_fold text generated always as (public.kd_fold_array(variants)) stored,
  translation_fold text generated always as (public.kd_fold(translation_fr)) stored,
  -- les données issues d'une source doivent référencer la page
  constraint dictionary_entries_source_page_chk check (source_id is null or source_page is not null)
);
create index dictionary_entries_headword_trgm on public.dictionary_entries using gin (headword_fold extensions.gin_trgm_ops);
create index dictionary_entries_variants_trgm on public.dictionary_entries using gin (variants_fold extensions.gin_trgm_ops);
create index dictionary_entries_translation_trgm on public.dictionary_entries using gin (translation_fold extensions.gin_trgm_ops);
create index dictionary_entries_alpha_idx on public.dictionary_entries (headword_fold);
create index dictionary_entries_status_idx on public.dictionary_entries (status);
create index dictionary_entries_pos_idx on public.dictionary_entries (part_of_speech);
create index dictionary_entries_source_idx on public.dictionary_entries (source_id);

create table public.dictionary_examples (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.dictionary_entries (id) on delete cascade,
  mandinka text not null,
  french text,
  source_page text,
  position integer not null default 0
);
create index dictionary_examples_entry_idx on public.dictionary_examples (entry_id, position);

create table public.dictionary_entry_categories (
  entry_id uuid not null references public.dictionary_entries (id) on delete cascade,
  category_id uuid not null references public.vocabulary_categories (id) on delete cascade,
  primary key (entry_id, category_id)
);

create table public.dictionary_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_id uuid not null references public.dictionary_entries (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);

create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  query text not null check (char_length(query) <= 200),
  lang text not null default 'auto' check (lang in ('auto', 'mnk', 'fr')),
  created_at timestamptz not null default now()
);
create index search_history_user_idx on public.search_history (user_id, created_at desc);

create table public.lexical_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  headword text not null check (char_length(headword) between 1 and 120),
  translation_fr text not null check (char_length(translation_fr) between 1 and 500),
  definition text,
  part_of_speech text,
  example_mandinka text,
  example_french text,
  regional_variant text,
  source_info text,          -- d'où vient l'information (locuteur, région, ouvrage)
  status public.review_status not null default 'pending',
  reviewer_id uuid references public.profiles (id) on delete set null,
  review_notes text,
  reviewed_at timestamptz,
  created_entry_id uuid references public.dictionary_entries (id) on delete set null,
  created_at timestamptz not null default now()
);
create index lexical_submissions_status_idx on public.lexical_submissions (status, created_at);

-- Révision espacée (cartes mémoire)
create table public.flashcard_reviews (
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_id uuid not null references public.dictionary_entries (id) on delete cascade,
  ease numeric(4, 2) not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  primary key (user_id, entry_id)
);
create index flashcard_reviews_due_idx on public.flashcard_reviews (user_id, due_at);

-- ---------------------------------------------------------------------
-- Exercices, évaluations
-- ---------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid references public.course_modules (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  title text not null,
  description text,
  kind public.exercise_kind not null default 'exercise',
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  pass_score integer not null default 70 check (pass_score between 0 and 100),
  max_attempts integer check (max_attempts is null or max_attempts > 0),
  shuffle_questions boolean not null default false,
  is_published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exercises_course_idx on public.exercises (course_id);
create index exercises_lesson_idx on public.exercises (lesson_id);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position integer not null default 0,
  type public.question_type not null,
  prompt text not null,
  audio_id uuid references public.audio_resources (id) on delete set null,
  explanation text,
  points integer not null default 1 check (points > 0),
  -- options spécifiques : {"tokens": [...]} pour word_order,
  -- {"ignore_tones": true} pour accepter une réponse sans diacritiques, etc.
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index questions_exercise_idx on public.questions (exercise_id, position);

-- Réponses possibles / réponses attendues (jamais exposées aux apprenants
-- avant la validation : lecture via get_exercise_for_student()).
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  position integer not null default 0,
  content text not null,
  is_correct boolean not null default false,
  match_key text   -- pour 'matching' : la traduction associée
);
create index answers_question_idx on public.answers (question_id, position);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  responses jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  points numeric(8, 2) not null default 0,
  max_points numeric(8, 2) not null default 0,
  score numeric(5, 2) not null default 0,
  passed boolean not null default false,
  submitted_at timestamptz not null default now()
);
create index quiz_attempts_student_idx on public.quiz_attempts (student_id, submitted_at desc);
create index quiz_attempts_exercise_idx on public.quiz_attempts (exercise_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  title text not null,
  instructions text not null default '',
  due_at timestamptz,
  max_score integer not null default 20 check (max_score > 0),
  is_published boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  content text,
  file_path text,
  status text not null default 'submitted' check (status in ('submitted', 'graded')),
  score numeric(6, 2),
  feedback text,
  graded_by uuid references public.profiles (id) on delete set null,
  graded_at timestamptz,
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete cascade,
  assignment_id uuid references public.assignments (id) on delete cascade,
  attempt_id uuid references public.quiz_attempts (id) on delete cascade,
  score numeric(6, 2) not null,
  max_score numeric(6, 2) not null,
  feedback text,
  graded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index grades_student_idx on public.grades (student_id, created_at desc);
create index grades_course_idx on public.grades (course_id);

-- ---------------------------------------------------------------------
-- Prononciation
-- ---------------------------------------------------------------------
create table public.pronunciation_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  audio_id uuid references public.audio_resources (id) on delete set null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Bibliothèque
-- ---------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'support' check (category in (
    'support', 'lecture', 'dialogue', 'proverbe', 'fiche', 'grammaire', 'culture', 'reference', 'autre'
  )),
  storage_path text,
  external_url text,
  mime_type text,
  size_bytes bigint,
  course_id uuid references public.courses (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  source_id uuid references public.dictionary_sources (id) on delete set null,
  visibility public.doc_visibility not null default 'staff',
  is_downloadable boolean not null default true,
  rights_note text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  title_fold text generated always as (public.kd_fold(title || ' ' || coalesce(description, ''))) stored,
  constraint documents_target_chk check (storage_path is not null or external_url is not null)
);
create index documents_title_trgm on public.documents using gin (title_fold extensions.gin_trgm_ops);
create index documents_course_idx on public.documents (course_id);

-- ---------------------------------------------------------------------
-- Communication
-- ---------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete cascade, -- null = annonce générale (admin)
  author_id uuid references public.profiles (id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Questions / échanges autour d'un cours (espace de conversation encadré)
create table public.course_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.course_question_replies (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.course_questions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  author_context text,
  content text not null check (char_length(content) between 10 and 1000),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Gamification, certificats
-- ---------------------------------------------------------------------
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  icon text not null default 'award',
  xp_reward integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.student_achievements (
  student_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (student_id, achievement_id)
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index xp_events_user_idx on public.xp_events (user_id, created_at desc);
create unique index xp_events_once_idx on public.xp_events (user_id, reason, ref_id) where ref_id is not null and reason in ('lesson_completed', 'exercise_passed', 'course_completed');

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  student_name text not null,
  course_title text not null,
  level public.course_level not null,
  score numeric(5, 2),
  issued_at timestamptz not null default now(),
  revoked boolean not null default false,
  unique (student_id, course_id)
);

-- ---------------------------------------------------------------------
-- Import documentaire
-- ---------------------------------------------------------------------
create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text not null,
  mime_type text,
  source_id uuid references public.dictionary_sources (id) on delete set null,
  orthography text not null default 'autre',
  status text not null default 'uploaded' check (status in ('uploaded', 'extracted', 'reviewing', 'completed', 'failed')),
  page_count integer,
  char_count integer,
  sections jsonb not null default '[]'::jsonb,   -- titres / sections détectés
  error text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.import_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs (id) on delete cascade,
  page text,
  raw_text text not null,
  headword text,
  translation_fr text,
  part_of_speech text,
  examples jsonb not null default '[]'::jsonb,
  confidence numeric(3, 2) not null default 0.5,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'imported')),
  entry_id uuid references public.dictionary_entries (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index import_items_job_idx on public.import_items (job_id, status);

-- ---------------------------------------------------------------------
-- Assistant DULAA AI
-- ---------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index ai_messages_conv_idx on public.ai_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------
-- Administration
-- ---------------------------------------------------------------------
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------
create or replace function public.kd_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','courses','lessons','lesson_contents','dictionary_entries','exercises','ai_conversations'] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.kd_touch_updated_at()', t, t);
  end loop;
end $$;
