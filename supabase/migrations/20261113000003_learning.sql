-- =====================================================================
-- KARANG-DULAA — Logique d'apprentissage (progression, évaluations,
-- gamification, certificats, modération). Toutes les écritures
-- sensibles passent par ces fonctions SECURITY DEFINER qui vérifient
-- elles-mêmes les droits : les apprenants ne peuvent ni s'attribuer
-- de l'XP, ni lire les bonnes réponses, ni modifier leur note.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Outils internes (non exposés)
-- ---------------------------------------------------------------------
create or replace function public.kd_notify(p_user uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, title, body, link) values (p_user, p_type, p_title, p_body, p_link);
$$;

-- Met à jour la série de jours et l'activité quotidienne
create or replace function public.kd_touch_activity(p_user uuid, p_seconds int, p_xp int, p_lessons int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'utc')::date;
  last_day date;
begin
  insert into public.daily_activity (user_id, day, seconds, xp, lessons_completed)
  values (p_user, today, greatest(p_seconds, 0), greatest(p_xp, 0), greatest(p_lessons, 0))
  on conflict (user_id, day) do update set
    seconds = public.daily_activity.seconds + excluded.seconds,
    xp = public.daily_activity.xp + excluded.xp,
    lessons_completed = public.daily_activity.lessons_completed + excluded.lessons_completed;

  select last_activity_date into last_day from public.profiles where id = p_user;
  if last_day is distinct from today then
    update public.profiles set
      current_streak = case when last_day = today - 1 then current_streak + 1 else 1 end,
      longest_streak = greatest(longest_streak, case when last_day = today - 1 then current_streak + 1 else 1 end),
      last_activity_date = today
    where id = p_user;
  end if;
end $$;

-- Ajoute de l'XP (idempotent pour les raisons uniques). Retourne true si ajouté.
create or replace function public.kd_add_xp(p_user uuid, p_amount int, p_reason text, p_ref uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare inserted int;
begin
  insert into public.xp_events (user_id, amount, reason, ref_id)
  values (p_user, p_amount, p_reason, p_ref)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return false; end if;
  update public.profiles set xp = xp + p_amount where id = p_user;
  perform public.kd_touch_activity(p_user, 0, p_amount, 0);
  return true;
end $$;

create or replace function public.kd_award(p_user uuid, p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  a record;
  inserted int;
begin
  select * into a from public.achievements where code = p_code;
  if not found then return false; end if;
  insert into public.student_achievements (student_id, achievement_id) values (p_user, a.id) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return false; end if;
  if a.xp_reward > 0 then
    insert into public.xp_events (user_id, amount, reason, ref_id) values (p_user, a.xp_reward, 'achievement', a.id);
    update public.profiles set xp = xp + a.xp_reward where id = p_user;
  end if;
  perform public.kd_notify(p_user, 'badge', 'Nouveau badge : ' || a.title, a.description, '/profil');
  return true;
end $$;

create or replace function public.kd_check_achievements(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  words int;
  p record;
begin
  select count(*) into words from public.flashcard_reviews where user_id = p_user and repetitions >= 1;
  if words >= 1 then perform public.kd_award(p_user, 'first_word'); end if;
  if words >= 50 then perform public.kd_award(p_user, 'words_50'); end if;
  if exists (select 1 from public.lesson_progress where student_id = p_user and status = 'completed') then
    perform public.kd_award(p_user, 'first_lesson');
  end if;
  if exists (select 1 from public.quiz_attempts where student_id = p_user and passed) then
    perform public.kd_award(p_user, 'first_assessment');
  end if;
  if exists (select 1 from public.enrollments e join public.courses c on c.id = e.course_id
             where e.student_id = p_user and e.status = 'completed' and c.level = 'debutant') then
    perform public.kd_award(p_user, 'beginner_mastery');
  end if;
  select current_streak into p from public.profiles where id = p_user;
  if (select current_streak from public.profiles where id = p_user) >= 7 then
    perform public.kd_award(p_user, 'streak_7');
  end if;
  if exists (select 1 from public.enrollments where student_id = p_user and status = 'completed') then
    perform public.kd_award(p_user, 'first_course');
  end if;
end $$;

-- Recalcule la progression d'une inscription
create or replace function public.kd_recompute_enrollment(p_user uuid, p_course uuid)
returns numeric language plpgsql security definer set search_path = '' as $$
declare
  total int;
  done int;
  pct numeric;
  was_completed boolean;
  c record;
begin
  select count(*) into total from public.lessons where course_id = p_course;
  select count(*) into done from public.lesson_progress
    where course_id = p_course and student_id = p_user and status = 'completed';
  pct := case when total = 0 then 0 else round(done * 100.0 / total, 2) end;

  select status = 'completed' into was_completed from public.enrollments where course_id = p_course and student_id = p_user;
  update public.enrollments set
    progress_percent = pct,
    status = case when pct >= 100 then 'completed' else status end,
    completed_at = case when pct >= 100 and completed_at is null then now() else completed_at end
  where course_id = p_course and student_id = p_user;

  if pct >= 100 and not coalesce(was_completed, false) then
    select * into c from public.courses where id = p_course;
    perform public.kd_add_xp(p_user, 50, 'course_completed', p_course);
    perform public.kd_notify(p_user, 'course', 'Cours terminé : ' || c.title,
      case when c.certificate_enabled then 'Vous pouvez demander votre certificat si vous avez réussi les évaluations requises.'
           else 'Félicitations pour votre persévérance !' end,
      '/academie/' || c.slug);
    -- niveau atteint
    update public.profiles set level = c.level
      where id = p_user and (
        (level = 'debutant' and c.level in ('intermediaire', 'avance')) or (level = 'intermediaire' and c.level = 'avance'));
  end if;
  return pct;
end $$;

-- ---------------------------------------------------------------------
-- Inscription à un cours
-- ---------------------------------------------------------------------
create or replace function public.enroll_in_course(p_course uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  eid uuid;
  c record;
begin
  if uid is null then raise exception 'Connexion requise'; end if;
  select * into c from public.courses where id = p_course and status = 'published';
  if not found then raise exception 'Cours indisponible'; end if;
  insert into public.enrollments (course_id, student_id) values (p_course, uid)
  on conflict (course_id, student_id) do update set status = case when public.enrollments.status = 'dropped' then 'active' else public.enrollments.status end
  returning id into eid;
  perform public.kd_notify(uid, 'enrollment', 'Inscription confirmée', 'Vous êtes inscrit(e) au cours « ' || c.title || ' ».', '/academie/' || c.slug);
  if c.teacher_id is not null and c.teacher_id <> uid then
    perform public.kd_notify(c.teacher_id, 'enrollment', 'Nouvel inscrit', 'Un nouvel apprenant suit « ' || c.title || ' ».', '/enseignant/cours/' || c.id || '/apprenants');
  end if;
  return eid;
end $$;

-- ---------------------------------------------------------------------
-- Progression dans les leçons
-- ---------------------------------------------------------------------
create or replace function public.record_study_time(p_lesson uuid, p_seconds int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  l record;
  secs int := least(greatest(coalesce(p_seconds, 0), 0), 120); -- au plus 2 min par battement
begin
  if uid is null then raise exception 'Connexion requise'; end if;
  select * into l from public.lessons where id = p_lesson;
  if not found or not public.is_enrolled(l.course_id) then return; end if;
  insert into public.lesson_progress (lesson_id, course_id, student_id, time_spent_seconds)
  values (p_lesson, l.course_id, uid, secs)
  on conflict (lesson_id, student_id) do update set
    time_spent_seconds = public.lesson_progress.time_spent_seconds + secs,
    last_viewed_at = now();
  update public.enrollments set last_lesson_id = p_lesson where course_id = l.course_id and student_id = uid;
  update public.profiles set last_lesson_id = p_lesson where id = uid;
  if secs > 0 then
    perform public.kd_touch_activity(uid, secs, 0, 0);
  end if;
end $$;

create or replace function public.complete_lesson(p_lesson uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  l record;
  newly boolean := false;
  pct numeric;
  prev text;
begin
  if uid is null then raise exception 'Connexion requise'; end if;
  select * into l from public.lessons where id = p_lesson;
  if not found then raise exception 'Leçon introuvable'; end if;
  if not public.is_enrolled(l.course_id) then raise exception 'Inscription au cours requise'; end if;

  select status into prev from public.lesson_progress where lesson_id = p_lesson and student_id = uid;
  insert into public.lesson_progress (lesson_id, course_id, student_id, status, completed_at)
  values (p_lesson, l.course_id, uid, 'completed', now())
  on conflict (lesson_id, student_id) do update set status = 'completed',
    completed_at = coalesce(public.lesson_progress.completed_at, now()), last_viewed_at = now();
  newly := prev is distinct from 'completed';

  if newly then
    perform public.kd_add_xp(uid, 10, 'lesson_completed', p_lesson);
    perform public.kd_touch_activity(uid, 0, 0, 1);
  end if;
  pct := public.kd_recompute_enrollment(uid, l.course_id);
  perform public.kd_check_achievements(uid);
  return jsonb_build_object('completed', true, 'newly_completed', newly, 'course_progress', pct);
end $$;

-- ---------------------------------------------------------------------
-- Exercices : lecture sans les solutions
-- ---------------------------------------------------------------------
create or replace function public.get_exercise_for_student(p_exercise uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  x record;
  attempts int;
begin
  select * into x from public.exercises where id = p_exercise;
  if not found then raise exception 'Exercice introuvable'; end if;
  if not ((x.is_published and public.can_read_course_content(x.course_id)) or public.can_manage_course(x.course_id)) then
    raise exception 'Accès refusé';
  end if;
  select count(*) into attempts from public.quiz_attempts where exercise_id = p_exercise and student_id = auth.uid();

  return jsonb_build_object(
    'id', x.id, 'title', x.title, 'description', x.description, 'kind', x.kind,
    'difficulty', x.difficulty, 'pass_score', x.pass_score, 'max_attempts', x.max_attempts,
    'attempts_used', attempts, 'course_id', x.course_id, 'lesson_id', x.lesson_id,
    'questions', coalesce((
      select jsonb_agg(q_json order by q_pos)
      from (
        select q.position as q_pos, jsonb_build_object(
          'id', q.id, 'type', q.type, 'prompt', q.prompt, 'points', q.points,
          'audio_id', q.audio_id,
          'options', case
            when q.type in ('mcq', 'multi', 'true_false') then (
              select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'content', a.content) order by a.position), '[]'::jsonb)
              from public.answers a where a.question_id = q.id)
            when q.type = 'matching' then (
              select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'content', a.content) order by a.position), '[]'::jsonb)
              from public.answers a where a.question_id = q.id)
            else '[]'::jsonb end,
          'match_choices', case when q.type = 'matching' then (
              select coalesce(jsonb_agg(mk order by md5(mk || q.id::text)), '[]'::jsonb)
              from (select distinct a.match_key as mk from public.answers a where a.question_id = q.id and a.match_key is not null) s)
            else '[]'::jsonb end,
          'tokens', case when q.type = 'word_order' then (
              select coalesce(jsonb_agg(t order by md5(t || ord::text || q.id::text)), '[]'::jsonb)
              from jsonb_array_elements_text(coalesce(q.data -> 'tokens', '[]'::jsonb)) with ordinality as tk(t, ord))
            else '[]'::jsonb end
        ) as q_json
        from public.questions q where q.exercise_id = p_exercise
      ) qs
    ), '[]'::jsonb)
  );
end $$;

-- Normalisation d'une réponse libre
create or replace function public.kd_norm_answer(p text, p_ignore_tones boolean)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(
    regexp_replace(
      case when p_ignore_tones then public.kd_fold(coalesce(p, '')) else lower(coalesce(p, '')) end,
      '[[:punct:]«»“”…¿¡]', ' ', 'g'),
    '\s+', ' ', 'g'));
$$;

-- ---------------------------------------------------------------------
-- Correction d'une tentative (côté serveur)
-- p_responses : { "<question_id>": <réponse> }
--   mcq / true_false : "<answer_id>"
--   multi            : ["<answer_id>", ...]
--   fill_blank / translation / dictation / short_answer : "texte"
--   word_order       : ["mot1", "mot2", ...]
--   matching         : { "<answer_id>": "<match_key>" }
-- ---------------------------------------------------------------------
create or replace function public.submit_quiz_attempt(p_exercise uuid, p_responses jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  x record;
  q record;
  resp jsonb;
  ok boolean;
  ignore_tones boolean;
  given text;
  expected jsonb;
  results jsonb := '[]'::jsonb;
  total numeric := 0;
  earned numeric := 0;
  pct numeric;
  attempts int;
  attempt_id uuid;
  first_pass boolean := false;
begin
  if uid is null then raise exception 'Connexion requise'; end if;
  select * into x from public.exercises where id = p_exercise;
  if not found then raise exception 'Exercice introuvable'; end if;
  if not ((x.is_published and public.can_read_course_content(x.course_id)) or public.can_manage_course(x.course_id)) then
    raise exception 'Accès refusé';
  end if;
  select count(*) into attempts from public.quiz_attempts where exercise_id = p_exercise and student_id = uid;
  if x.max_attempts is not null and attempts >= x.max_attempts then
    raise exception 'Nombre maximal de tentatives atteint';
  end if;
  p_responses := coalesce(p_responses, '{}'::jsonb);

  for q in select * from public.questions where exercise_id = p_exercise order by position loop
    resp := p_responses -> q.id::text;
    ignore_tones := coalesce((q.data ->> 'ignore_tones')::boolean, true);
    ok := false;
    total := total + q.points;

    if q.type in ('mcq', 'true_false') then
      ok := jsonb_typeof(resp) = 'string' and exists (
        select 1 from public.answers a where a.question_id = q.id and a.id::text = resp #>> '{}' and a.is_correct);
      select coalesce(jsonb_agg(a.content), '[]'::jsonb) into expected from public.answers a where a.question_id = q.id and a.is_correct;

    elsif q.type = 'multi' then
      if jsonb_typeof(resp) = 'array' then
        ok := (select coalesce(array_agg(a.id::text order by a.id::text), '{}') from public.answers a where a.question_id = q.id and a.is_correct)
            = (select coalesce(array_agg(distinct v order by v), '{}') from jsonb_array_elements_text(resp) v);
      end if;
      select coalesce(jsonb_agg(a.content), '[]'::jsonb) into expected from public.answers a where a.question_id = q.id and a.is_correct;

    elsif q.type in ('fill_blank', 'translation', 'dictation', 'short_answer') then
      given := case when jsonb_typeof(resp) = 'string' then resp #>> '{}' else null end;
      ok := given is not null and exists (
        select 1 from public.answers a where a.question_id = q.id and a.is_correct
          and public.kd_norm_answer(a.content, ignore_tones) = public.kd_norm_answer(given, ignore_tones));
      select coalesce(jsonb_agg(a.content), '[]'::jsonb) into expected from public.answers a where a.question_id = q.id and a.is_correct;

    elsif q.type = 'word_order' then
      if jsonb_typeof(resp) = 'array' then
        given := (select string_agg(v, ' ' order by ord) from jsonb_array_elements_text(resp) with ordinality as t(v, ord));
        ok := exists (
          select 1 from public.answers a where a.question_id = q.id and a.is_correct
            and public.kd_norm_answer(a.content, ignore_tones) = public.kd_norm_answer(given, ignore_tones));
      end if;
      select coalesce(jsonb_agg(a.content), '[]'::jsonb) into expected from public.answers a where a.question_id = q.id and a.is_correct;

    elsif q.type = 'matching' then
      if jsonb_typeof(resp) = 'object' then
        ok := not exists (
          select 1 from public.answers a where a.question_id = q.id and a.match_key is not null
            and coalesce(resp ->> a.id::text, '') <> a.match_key);
      end if;
      select coalesce(jsonb_agg(jsonb_build_object('item', a.content, 'match', a.match_key) order by a.position), '[]'::jsonb)
        into expected from public.answers a where a.question_id = q.id and a.match_key is not null;
    end if;

    if ok then earned := earned + q.points; end if;
    results := results || jsonb_build_array(jsonb_build_object(
      'question_id', q.id, 'correct', ok, 'points', case when ok then q.points else 0 end,
      'max_points', q.points, 'expected', expected, 'given', resp, 'explanation', q.explanation));
  end loop;

  pct := case when total = 0 then 0 else round(earned * 100.0 / total, 2) end;
  insert into public.quiz_attempts (exercise_id, student_id, responses, results, points, max_points, score, passed)
  values (p_exercise, uid, p_responses, results, earned, total, pct, pct >= x.pass_score)
  returning id into attempt_id;

  insert into public.grades (student_id, course_id, exercise_id, attempt_id, score, max_score)
  values (uid, x.course_id, p_exercise, attempt_id, earned, total);

  if pct >= x.pass_score then
    first_pass := public.kd_add_xp(uid, 20 * x.difficulty, 'exercise_passed', p_exercise);
  else
    perform public.kd_add_xp(uid, 2, 'exercise_attempt', null);
  end if;
  perform public.kd_check_achievements(uid);

  return jsonb_build_object('attempt_id', attempt_id, 'score', pct, 'points', earned, 'max_points', total,
    'passed', pct >= x.pass_score, 'pass_score', x.pass_score, 'first_pass', first_pass, 'results', results);
end $$;

-- ---------------------------------------------------------------------
-- Cartes mémoire (répétition espacée, SM-2 simplifié)
-- p_quality : 0 = oublié, 3 = difficile, 4 = bien, 5 = facile
-- ---------------------------------------------------------------------
create or replace function public.review_flashcard(p_entry uuid, p_quality int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r record;
  q int := least(greatest(coalesce(p_quality, 0), 0), 5);
  new_ease numeric;
  new_int int;
  new_rep int;
begin
  if uid is null then raise exception 'Connexion requise'; end if;
  if not exists (select 1 from public.dictionary_entries where id = p_entry and status = 'published') then
    raise exception 'Entrée introuvable';
  end if;
  select * into r from public.flashcard_reviews where user_id = uid and entry_id = p_entry;
  if not found then
    r := row(uid, p_entry, 2.5, 0, 0, now(), null)::public.flashcard_reviews;
  end if;
  if q < 3 then
    new_rep := 0; new_int := 1;
  else
    new_rep := r.repetitions + 1;
    new_int := case when new_rep = 1 then 1 when new_rep = 2 then 3 else ceil(r.interval_days * r.ease)::int end;
  end if;
  new_ease := greatest(1.3, r.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  insert into public.flashcard_reviews (user_id, entry_id, ease, interval_days, repetitions, due_at, last_reviewed_at)
  values (uid, p_entry, new_ease, new_int, new_rep, now() + make_interval(days => new_int), now())
  on conflict (user_id, entry_id) do update set
    ease = excluded.ease, interval_days = excluded.interval_days, repetitions = excluded.repetitions,
    due_at = excluded.due_at, last_reviewed_at = excluded.last_reviewed_at;

  perform public.kd_add_xp(uid, 1, 'flashcard', null);
  perform public.kd_check_achievements(uid);
  return jsonb_build_object('interval_days', new_int, 'repetitions', new_rep);
end $$;

-- ---------------------------------------------------------------------
-- Certificats
-- ---------------------------------------------------------------------
create or replace function public.issue_certificate(p_course uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c record;
  e record;
  p record;
  missing int;
  avg_score numeric;
  new_code text;
begin
  if uid is null then raise exception 'Connexion requise'; end if;
  select * into c from public.courses where id = p_course;
  if not found or not c.certificate_enabled then raise exception 'Ce cours ne délivre pas de certificat'; end if;
  select * into e from public.enrollments where course_id = p_course and student_id = uid;
  if not found or e.status <> 'completed' then raise exception 'Le cours doit être terminé'; end if;

  -- toutes les évaluations de type module_test / final_exam publiées doivent être réussies
  select count(*) into missing from public.exercises x
   where x.course_id = p_course and x.is_published and x.kind in ('module_test', 'final_exam')
     and not exists (select 1 from public.quiz_attempts a where a.exercise_id = x.id and a.student_id = uid and a.passed);
  if missing > 0 then raise exception 'Évaluations requises non réussies : %', missing; end if;

  select avg(best) into avg_score from (
    select max(a.score) as best from public.quiz_attempts a join public.exercises x on x.id = a.exercise_id
    where x.course_id = p_course and a.student_id = uid and x.kind in ('module_test', 'final_exam') group by x.id) s;
  if avg_score is not null and avg_score < c.certificate_min_score then
    raise exception 'Score moyen insuffisant (% %% requis)', c.certificate_min_score;
  end if;

  select code into new_code from public.certificates where student_id = uid and course_id = p_course and not revoked;
  if found then return new_code; end if;

  select * into p from public.profiles where id = uid;
  new_code := 'KD-' || to_char(now(), 'YYYY') || '-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));
  insert into public.certificates (code, student_id, course_id, student_name, course_title, level, score)
  values (new_code, uid, p_course, coalesce(nullif(p.full_name, ''), p.first_name, p.email), c.title, c.level, avg_score);
  perform public.kd_notify(uid, 'certificate', 'Certificat délivré', 'Votre certificat pour « ' || c.title || ' » est disponible.', '/certificats/' || new_code);
  return new_code;
end $$;

create or replace function public.verify_certificate(p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('code', code, 'student_name', student_name, 'course_title', course_title,
                            'level', level, 'score', score, 'issued_at', issued_at, 'valid', not revoked)
  from public.certificates where code = upper(btrim(p_code));
$$;

-- ---------------------------------------------------------------------
-- Statistiques
-- ---------------------------------------------------------------------
create or replace function public.public_stats()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'learners', (select count(*) from public.users_roles where role = 'student'),
    'courses', (select count(*) from public.courses where status = 'published'),
    'lessons', (select count(*) from public.lessons l join public.courses c on c.id = l.course_id where c.status = 'published'),
    'entries', (select count(*) from public.dictionary_entries where status = 'published'),
    'lessons_completed', (select count(*) from public.lesson_progress where status = 'completed')
  );
$$;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'students', (select count(*) from public.users_roles where role = 'student'),
    'teachers', (select count(*) from public.users_roles where role = 'teacher'),
    'admins', (select count(*) from public.users_roles where role = 'admin'),
    'courses_published', (select count(*) from public.courses where status = 'published'),
    'courses_pending', (select count(*) from public.courses where status = 'pending_review'),
    'courses_draft', (select count(*) from public.courses where status = 'draft'),
    'enrollments', (select count(*) from public.enrollments),
    'lessons_completed', (select count(*) from public.lesson_progress where status = 'completed'),
    'entries_published', (select count(*) from public.dictionary_entries where status = 'published'),
    'entries_pending', (select count(*) from public.dictionary_entries where status = 'pending_review'),
    'submissions_pending', (select count(*) from public.lexical_submissions where status = 'pending'),
    'attempts', (select count(*) from public.quiz_attempts),
    'documents', (select count(*) from public.documents),
    'active_7d', (select count(distinct user_id) from public.daily_activity where day >= current_date - 7),
    'signups_30d', (select count(*) from public.profiles where created_at >= now() - interval '30 days')
  );
end $$;

-- Classement facultatif (uniquement les apprenants qui l'ont accepté)
create or replace function public.leaderboard(p_days int default 7)
returns table (user_id uuid, display_name text, xp bigint, streak int)
language sql stable security definer set search_path = '' as $$
  select p.id, coalesce(nullif(p.first_name, ''), split_part(p.full_name, ' ', 1), 'Apprenant'),
         coalesce(sum(x.amount), 0)::bigint, p.current_streak
  from public.profiles p
  left join public.xp_events x on x.user_id = p.id and x.created_at >= now() - make_interval(days => least(greatest(p_days, 1), 365))
  where p.show_in_leaderboard and p.is_active and auth.uid() is not null
  group by p.id
  order by 3 desc, p.current_streak desc
  limit 20;
$$;

-- ---------------------------------------------------------------------
-- Modération
-- ---------------------------------------------------------------------
create or replace function public.review_course(p_course uuid, p_approve boolean, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  select * into c from public.courses where id = p_course;
  if not found then raise exception 'Cours introuvable'; end if;
  update public.courses set
    status = case when p_approve then 'published'::public.content_status else 'draft'::public.content_status end,
    review_notes = p_notes,
    published_at = case when p_approve then now() else published_at end
  where id = p_course;
  if c.teacher_id is not null then
    perform public.kd_notify(c.teacher_id, 'review',
      case when p_approve then 'Cours publié : ' else 'Cours à revoir : ' end || c.title,
      coalesce(p_notes, case when p_approve then 'Votre cours est en ligne.' else 'Des modifications sont demandées.' end),
      '/enseignant/cours/' || c.id);
  end if;
end $$;

create or replace function public.review_lexical_submission(p_id uuid, p_approve boolean, p_notes text, p_publish boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  s record;
  eid uuid;
begin
  if not public.is_staff() then raise exception 'Accès refusé'; end if;
  select * into s from public.lexical_submissions where id = p_id and status = 'pending' for update;
  if not found then raise exception 'Proposition introuvable ou déjà traitée'; end if;

  if p_approve then
    insert into public.dictionary_entries (headword, translation_fr, definition, part_of_speech, regional_variant,
      notes, orthography, status, created_by)
    values (s.headword, s.translation_fr, s.definition,
      case when s.part_of_speech in ('nom','verbe','adjectif','adverbe','pronom','postposition','conjonction','interjection','numeral','determinant','particule','locution','expression','autre') then s.part_of_speech end,
      s.regional_variant,
      'Proposition communautaire validée. Information fournie : ' || coalesce(s.source_info, 'non précisée'),
      'karang_dulaa', case when p_publish then 'published'::public.entry_status else 'draft'::public.entry_status end, s.submitted_by)
    returning id into eid;
    if s.example_mandinka is not null and btrim(s.example_mandinka) <> '' then
      insert into public.dictionary_examples (entry_id, mandinka, french) values (eid, s.example_mandinka, s.example_french);
    end if;
  end if;

  update public.lexical_submissions set
    status = case when p_approve then 'approved'::public.review_status else 'rejected'::public.review_status end,
    reviewer_id = auth.uid(), review_notes = p_notes, reviewed_at = now(), created_entry_id = eid
  where id = p_id;

  perform public.kd_notify(s.submitted_by, 'submission',
    case when p_approve then 'Proposition acceptée : ' else 'Proposition non retenue : ' end || s.headword,
    coalesce(p_notes, case when p_approve then 'Merci pour votre contribution au dictionnaire !' else null end),
    case when eid is not null then '/dictionnaire/' || eid else '/dictionnaire/proposer' end);
  return eid;
end $$;

-- ---------------------------------------------------------------------
-- Notifications automatiques
-- ---------------------------------------------------------------------
create or replace function public.kd_on_announcement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.course_id is null then
    insert into public.notifications (user_id, type, title, body, link)
    select p.id, 'announcement', new.title, left(new.body, 280), '/notifications' from public.profiles p where p.is_active;
  else
    insert into public.notifications (user_id, type, title, body, link)
    select e.student_id, 'announcement', new.title, left(new.body, 280),
           '/academie/' || (select slug from public.courses where id = new.course_id)
    from public.enrollments e where e.course_id = new.course_id and e.status in ('active', 'completed');
  end if;
  return null;
end $$;
create trigger announcements_notify after insert on public.announcements
  for each row execute function public.kd_on_announcement();

create or replace function public.kd_on_assignment_graded()
returns trigger language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  if new.status = 'graded' and (old.status is distinct from 'graded' or old.score is distinct from new.score) then
    select * into a from public.assignments where id = new.assignment_id;
    new.graded_by := auth.uid();
    new.graded_at := now();
    insert into public.grades (student_id, course_id, assignment_id, score, max_score, feedback, graded_by)
    values (new.student_id, a.course_id, a.id, coalesce(new.score, 0), a.max_score, new.feedback, auth.uid());
    perform public.kd_notify(new.student_id, 'grade', 'Devoir corrigé : ' || a.title,
      'Note : ' || coalesce(new.score::text, '—') || ' / ' || a.max_score, '/tableau-de-bord');
  end if;
  return new;
end $$;
create trigger assignment_submissions_graded before update on public.assignment_submissions
  for each row execute function public.kd_on_assignment_graded();

create or replace function public.kd_on_question_reply()
returns trigger language plpgsql security definer set search_path = '' as $$
declare q record;
begin
  select * into q from public.course_questions where id = new.question_id;
  if q.author_id <> new.author_id then
    perform public.kd_notify(q.author_id, 'reply', 'Nouvelle réponse à votre question', left(new.body, 200),
      '/academie/' || (select slug from public.courses where id = q.course_id) || '/questions');
  end if;
  return null;
end $$;
create trigger course_question_replies_notify after insert on public.course_question_replies
  for each row execute function public.kd_on_question_reply();

-- ---------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.kd_fold(text), public.kd_fold_array(text[]) to anon, authenticated;
grant execute on function public.has_role(public.app_role), public.is_admin(), public.is_teacher(), public.is_staff(),
  public.can_manage_course(uuid), public.is_enrolled(uuid), public.course_is_published(uuid),
  public.teaches_student(uuid), public.can_read_course_content(uuid) to anon, authenticated;
grant execute on function public.public_stats(), public.verify_certificate(text) to anon, authenticated;
grant execute on function public.enroll_in_course(uuid), public.record_study_time(uuid, int), public.complete_lesson(uuid),
  public.get_exercise_for_student(uuid), public.submit_quiz_attempt(uuid, jsonb), public.review_flashcard(uuid, int),
  public.issue_certificate(uuid), public.admin_stats(), public.leaderboard(int), public.review_course(uuid, boolean, text),
  public.review_lexical_submission(uuid, boolean, text, boolean), public.kd_norm_answer(text, boolean),
  public.kd_log(text, text, text, jsonb) to authenticated;
-- kd_add_xp, kd_award, kd_touch_activity, kd_notify… restent internes.
