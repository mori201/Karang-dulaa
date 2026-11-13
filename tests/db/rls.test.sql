-- =====================================================================
-- Tests d'intégration : RLS, rôles et logique d'apprentissage.
-- Exécutés par scripts/test-db.sh sur une base jetable.
-- =====================================================================
\set ON_ERROR_STOP 1

create or replace function public.t_assert(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'ÉCHEC : %', msg; end if;
  raise notice 'ok - %', msg;
end $$;
grant execute on function public.t_assert(boolean, text) to anon, authenticated;

-- Simule une session : rôle + utilisateur
create or replace function public.t_expect_error(sql text, msg text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'ok - % (erreur attendue : %)', msg, sqlerrm;
    return;
  end;
  raise exception 'ÉCHEC : % (aucune erreur levée)', msg;
end $$;
grant execute on function public.t_expect_error(text, text) to anon, authenticated;

update public.platform_settings set value = '["admin@test.local"]' where key = 'admin_bootstrap_emails';

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin@test.local', '{"first_name": "Awa", "last_name": "Admin"}'),
  ('00000000-0000-4000-8000-0000000000b1', 'prof@test.local', '{"first_name": "Bakary", "last_name": "Prof"}'),
  ('00000000-0000-4000-8000-0000000000c1', 'eleve1@test.local', '{"first_name": "Coumba", "last_name": "Diatta"}'),
  ('00000000-0000-4000-8000-0000000000c2', 'eleve2@test.local', '{"first_name": "Demba", "last_name": "Sané"}');

select public.t_assert((select count(*) from public.profiles) = 4, 'profils créés automatiquement');
select public.t_assert(exists (select 1 from public.users_roles where user_id = '00000000-0000-4000-8000-0000000000a1' and role = 'admin'), 'amorçage administrateur');
select public.t_assert(not exists (select 1 from public.users_roles where user_id = '00000000-0000-4000-8000-0000000000c1' and role = 'admin'), 'élève non admin');

-- ---------------------------------------------------------------- anon
begin;
set local role anon;
select public.t_assert((select count(*) from public.courses) = 1, 'anon : 1 cours publié visible');
select public.t_assert((select count(*) from public.dictionary_entries) = 0, 'anon : entrées de sources à droits non vérifiés masquées');
select public.t_assert((select count(*) from public.lesson_contents lc join public.lessons l on l.id = lc.lesson_id where not l.is_preview) = 0, 'anon : contenu de leçon non visible');
select public.t_assert((select count(*) from public.lesson_contents lc join public.lessons l on l.id = lc.lesson_id where l.is_preview) > 0, 'anon : leçon d''aperçu visible');
select public.t_assert((select count(*) from public.answers) = 0, 'anon : réponses invisibles');
select public.t_assert((select (public.public_stats() ->> 'courses')::int) = 1, 'anon : statistiques publiques');
select public.t_assert((select count(*) from public.audit_logs) = 0, 'anon : journal invisible');
commit;

-- ---------------------------------------------------------------- admin
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000a1';
insert into public.users_roles (user_id, role, granted_by) values ('00000000-0000-4000-8000-0000000000b1', 'teacher', auth.uid());
select public.t_assert((select (public.admin_stats() ->> 'teachers')::int) = 1, 'admin : rôle enseignant attribué');
delete from public.users_roles where user_id = auth.uid() and role = 'admin';
select public.t_assert((select count(*) from public.users_roles where user_id = auth.uid() and role = 'admin') = 1, 'admin : rôle admin conservé');
commit;
select public.t_assert(exists (select 1 from public.teachers where user_id = '00000000-0000-4000-8000-0000000000b1'), 'fiche enseignant créée');
select public.t_assert(exists (select 1 from public.audit_logs where entity_type = 'users_roles' and action = 'insert'), 'attribution de rôle journalisée');

-- ---------------------------------------------------------------- élève 1
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c1';
select public.t_assert((select count(*) from public.dictionary_entries) >= 50, 'élève : dictionnaire visible une fois connecté');
select public.t_assert((select count(*) from public.answers) = 0, 'élève : table answers inaccessible');
select public.t_expect_error($$select public.get_exercise_for_student('ee000000-0000-4000-8000-000000000001')$$, 'élève non inscrit : exercice refusé');
select public.t_expect_error($$insert into public.users_roles (user_id, role) values (auth.uid(), 'admin')$$, 'élève : auto-promotion admin refusée');
select public.t_expect_error($$update public.profiles set xp = 9999 where id = auth.uid()$$, 'élève : modification directe de l''XP refusée');
select public.t_expect_error($$select public.kd_add_xp(auth.uid(), 9999, 'triche', null)$$, 'élève : fonction interne kd_add_xp inaccessible');
select public.t_expect_error($$select public.kd_notify(auth.uid(), 'x', 'x', 'x', null)$$, 'élève : fonction interne kd_notify inaccessible');
update public.profiles set first_name = 'Coumba', weekly_goal_minutes = 90 where id = auth.uid();
select public.enroll_in_course('c0000000-0000-4000-8000-000000000001');
select public.t_assert((select count(*) from public.lesson_contents) > 20, 'élève inscrit : contenu des leçons visible');
select public.t_assert(not (public.get_exercise_for_student('ee000000-0000-4000-8000-000000000001')::text like '%is_correct%'), 'exercice servi sans les solutions');
commit;

-- Tentative entièrement correcte au quiz des jours
-- (les identifiants des réponses sont lus en tant que postgres pour construire la copie)
select set_config('t.r101', (select id::text from public.answers where question_id = 'aa000000-0000-4000-8000-000000000101' and is_correct), false);
select set_config('t.r104', (select id::text from public.answers where question_id = 'aa000000-0000-4000-8000-000000000104' and is_correct), false);
select set_config('t.m102', (select jsonb_object_agg(id, match_key)::text from public.answers where question_id = 'aa000000-0000-4000-8000-000000000102'), false);
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c1';
select public.t_assert((r ->> 'score')::numeric = 100 and (r ->> 'passed')::boolean, 'quiz corrigé côté serveur : 100 % (réponse sans tons acceptée)')
from (select public.submit_quiz_attempt('ee000000-0000-4000-8000-000000000001', jsonb_build_object(
  'aa000000-0000-4000-8000-000000000101', current_setting('t.r101'),
  'aa000000-0000-4000-8000-000000000102', current_setting('t.m102')::jsonb,
  'aa000000-0000-4000-8000-000000000103', 'bii',
  'aa000000-0000-4000-8000-000000000104', current_setting('t.r104'))) as r) s;
select public.t_assert((r ->> 'score')::numeric = 0 and not (r ->> 'passed')::boolean, 'copie vide : 0 %')
from (select public.submit_quiz_attempt('ee000000-0000-4000-8000-000000000001', '{}'::jsonb) as r) s;
select public.t_assert((select xp from public.profiles where id = auth.uid()) >= 20, 'XP attribuée pour un quiz réussi');
select public.t_assert(exists (select 1 from public.student_achievements sa join public.achievements a on a.id = sa.achievement_id
  where sa.student_id = auth.uid() and a.code = 'first_assessment'), 'badge « Première évaluation réussie »');
-- ordre des mots
select public.t_assert((r ->> 'passed')::boolean, 'remise en ordre des mots corrigée')
from (select public.submit_quiz_attempt('ee000000-0000-4000-8000-000000000003', jsonb_build_object(
  'aa000000-0000-4000-8000-000000000301', jsonb_build_array('a', 'taata', 'mintoo'),
  'aa000000-0000-4000-8000-000000000303', 'jaloo')) as r) s;
commit;

-- Le certificat exige le cours terminé
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c1';
select public.t_expect_error($$select public.issue_certificate('c0000000-0000-4000-8000-000000000001')$$, 'certificat refusé avant la fin du cours');
select public.complete_lesson(id) from public.lessons where course_id = 'c0000000-0000-4000-8000-000000000001';
select public.t_assert((select status from public.enrollments where student_id = auth.uid()) = 'completed', 'cours terminé après toutes les leçons');
select public.t_assert((select progress_percent from public.enrollments where student_id = auth.uid()) = 100, 'progression 100 %');
select public.t_expect_error($$select public.issue_certificate('c0000000-0000-4000-8000-000000000001')$$, 'certificat refusé sans évaluations réussies');
commit;

select set_config('t.r201', (select id::text from public.answers where question_id = 'aa000000-0000-4000-8000-000000000201' and is_correct), false);
select set_config('t.r202', (select jsonb_agg(id)::text from public.answers where question_id = 'aa000000-0000-4000-8000-000000000202' and is_correct), false);
select set_config('t.r203', (select id::text from public.answers where question_id = 'aa000000-0000-4000-8000-000000000203' and is_correct), false);
select set_config('t.r401', (select id::text from public.answers where question_id = 'aa000000-0000-4000-8000-000000000401' and is_correct), false);
select set_config('t.m403', (select jsonb_object_agg(id, match_key)::text from public.answers where question_id = 'aa000000-0000-4000-8000-000000000403'), false);
select set_config('t.r404', (select id::text from public.answers where question_id = 'aa000000-0000-4000-8000-000000000404' and is_correct), false);

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c1';
select public.t_assert((r ->> 'passed')::boolean, 'contrôle du module 1 réussi')
from (select public.submit_quiz_attempt('ee000000-0000-4000-8000-000000000002', jsonb_build_object(
  'aa000000-0000-4000-8000-000000000201', current_setting('t.r201'),
  'aa000000-0000-4000-8000-000000000202', current_setting('t.r202')::jsonb,
  'aa000000-0000-4000-8000-000000000203', current_setting('t.r203'),
  'aa000000-0000-4000-8000-000000000204', 'abarika')) as r) s;
select public.t_assert((r ->> 'passed')::boolean, 'évaluation finale réussie')
from (select public.submit_quiz_attempt('ee000000-0000-4000-8000-000000000004', jsonb_build_object(
  'aa000000-0000-4000-8000-000000000401', current_setting('t.r401'),
  'aa000000-0000-4000-8000-000000000402', 'Manger',
  'aa000000-0000-4000-8000-000000000403', current_setting('t.m403')::jsonb,
  'aa000000-0000-4000-8000-000000000404', current_setting('t.r404'),
  'aa000000-0000-4000-8000-000000000405', 'kúlóo')) as r) s;
select set_config('t.cert', public.issue_certificate('c0000000-0000-4000-8000-000000000001'), false);
select public.t_assert(current_setting('t.cert') like 'KD-%', 'certificat délivré');
select public.t_assert(public.issue_certificate('c0000000-0000-4000-8000-000000000001') = current_setting('t.cert'), 'certificat idempotent');
select public.t_assert(exists (select 1 from public.student_achievements sa join public.achievements a on a.id = sa.achievement_id
  where sa.student_id = auth.uid() and a.code = 'beginner_mastery'), 'badge « Maîtrise du niveau débutant »');
-- cartes mémoire
select public.review_flashcard('e0000000-0000-4000-8000-000000000002', 4);
select public.t_assert((select repetitions from public.flashcard_reviews where user_id = auth.uid()) = 1, 'carte mémoire planifiée');
-- proposition lexicale
insert into public.lexical_submissions (submitted_by, headword, translation_fr, source_info)
values (auth.uid(), 'tenee', 'lundi', 'Ma grand-mère, Sédhiou');
update public.lexical_submissions set status = 'approved';
select public.t_assert((select count(*) from public.lexical_submissions where status = 'approved') = 0, 'proposition toujours en attente');
-- notifications
select public.t_assert((select count(*) from public.notifications) > 0, 'notifications reçues');
commit;

begin;
set local role anon;
select public.t_assert((public.verify_certificate(current_setting('t.cert')) ->> 'valid')::boolean, 'vérification publique du certificat');
select public.t_assert(public.verify_certificate('KD-FAUX') is null, 'certificat inconnu non vérifié');
commit;

-- ---------------------------------------------------------------- élève 2
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c2';
select public.t_assert((select count(*) from public.quiz_attempts) = 0, 'élève 2 : ne voit pas les tentatives des autres');
select public.t_assert((select count(*) from public.profiles where id = '00000000-0000-4000-8000-0000000000c1') = 0, 'élève 2 : profil d''un autre élève masqué');
select public.t_assert((select count(*) from public.lexical_submissions) = 0, 'élève 2 : propositions des autres masquées');
select public.t_assert((select count(*) from public.certificates) = 0, 'élève 2 : certificats des autres masqués');
select public.t_assert((select count(*) from public.lesson_contents lc join public.lessons l on l.id = lc.lesson_id where not l.is_preview) = 0, 'élève 2 non inscrit : contenu masqué');
commit;

-- ---------------------------------------------------------------- enseignant
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000b1';
insert into public.courses (id, slug, title, status) values ('c0000000-0000-4000-8000-0000000000f1', 'cours-du-prof', 'Cours du professeur', 'published');
select public.t_assert((select status from public.courses where id = 'c0000000-0000-4000-8000-0000000000f1') = 'pending_review', 'enseignant : publication soumise à validation');
select public.t_assert((select teacher_id from public.courses where id = 'c0000000-0000-4000-8000-0000000000f1') = auth.uid(), 'enseignant responsable assigné');
insert into public.course_modules (id, course_id, title) values ('d0000000-0000-4000-8000-0000000000f1', 'c0000000-0000-4000-8000-0000000000f1', 'Module A');
insert into public.lessons (module_id, title) values ('d0000000-0000-4000-8000-0000000000f1', 'Leçon A');
select public.t_assert((select count(*) from public.lessons where course_id = 'c0000000-0000-4000-8000-0000000000f1') = 1, 'enseignant : leçon créée');
update public.courses set title = 'Piratage' where id = 'c0000000-0000-4000-8000-000000000001';
select public.t_assert((select title from public.courses where id = 'c0000000-0000-4000-8000-000000000001') = 'Initiation au mandinka', 'enseignant : ne modifie pas un cours non autorisé');
select public.t_assert((select count(*) from public.answers) = 0, 'enseignant : ne voit pas les réponses d''un autre cours');
select public.t_assert((select count(*) from public.profiles where id = '00000000-0000-4000-8000-0000000000c1') = 0, 'enseignant : ne voit pas les élèves hors de ses cours');
select public.t_assert(public.review_lexical_submission(id, true, 'Merci, à confirmer avec un second locuteur', true) is not null, 'enseignant : validation d''une proposition')
  from public.lexical_submissions where headword = 'tenee';
select public.t_expect_error($$select public.review_course('c0000000-0000-4000-8000-0000000000f1', true, null)$$, 'enseignant : ne peut pas approuver son propre cours');
commit;
select public.t_assert(exists (select 1 from public.dictionary_entries where headword = 'tenee' and status = 'published' and orthography = 'karang_dulaa'), 'entrée créée depuis la proposition');

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000a1';
select public.review_course('c0000000-0000-4000-8000-0000000000f1', true, 'Bravo');
select public.t_assert((select status from public.courses where id = 'c0000000-0000-4000-8000-0000000000f1') = 'published', 'admin : cours approuvé');
select public.t_assert((select count(*) from public.audit_logs) > 0, 'admin : journal consultable');
commit;

-- Recherche dans le dictionnaire (normalisation)
select public.t_assert(exists (select 1 from public.dictionary_entries where headword_fold like 'abarika%'), 'recherche sans tons : àbáríká ↔ abarika');
select public.t_assert(exists (select 1 from public.dictionary_entries where headword_fold = 'bun'), 'recherche : búŋ ↔ bun');
select public.t_assert(public.kd_fold('Mandiŋkakáŋo') = 'mandinkakano', 'normalisation ŋ et tons');


-- Recherche RAG (droits de l'appelant)
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c2';
select public.t_assert((select count(*) from public.search_knowledge(array['merci'], 10) where kind = 'dictionnaire') >= 1, 'RAG : dictionnaire interrogé');
select public.t_assert((select count(*) from public.search_knowledge(array['vendredi'], 10) where kind = 'leçon') = 0, 'RAG : leçons d''un cours non suivi exclues');
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c1';
select public.t_assert((select count(*) from public.search_knowledge(array['vendredi'], 10) where kind = 'leçon') >= 1, 'RAG : leçons du cours suivi incluses');
commit;

drop function public.t_assert(boolean, text);
drop function public.t_expect_error(text, text);
