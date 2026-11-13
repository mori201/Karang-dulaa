# KARANG-DULAA — L’école virtuelle de la langue mandinka

> « Apprendre le mandinka, préserver notre héritage. »

Plateforme éducative complète (LMS) pour apprendre le mandinka : cours structurés, dictionnaire
mandinka ⇄ français sourcé, exercices corrigés côté serveur, laboratoire de prononciation, cartes
mémoire, bibliothèque, certificats vérifiables et assistant pédagogique **DULAA AI**.

**Stack :** Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS ·
Supabase (PostgreSQL, Auth, Storage, Row Level Security) · API Claude (Anthropic) · Vercel.

---

## Ce qui fonctionne aujourd’hui

| Espace | Fonctionnalités |
|---|---|
| **Accueil** | Présentation, chiffres réels de l’école (base de données), cours publiés, enseignants publics, témoignages validés uniquement, FAQ. |
| **Authentification** | Inscription (consentement RGPD), connexion, confirmation d’e-mail, mot de passe oublié, invitation des enseignants, déconnexion, suppression du compte. |
| **Académie** | Catalogue filtrable, page de cours (objectifs, programme, annonces, ressources), inscription/désinscription, leçons d’aperçu, lecteur de leçon avec sommaire, « Terminer et continuer », temps d’étude mesuré, questions & échanges par cours. |
| **Exercices** | 9 types : choix unique, choix multiples, vrai/faux, compléter, remettre en ordre, traduction (deux sens), association, dictée (audio), réponse courte. Correction **côté serveur** (les solutions ne sont jamais envoyées au navigateur avant validation), explications, score, tentatives limitées, niveaux de difficulté. |
| **Devoirs** | Remise de texte et de fichier, correction et note par l’enseignant, notification. |
| **Dictionnaire** | Recherche instantanée mandinka/français, partielle, avec ou sans tons (ŋ/ñ tolérés), alphabétique (ordre ŋ, m, n, ñ), filtres grammaticaux et thématiques, fiche complète (variantes, exemples traduits, source + page, convention d’écriture, audio), mots associés, favoris, historique, propositions communautaires validées par un enseignant. |
| **Prononciation** | Écoute, réécoute, ralentissement ×0,75 / ×0,5, enregistrement de sa voix (consentement explicite, stockage privé facultatif) pour comparer **à l’oreille** — aucune note automatique n’est prétendue. |
| **Cartes mémoire** | Répétition espacée (SM-2) depuis les favoris, le vocabulaire des cours suivis ou un thème ; sens mandinka→français et inverse. |
| **DULAA AI** | Chat en streaming, recherche documentaire (RAG) dans le dictionnaire et les leçons accessibles à l’utilisateur, citation des sources [S1]…, distinction « 📘 Documenté » / « 💡 Suggestion », historique, limitation d’usage. |
| **Gamification** | XP, niveaux, séries de jours, objectifs hebdomadaire et quotidien, défis de la semaine, 7 badges, classement **facultatif** (opt-in). |
| **Certificats** | Délivrés automatiquement si les critères de l’enseignant sont remplis ; identifiant unique, QR code, page de vérification publique, impression/PDF. |
| **Espace enseignant** | Création de cours, modules, leçons ; **éditeur de blocs** (titres, paragraphes, vocabulaire, exemples, dialogues, tableaux, encadrés, images, audio, vidéo, PDF/Word, liens d’exercice et de devoir) ; constructeur de quiz ; suivi des apprenants et des résultats ; correction des devoirs ; annonces ; import audio ; bibliothèque ; validation des propositions de mots. |
| **Administration** | Statistiques, utilisateurs et rôles, invitation d’enseignants, suspension, validation des cours, enseignants responsables et co-enseignants, gestion complète du dictionnaire, **import documentaire intelligent** (PDF/DOCX/TXT/CSV), sources et droits, catégories, témoignages, paramètres et interrupteurs de fonctionnalités, journal d’audit. |

**Pas encore disponible (phase 4, non simulé dans l’interface) :** application mobile native, mode hors
connexion, cours en direct, communauté d’apprenants élargie.

---

## Démarrage rapide

```bash
npm install
cp .env.example .env.local      # renseigner les clés Supabase (et Anthropic si besoin)
npm run dev                     # http://localhost:3000
```

Base de données : appliquer les migrations puis le seed (voir [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md)) :

```bash
npx supabase link --project-ref <ref>
npx supabase db push            # migrations de supabase/migrations
psql "$DATABASE_URL" -f supabase/seed.sql
```

Premier administrateur : avant de créer votre compte, ajoutez votre e-mail dans
`platform_settings.admin_bootstrap_emails` (SQL ci-dessous), puis inscrivez-vous.

```sql
update public.platform_settings set value = '["vous@exemple.org"]' where key = 'admin_bootstrap_emails';
```

## Tests

```bash
npm run db:test     # migrations + seed + 62 assertions RLS / logique sur un PostgreSQL jetable
npm test            # tests unitaires de l’extraction documentaire
npm run typecheck && npm run build
```

`scripts/test-db.sh` émule le minimum de Supabase (rôles `anon`/`authenticated`, `auth.uid()`,
schéma `storage`) et vérifie notamment : un élève ne peut ni s’attribuer de l’XP ou un rôle, ni lire
les réponses des quiz, ni voir les données d’un autre élève ; un enseignant ne modifie que ses cours
et ne publie pas sans validation ; la correction, les badges, le certificat et la recherche RAG
fonctionnent.

## Documentation

- [Architecture et modèle de données](docs/ARCHITECTURE.md)
- [Déploiement : Supabase, Vercel, e-mails (Brevo), IA](docs/DEPLOIEMENT.md)
- [Sources, conventions d’écriture et droits d’auteur](docs/DROITS-ET-SOURCES.md)

## Données de démonstration

Le cours **« Initiation au mandinka »** (3 modules, 11 leçons, 4 évaluations, 1 devoir) est marqué
`is_demo` et affiché comme tel. Ses contenus citent leurs sources mais **doivent être validés par
l’équipe pédagogique et des locuteurs compétents**. Les 52 entrées initiales du dictionnaire sont des
extraits saisis à la main depuis Creissels (2012), avec page, orthographe et tons d’origine.
