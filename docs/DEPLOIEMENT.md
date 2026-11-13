# Déploiement

## 1. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) (région proche de vos apprenants,
   par exemple `eu-west-3` Paris).
2. Appliquez les migrations, dans l’ordre :
   ```bash
   npx supabase link --project-ref <ref-du-projet>
   npx supabase db push
   ```
   (ou collez successivement les fichiers de `supabase/migrations/` dans l’éditeur SQL.)
3. Chargez les données initiales : `supabase/seed.sql` (éditeur SQL ou `psql`).
4. **Premier administrateur** — avant de vous inscrire :
   ```sql
   update public.platform_settings set value = '["vous@exemple.org"]'
   where key = 'admin_bootstrap_emails';
   ```
   Après la création de l’équipe, videz cette liste depuis *Administration → Paramètres*.
5. *Authentication → URL Configuration* :
   - Site URL : `https://votre-domaine` (ou l’URL Vercel)
   - Redirect URLs : `https://votre-domaine/auth/callback`, `https://votre-domaine/auth/confirmer`
6. *Authentication → Email Templates* : copiez les modèles français de `supabase/templates/`
   (confirmation, réinitialisation, invitation). Ils pointent vers `/auth/confirmer?token_hash=…`.

### E-mails avec Brevo (recommandé)

Le service d’e-mails intégré de Supabase est très limité. Dans *Project Settings → Auth → SMTP* :

| Champ | Valeur |
|---|---|
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| User | votre identifiant SMTP Brevo |
| Password | votre clé SMTP Brevo (*Brevo → SMTP & API*) |
| Sender | une adresse d’un domaine vérifié dans Brevo |

## 2. Vercel

1. Importez le dépôt GitHub dans Vercel (framework détecté : Next.js).
2. Variables d’environnement (Production et Preview) :

| Variable | Où la trouver | Exposée au navigateur ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | oui (publique) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (clé `anon`/publishable) | oui (publique, protégée par la RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (`service_role`) | **non — serveur uniquement** |
| `NEXT_PUBLIC_SITE_URL` | votre domaine, ex. `https://karang-dulaa.vercel.app` | oui |
| `ANTHROPIC_API_KEY` | console.anthropic.com | **non — serveur uniquement** |
| `DULAA_AI_MODEL` | facultatif (défaut `claude-opus-5-5`) | non |

`SUPABASE_SERVICE_ROLE_KEY` sert uniquement à inviter des enseignants et à supprimer un compte à la
demande de son titulaire ; sans elle, ces deux actions affichent une consigne alternative.

3. Déployez. Les en-têtes de sécurité (HSTS, X-Frame-Options, Permissions-Policy limitant le micro
   au site) sont définis dans `next.config.ts`.

## 3. Vérifications après déploiement

- [ ] Inscription → e-mail reçu (Brevo) → lien → tableau de bord.
- [ ] Le compte d’amorçage voit « Administration ».
- [ ] Nommer un enseignant ; il crée un cours ; l’admin le valide dans *Administration → Cours*.
- [ ] Un apprenant s’inscrit au cours de démonstration, termine une leçon, réussit un quiz.
- [ ] *Administration → Import documentaire* : importer un PDF, vérifier des candidats, enregistrer en brouillon.
- [ ] DULAA AI répond et cite ses sources (si `ANTHROPIC_API_KEY` est définie).

## 4. Sauvegardes et exploitation

- Supabase effectue des sauvegardes quotidiennes (plans payants : restauration à un instant donné).
  Exportez aussi régulièrement le dictionnaire validé :
  `pg_dump --data-only -t public.dictionary_entries -t public.dictionary_examples -t public.dictionary_sources`.
- Les ouvrages importés restent dans le compartiment privé `sources`.
- Le *journal d’activité* (Administration) trace les opérations sensibles : rôles, cours,
  dictionnaire, sources, paramètres, certificats, documents, imports.
- Limite d’upload : le plan gratuit Supabase plafonne les fichiers à 50 Mo (configurable sur les plans payants).

## 5. Développement local

```bash
npm install
cp .env.example .env.local
npm run dev
npm run db:test      # nécessite les binaires PostgreSQL (initdb, pg_ctl, psql)
```
