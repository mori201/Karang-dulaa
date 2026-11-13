-- =====================================================================
-- KARANG-DULAA — Sécurité : rôles, RLS, journalisation
-- =====================================================================

-- ---------------------------------------------------------------------
-- Fonctions d'autorisation (security definer, sans récursion RLS)
-- ---------------------------------------------------------------------
create or replace function public.has_role(r public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.users_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and ur.role = r and p.is_active
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('admin');
$$;

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('teacher');
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('admin') or public.has_role('teacher');
$$;

-- L'utilisateur courant peut-il gérer ce cours ? (admin, ou enseignant responsable / co-enseignant)
create or replace function public.can_manage_course(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (
    public.is_teacher() and exists (
      select 1 from public.courses c
      where c.id = cid and (
        c.teacher_id = auth.uid() or c.created_by = auth.uid()
        or exists (select 1 from public.course_teachers ct where ct.course_id = c.id and ct.teacher_id = auth.uid())
      )
    )
  );
$$;

create or replace function public.is_enrolled(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e
    where e.course_id = cid and e.student_id = auth.uid() and e.status in ('active', 'completed')
  );
$$;

create or replace function public.course_is_published(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.courses c where c.id = cid and c.status = 'published');
$$;

-- Un enseignant peut-il voir cet apprenant ? (inscrit à l'un de ses cours)
create or replace function public.teaches_student(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_teacher() and exists (
    select 1 from public.enrollments e
    where e.student_id = sid and public.can_manage_course(e.course_id)
  );
$$;

-- Peut lire le contenu d'un cours (leçons, blocs)
create or replace function public.can_read_course_content(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_manage_course(cid) or (public.course_is_published(cid) and public.is_enrolled(cid));
$$;

-- ---------------------------------------------------------------------
-- Journal d'audit
-- ---------------------------------------------------------------------
create or replace function public.kd_log(p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- seules les actions du personnel sont journalisées par ce point d'entrée
  if not public.is_staff() then return; end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), left(p_action, 100), left(p_entity_type, 100), left(p_entity_id, 200), coalesce(p_details, '{}'::jsonb));
end $$;

create or replace function public.kd_audit_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb;
  ident text;
begin
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  ident := coalesce(rec ->> 'id', rec ->> 'user_id', rec ->> 'key');
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    ident,
    case
      when tg_op = 'UPDATE' then jsonb_build_object(
        'changed', (select coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb)
                    from jsonb_each(to_jsonb(new)) n
                    where to_jsonb(old) -> n.key is distinct from n.value
                      and n.key not in ('updated_at', 'headword_fold', 'translation_fold', 'variants_fold', 'title_fold')))
      when tg_op = 'DELETE' then jsonb_build_object('deleted', rec - 'headword_fold' - 'translation_fold' - 'variants_fold')
      else jsonb_build_object('created', rec ->> 'title', 'role', rec ->> 'role', 'headword', rec ->> 'headword')
    end
  );
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['users_roles','courses','dictionary_entries','dictionary_sources','lexical_submissions','platform_settings','certificates','documents','teachers'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.kd_audit_trigger()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  admin_emails jsonb;
  fname text := coalesce(new.raw_user_meta_data ->> 'first_name', '');
  lname text := coalesce(new.raw_user_meta_data ->> 'last_name', '');
begin
  insert into public.profiles (id, email, first_name, full_name)
  values (new.id, new.email, fname, trim(fname || ' ' || lname))
  on conflict (id) do nothing;

  insert into public.students (user_id) values (new.id) on conflict do nothing;
  insert into public.users_roles (user_id, role) values (new.id, 'student') on conflict do nothing;

  -- Amorçage de l'administrateur : les e-mails listés dans
  -- platform_settings.admin_bootstrap_emails reçoivent le rôle admin.
  select value into admin_emails from public.platform_settings where key = 'admin_bootstrap_emails';
  if admin_emails is not null and admin_emails ? lower(new.email) then
    insert into public.users_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
    values (new.id, 'bootstrap_admin', 'users_roles', new.id::text, '{}'::jsonb);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Maintien de la table teachers quand le rôle enseignant est attribué
create or replace function public.kd_sync_teacher()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.role = 'teacher' then
    insert into public.teachers (user_id) values (new.user_id) on conflict do nothing;
    insert into public.notifications (user_id, type, title, body, link)
    values (new.user_id, 'role', 'Vous êtes désormais enseignant', 'L''espace enseignant est disponible dans votre menu.', '/enseignant');
  end if;
  return null;
end $$;
create trigger users_roles_sync_teacher after insert on public.users_roles
  for each row execute function public.kd_sync_teacher();

-- ---------------------------------------------------------------------
-- Statut des cours : un enseignant sans droit de publication directe
-- ne peut que soumettre (pending_review). Seul un admin publie.
-- ---------------------------------------------------------------------
create or replace function public.kd_guard_course_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare direct boolean;
begin
  if auth.uid() is null or public.is_admin() then
    if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
      new.published_at := now();
    end if;
    if tg_op = 'INSERT' then
      new.created_by := coalesce(new.created_by, auth.uid());
    end if;
    return new;
  end if;
  select t.can_publish_directly into direct from public.teachers t where t.user_id = auth.uid();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if coalesce(direct, false) then
      new.published_at := now();
    else
      new.status := 'pending_review';
    end if;
  end if;
  -- un enseignant ne peut pas réattribuer le cours ni modifier les notes de revue
  if tg_op = 'UPDATE' then
    new.review_notes := old.review_notes;
    if new.teacher_id is distinct from old.teacher_id then
      new.teacher_id := old.teacher_id;
    end if;
  else
    new.teacher_id := coalesce(new.teacher_id, auth.uid());
    new.created_by := auth.uid();
  end if;
  return new;
end $$;
create trigger courses_guard_status before insert or update on public.courses
  for each row execute function public.kd_guard_course_status();

-- lessons.course_id doit correspondre au module
create or replace function public.kd_lesson_course()
returns trigger language plpgsql set search_path = '' as $$
begin
  select m.course_id into new.course_id from public.course_modules m where m.id = new.module_id;
  if new.course_id is null then raise exception 'Module introuvable'; end if;
  return new;
end $$;
create trigger lessons_course before insert or update of module_id on public.lessons
  for each row execute function public.kd_lesson_course();

-- ---------------------------------------------------------------------
-- Droits de colonnes sur profiles : l'utilisateur ne peut pas modifier
-- lui-même son XP, son niveau, sa série ou son statut.
-- ---------------------------------------------------------------------
revoke update on public.profiles from authenticated, anon;
grant update (first_name, full_name, avatar_url, bio, weekly_goal_minutes, daily_goal_xp,
              show_in_leaderboard, recording_consent)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- Activation de RLS sur toutes les tables
-- ---------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- profiles ------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.teaches_student(id)
         or exists (select 1 from public.teachers t where t.user_id = profiles.id and t.is_public));
create policy profiles_select_public_teachers on public.profiles for select to anon
  using (exists (select 1 from public.teachers t where t.user_id = profiles.id and t.is_public));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Les admins ont besoin de modifier is_active / level
grant update (is_active, level) on public.profiles to authenticated;
create or replace function public.kd_guard_profile_admin_cols()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_active := old.is_active;
    new.level := old.level;
  end if;
  return new;
end $$;
create trigger profiles_guard_admin_cols before update on public.profiles
  for each row execute function public.kd_guard_profile_admin_cols();

-- users_roles ---------------------------------------------------------
create policy users_roles_select on public.users_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy users_roles_admin_insert on public.users_roles for insert to authenticated
  with check (public.is_admin());
create policy users_roles_admin_delete on public.users_roles for delete to authenticated
  using (public.is_admin() and not (user_id = auth.uid() and role = 'admin'));  -- pas d'auto-rétrogradation

-- teachers / students -------------------------------------------------
create policy teachers_select on public.teachers for select to anon, authenticated
  using (is_public or user_id = auth.uid() or public.is_admin());
create policy teachers_update on public.teachers for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create or replace function public.kd_guard_teacher_cols()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.can_publish_directly := old.can_publish_directly;
  end if;
  return new;
end $$;
create trigger teachers_guard before update on public.teachers
  for each row execute function public.kd_guard_teacher_cols();

create policy students_select on public.students for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.teaches_student(user_id));
create policy students_update on public.students for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- catégories ------------------------------------------------------------
create policy course_categories_read on public.course_categories for select to anon, authenticated using (true);
create policy course_categories_admin on public.course_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy vocab_categories_read on public.vocabulary_categories for select to anon, authenticated using (true);
create policy vocab_categories_staff on public.vocabulary_categories for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- courses ---------------------------------------------------------------
create policy courses_read on public.courses for select to anon, authenticated
  using (status = 'published' or public.can_manage_course(id));
create policy courses_insert on public.courses for insert to authenticated
  with check (public.is_staff());
create policy courses_update on public.courses for update to authenticated
  using (public.can_manage_course(id)) with check (public.can_manage_course(id));
create policy courses_delete on public.courses for delete to authenticated
  using (public.is_admin() or (public.can_manage_course(id) and status = 'draft'));

create policy course_teachers_read on public.course_teachers for select to authenticated
  using (public.can_manage_course(course_id));
create policy course_teachers_admin on public.course_teachers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- modules / leçons / contenus -----------------------------------------
create policy modules_read on public.course_modules for select to anon, authenticated
  using (public.course_is_published(course_id) or public.can_manage_course(course_id));
create policy modules_write on public.course_modules for all to authenticated
  using (public.can_manage_course(course_id)) with check (public.can_manage_course(course_id));

-- la structure (titres) des leçons est visible pour un cours publié ; le contenu non
create policy lessons_read on public.lessons for select to anon, authenticated
  using (public.course_is_published(course_id) or public.can_manage_course(course_id));
create policy lessons_write on public.lessons for all to authenticated
  using (public.can_manage_course(course_id)) with check (public.can_manage_course(course_id));

create policy lesson_contents_read on public.lesson_contents for select to anon, authenticated
  using (exists (
    select 1 from public.lessons l where l.id = lesson_contents.lesson_id and (
      public.can_read_course_content(l.course_id) or (l.is_preview and public.course_is_published(l.course_id))
    )));
create policy lesson_contents_write on public.lesson_contents for all to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_contents.lesson_id and public.can_manage_course(l.course_id)))
  with check (exists (select 1 from public.lessons l where l.id = lesson_contents.lesson_id and public.can_manage_course(l.course_id)));

-- inscriptions / progression --------------------------------------------
create policy enrollments_read on public.enrollments for select to authenticated
  using (student_id = auth.uid() or public.can_manage_course(course_id));
create policy enrollments_self_insert on public.enrollments for insert to authenticated
  with check (student_id = auth.uid() and public.course_is_published(course_id) and status = 'active');
create policy enrollments_manage on public.enrollments for update to authenticated
  using (public.can_manage_course(course_id)) with check (public.can_manage_course(course_id));
create policy enrollments_self_drop on public.enrollments for delete to authenticated
  using (student_id = auth.uid() or public.is_admin());

create policy lesson_progress_read on public.lesson_progress for select to authenticated
  using (student_id = auth.uid() or public.can_manage_course(course_id));
-- écriture uniquement via les fonctions complete_lesson / record_study_time

create policy daily_activity_read on public.daily_activity for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- dictionnaire ------------------------------------------------------------
create policy sources_read on public.dictionary_sources for select to anon, authenticated using (true);
create policy sources_admin on public.dictionary_sources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Une entrée publiée n'est visible publiquement que si sa source l'autorise
-- (droits vérifiés) ; sinon seulement pour les utilisateurs connectés.
create policy entries_read on public.dictionary_entries for select to anon
  using (status = 'published' and (source_id is null or exists (
    select 1 from public.dictionary_sources s where s.id = source_id and s.public_display)));
create policy entries_read_auth on public.dictionary_entries for select to authenticated
  using (status = 'published' or public.is_staff());
create policy entries_staff_write on public.dictionary_entries for insert to authenticated
  with check (public.is_staff());
create policy entries_staff_update on public.dictionary_entries for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy entries_admin_delete on public.dictionary_entries for delete to authenticated
  using (public.is_admin());

-- Seul un admin publie une entrée ; un enseignant propose (pending_review)
create or replace function public.kd_guard_entry_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() and new.status = 'published'
     and (tg_op = 'INSERT' or old.status <> 'published') then
    if not public.is_teacher() then
      raise exception 'Publication non autorisée';
    end if;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.verified_by := coalesce(auth.uid(), new.verified_by);
    new.verified_at := now();
  end if;
  return new;
end $$;
create trigger entries_guard before insert or update on public.dictionary_entries
  for each row execute function public.kd_guard_entry_status();

create policy examples_read on public.dictionary_examples for select to anon, authenticated
  using (exists (select 1 from public.dictionary_entries e where e.id = entry_id));  -- hérite de la RLS des entrées
create policy examples_staff on public.dictionary_examples for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy entry_categories_read on public.dictionary_entry_categories for select to anon, authenticated using (true);
create policy entry_categories_staff on public.dictionary_entry_categories for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy favorites_own on public.dictionary_favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy search_history_own on public.search_history for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy flashcards_own on public.flashcard_reviews for select to authenticated
  using (user_id = auth.uid());

create policy submissions_read on public.lexical_submissions for select to authenticated
  using (submitted_by = auth.uid() or public.is_staff());
create policy submissions_insert on public.lexical_submissions for insert to authenticated
  with check (submitted_by = auth.uid() and status = 'pending');
create policy submissions_review on public.lexical_submissions for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- audio -------------------------------------------------------------------
create policy audio_read on public.audio_resources for select to anon, authenticated
  using ((status = 'published' and (course_id is null or public.course_is_published(course_id))) or public.is_staff());
create policy audio_staff on public.audio_resources for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy recordings_own on public.pronunciation_recordings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- exercices ---------------------------------------------------------------
create policy exercises_read on public.exercises for select to authenticated
  using ((is_published and public.can_read_course_content(course_id)) or public.can_manage_course(course_id));
create policy exercises_write on public.exercises for all to authenticated
  using (public.can_manage_course(course_id)) with check (public.can_manage_course(course_id));

-- questions / réponses : lecture directe réservée aux gestionnaires du cours
create policy questions_manage on public.questions for all to authenticated
  using (exists (select 1 from public.exercises x where x.id = exercise_id and public.can_manage_course(x.course_id)))
  with check (exists (select 1 from public.exercises x where x.id = exercise_id and public.can_manage_course(x.course_id)));
create policy answers_manage on public.answers for all to authenticated
  using (exists (select 1 from public.questions q join public.exercises x on x.id = q.exercise_id
                 where q.id = question_id and public.can_manage_course(x.course_id)))
  with check (exists (select 1 from public.questions q join public.exercises x on x.id = q.exercise_id
                 where q.id = question_id and public.can_manage_course(x.course_id)));

create policy attempts_read on public.quiz_attempts for select to authenticated
  using (student_id = auth.uid() or exists (
    select 1 from public.exercises x where x.id = exercise_id and public.can_manage_course(x.course_id)));

create policy assignments_read on public.assignments for select to authenticated
  using ((is_published and public.can_read_course_content(course_id)) or public.can_manage_course(course_id));
create policy assignments_write on public.assignments for all to authenticated
  using (public.can_manage_course(course_id)) with check (public.can_manage_course(course_id));

create policy asub_read on public.assignment_submissions for select to authenticated
  using (student_id = auth.uid() or exists (
    select 1 from public.assignments a where a.id = assignment_id and public.can_manage_course(a.course_id)));
create policy asub_insert on public.assignment_submissions for insert to authenticated
  with check (student_id = auth.uid() and status = 'submitted' and score is null and exists (
    select 1 from public.assignments a where a.id = assignment_id and a.is_published and public.can_read_course_content(a.course_id)));
create policy asub_student_update on public.assignment_submissions for update to authenticated
  using (student_id = auth.uid() and status = 'submitted')
  with check (student_id = auth.uid() and status = 'submitted' and score is null);
create policy asub_grade on public.assignment_submissions for update to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id and public.can_manage_course(a.course_id)))
  with check (exists (select 1 from public.assignments a where a.id = assignment_id and public.can_manage_course(a.course_id)));

create policy grades_read on public.grades for select to authenticated
  using (student_id = auth.uid() or public.can_manage_course(course_id));
create policy grades_write on public.grades for insert to authenticated
  with check (public.can_manage_course(course_id) and graded_by = auth.uid());

-- bibliothèque ------------------------------------------------------------
create policy documents_read on public.documents for select to anon, authenticated
  using (
    visibility = 'public'
    or (visibility = 'enrolled' and auth.uid() is not null and (course_id is null or public.can_read_course_content(course_id)))
    or (visibility = 'staff' and public.is_staff())
    or uploaded_by = auth.uid()
    or public.is_admin()
  );
create policy documents_staff_insert on public.documents for insert to authenticated
  with check (public.is_staff() and uploaded_by = auth.uid()
              and (course_id is null or public.can_manage_course(course_id)));
create policy documents_update on public.documents for update to authenticated
  using (public.is_admin() or (public.is_teacher() and uploaded_by = auth.uid()))
  with check (public.is_admin() or (public.is_teacher() and uploaded_by = auth.uid()));
create policy documents_delete on public.documents for delete to authenticated
  using (public.is_admin() or (public.is_teacher() and uploaded_by = auth.uid()));

-- communication -----------------------------------------------------------
create policy announcements_read on public.announcements for select to anon, authenticated
  using (course_id is null or public.can_read_course_content(course_id));
create policy announcements_write on public.announcements for insert to authenticated
  with check (author_id = auth.uid() and ((course_id is null and public.is_admin()) or (course_id is not null and public.can_manage_course(course_id))));
create policy announcements_delete on public.announcements for delete to authenticated
  using (public.is_admin() or author_id = auth.uid());

create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_own_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy cq_read on public.course_questions for select to authenticated
  using (public.can_read_course_content(course_id));
create policy cq_insert on public.course_questions for insert to authenticated
  with check (author_id = auth.uid() and public.can_read_course_content(course_id));
create policy cq_update on public.course_questions for update to authenticated
  using (author_id = auth.uid() or public.can_manage_course(course_id))
  with check (author_id = auth.uid() or public.can_manage_course(course_id));
create policy cq_delete on public.course_questions for delete to authenticated
  using (author_id = auth.uid() or public.can_manage_course(course_id));
create policy cqr_read on public.course_question_replies for select to authenticated
  using (exists (select 1 from public.course_questions q where q.id = question_id and public.can_read_course_content(q.course_id)));
create policy cqr_insert on public.course_question_replies for insert to authenticated
  with check (author_id = auth.uid() and exists (
    select 1 from public.course_questions q where q.id = question_id and public.can_read_course_content(q.course_id)));
create policy cqr_delete on public.course_question_replies for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy testimonials_read on public.testimonials for select to anon, authenticated
  using (approved or user_id = auth.uid() or public.is_admin());
create policy testimonials_insert on public.testimonials for insert to authenticated
  with check (user_id = auth.uid() and not approved);
create policy testimonials_admin on public.testimonials for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy testimonials_delete on public.testimonials for delete to authenticated
  using (public.is_admin() or user_id = auth.uid());

-- gamification / certificats ----------------------------------------------
create policy achievements_read on public.achievements for select to anon, authenticated using (true);
create policy achievements_admin on public.achievements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy student_achievements_read on public.student_achievements for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.teaches_student(student_id));
create policy xp_events_read on public.xp_events for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- certificats : lecture par le titulaire ; vérification publique via verify_certificate()
create policy certificates_read on public.certificates for select to authenticated
  using (student_id = auth.uid() or public.can_manage_course(course_id));
create policy certificates_admin on public.certificates for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- import --------------------------------------------------------------------
create policy import_jobs_admin on public.import_jobs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy import_items_admin on public.import_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- IA --------------------------------------------------------------------------
create policy ai_conv_own on public.ai_conversations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_msg_own on public.ai_messages for select to authenticated
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy ai_msg_insert on public.ai_messages for insert to authenticated
  with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- administration --------------------------------------------------------------
create policy settings_read on public.platform_settings for select to authenticated
  using (public.is_admin() or key in ('site', 'features'));
create policy settings_read_anon on public.platform_settings for select to anon
  using (key in ('site', 'features'));
create policy settings_admin on public.platform_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy audit_admin_read on public.audit_logs for select to authenticated
  using (public.is_admin());
-- aucune politique d'écriture : audit_logs n'est alimenté que par des fonctions definer
