# Architecture de KARANG-DULAA

## Vue d’ensemble

```
Navigateur (mobile d’abord, HTML rendu côté serveur, JS minimal)
   │  formulaires → Server Actions (fonctionnent même avec peu de JavaScript)
   ▼
Next.js 15 sur Vercel ──────────────► API Claude (DULAA AI, clé côté serveur uniquement)
   │  @supabase/ssr : session en cookies, client lié à l’utilisateur
   ▼
Supabase
   ├─ Auth (e-mail + mot de passe, invitations, SMTP Brevo)
   ├─ PostgreSQL + Row Level Security  ← toutes les autorisations sont ici
   │     └─ fonctions SECURITY DEFINER pour les écritures sensibles
   └─ Storage (6 compartiments, politiques par rôle)
```

**Principe de sécurité :** l’interface ne fait que refléter les droits ; c’est la base de données qui
les impose. Un utilisateur qui appelle directement l’API Supabase avec sa clé publique ne peut rien
faire de plus que dans l’interface.

## Arborescence

```
src/
  app/                    pages (App Router) — une page = un espace
    academie/             catalogue, cours, leçons, questions & échanges
    exercices/  devoirs/  lecteur de quiz, remise de devoirs
    dictionnaire/         recherche, fiche, favoris & historique, propositions
    prononciation/ cartes/ bibliotheque/ assistant/ (+ api/assistant)
    tableau-de-bord/ profil/ notifications/ classement/ certificats/
    enseignant/           espace enseignant (layout protégé par rôle)
    admin/                back-office (layout protégé par rôle)
  components/             UI (ui/), rendu des blocs de leçon, lecteurs, formulaires
  lib/
    supabase/             clients serveur, navigateur, middleware, service (admin)
    auth.ts               utilisateur courant, garde-fous requireUser/Staff/Admin
    import/               extraction (PDF, DOCX, TXT, CSV) + structuration lexicale
    ai/                   consignes de DULAA AI, extraction de termes, contexte RAG
supabase/
  migrations/             schéma, sécurité, logique, stockage, recherche
  seed.sql                configuration + extraits sourcés + cours de démonstration
  templates/              e-mails d’authentification en français
tests/                    tests SQL (RLS) et unitaires (import)
```

## Rôles et permissions

| Rôle | Peut |
|---|---|
| Visiteur | Voir l’accueil, le catalogue, les leçons d’aperçu, les entrées de sources aux droits vérifiés, vérifier un certificat. |
| Apprenant (`student`, rôle par défaut) | S’inscrire aux cours publiés, lire leurs contenus, faire exercices et devoirs, consulter tout le dictionnaire publié, proposer des mots, gérer favoris, enregistrements, profil. |
| Enseignant (`teacher`) | Gérer **ses** cours (responsable, créateur ou co-enseignant) : contenu, exercices, devoirs, notes, annonces ; voir uniquement les apprenants inscrits à ses cours ; importer audio et documents ; valider des propositions lexicales. Sa publication passe par la validation d’un admin, sauf droit « publie sans validation ». |
| Administrateur (`admin`) | Tout, y compris rôles, validation des cours, dictionnaire, import documentaire, sources et droits, paramètres, journal. Ne peut pas se retirer son propre rôle ni suspendre son propre compte. |

Les rôles sont dans `users_roles` (un utilisateur peut cumuler) ; les fonctions `is_admin()`,
`is_teacher()`, `can_manage_course()`, `is_enrolled()`, `can_read_course_content()`,
`teaches_student()` sont utilisées par toutes les politiques RLS.

Écritures protégées par des fonctions (jamais en accès direct) : progression (`complete_lesson`,
`record_study_time`), correction (`submit_quiz_attempt`), cartes (`review_flashcard`), XP et badges
(internes), certificats (`issue_certificate`), modération (`review_course`,
`review_lexical_submission`). Les colonnes sensibles de `profiles` (XP, niveau, statut) ne sont pas
modifiables par l’utilisateur (droits de colonnes + déclencheurs).

## Modèle de données (tables principales)

- **Utilisateurs :** `profiles`, `users_roles`, `teachers`, `students`
- **LMS :** `course_categories`, `courses`, `course_teachers`, `course_modules`, `lessons`,
  `lesson_contents` (blocs JSON typés), `enrollments`, `lesson_progress`, `daily_activity`
- **Dictionnaire :** `dictionary_sources`, `dictionary_entries` (formes normalisées générées +
  index trigrammes), `dictionary_examples`, `vocabulary_categories`, `dictionary_entry_categories`,
  `dictionary_favorites`, `search_history`, `lexical_submissions`, `flashcard_reviews`
- **Évaluations :** `exercises`, `questions`, `answers`, `quiz_attempts`, `grades`, `assignments`,
  `assignment_submissions`
- **Médias :** `audio_resources`, `pronunciation_recordings`, `documents`
- **Communication :** `announcements`, `notifications`, `course_questions`,
  `course_question_replies`, `testimonials`
- **Motivation :** `achievements`, `student_achievements`, `xp_events`, `certificates`
- **Import / IA / admin :** `import_jobs`, `import_items`, `ai_conversations`, `ai_messages`,
  `platform_settings`, `audit_logs`

### Recherche dans le dictionnaire

`kd_fold()` (immuable) produit une forme de recherche : minuscules, sans diacritiques tonals,
ŋ/ñ → n, ɛ → e, ɔ → o. Les colonnes générées `headword_fold`, `variants_fold`, `translation_fold`
sont indexées en trigrammes (`pg_trgm`) pour la recherche partielle, et en B-tree pour l’ordre
alphabétique. **L’orthographe affichée n’est jamais modifiée** ; seule la recherche est tolérante.

### Stockage

| Compartiment | Accès |
|---|---|
| `public-media` | public en lecture ; écriture par le personnel ; avatars dans `avatars/{uid}/` |
| `course-files` | lecture si un document ou un bloc de leçon *visible par l’utilisateur* y fait référence |
| `audio` | lecture si une ressource audio publiée y fait référence |
| `sources` | administrateurs uniquement (ouvrages importés) |
| `recordings`, `submissions` | dossier personnel `{uid}/…` ; les enseignants lisent les copies de leurs cours |

Tous les fichiers privés sont servis par URL signées d’une heure. Types MIME et tailles sont
contrôlés à la fois par les compartiments et par le serveur.

## DULAA AI (RAG)

1. Les termes de la question sont extraits (`lib/ai/prompt.ts`).
2. `search_knowledge()` (SECURITY INVOKER → RLS de l’utilisateur) cherche dans le dictionnaire
   publié et dans les leçons des cours **auxquels l’utilisateur a accès**.
3. Les extraits numérotés [S1…] sont fournis au modèle avec des consignes strictes : citer, séparer
   documenté et suggéré, ne jamais inventer de règle ni présenter une traduction incertaine comme
   sûre, respecter l’orthographe de chaque source.
4. Réponse en streaming (NDJSON), historisée avec la liste des sources consultées.

Modèle : `DULAA_AI_MODEL` (défaut `claude-opus-5-5`), avec repli serveur en cas de refus.
Limite : 40 messages / heure / utilisateur. Sans `ANTHROPIC_API_KEY`, l’interface l’indique.

## Import documentaire

1. Le navigateur dépose le fichier dans `sources/imports/…` (privé).
2. Le serveur extrait le texte (`unpdf`, `mammoth`, `papaparse`), détecte les pages (y compris les
   marqueurs « p. N/M »), les titres de sections, puis propose des **candidats** « entrée :
   traduction » avec leurs exemples (`lib/import/parse.ts`, optimisation du point de coupure
   français/mandinka et repérage de la notation tonale). Sur l’extrait disponible de Creissels
   (p. 5-80), environ 1 300 entrées et 1 500 exemples sont proposés.
3. Chaque candidat conserve son texte source intact et un indice de confiance ; l’administrateur
   corrige, approuve ou rejette (individuellement ou par seuil).
4. L’enregistrement crée les entrées (brouillon, à valider ou publiées), rattachées à la source et à
   la page, en ignorant les doublons. Rien n’est publié sans action humaine.

## Performance et connexions lentes

Rendu serveur, aucune police téléchargée, ~105–125 ko de JavaScript au premier chargement,
médias en `preload="none"` / `loading="lazy"`, formulaires utilisables sans JavaScript, états de
chargement et pages d’erreur dédiés.
