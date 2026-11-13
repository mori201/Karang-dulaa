-- =====================================================================
-- KARANG-DULAA — Stockage (Supabase Storage)
-- =====================================================================
-- public-media : couvertures de cours, avatars, images de leçons (public)
-- course-files : PDF, Word, vidéos, documents de bibliothèque (privé)
-- audio        : enregistrements de locuteurs (privé, URL signées)
-- sources      : ouvrages importés (privé, admin uniquement)
-- recordings   : enregistrements des apprenants (privé, propriétaire)
-- submissions  : fichiers de devoirs (privé)
-- Les tailles / types MIME sont contrôlés ici ET côté serveur.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media', 'public-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']),
  ('course-files', 'course-files', false, 52428800, array[
     'application/pdf','application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'text/plain','text/csv','image/jpeg','image/png','image/webp','video/mp4','video/webm',
     'audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm']),
  ('audio', 'audio', false, 20971520, array['audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm','audio/x-wav','audio/aac']),
  ('sources', 'sources', false, 104857600, array[
     'application/pdf','text/plain','text/csv',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('recordings', 'recordings', false, 5242880, array['audio/webm','audio/ogg','audio/mp4','audio/wav','audio/mpeg']),
  ('submissions', 'submissions', false, 10485760, array[
     'application/pdf','text/plain','image/jpeg','image/png',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document','audio/webm','audio/mpeg'])
on conflict (id) do nothing;

-- public-media ------------------------------------------------------------
create policy "public-media lecture" on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-media');
create policy "public-media écriture personnel" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and (public.is_staff()
    or (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text));
create policy "public-media maj personnel" on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and (public.is_staff()
    or (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text));
create policy "public-media suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and (public.is_admin() or owner = auth.uid()));

-- course-files : lecture si un document ou un bloc de leçon visible y fait référence
create policy "course-files lecture" on storage.objects for select to authenticated
  using (bucket_id = 'course-files' and (
    public.is_staff()
    or exists (select 1 from public.documents d where d.storage_path = storage.objects.name)
    or exists (select 1 from public.lesson_contents lc where lc.data ->> 'path' = storage.objects.name)
  ));
create policy "course-files écriture" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-files' and public.is_staff());
create policy "course-files suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'course-files' and (public.is_admin() or owner = auth.uid()));

-- audio --------------------------------------------------------------------
create policy "audio lecture" on storage.objects for select to anon, authenticated
  using (bucket_id = 'audio' and (
    public.is_staff()
    or exists (select 1 from public.audio_resources a where a.storage_path = storage.objects.name)
  ));
create policy "audio écriture" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and public.is_staff());
create policy "audio suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (public.is_admin() or owner = auth.uid()));

-- sources (ouvrages importés) : administrateurs uniquement
create policy "sources admin" on storage.objects for all to authenticated
  using (bucket_id = 'sources' and public.is_admin())
  with check (bucket_id = 'sources' and public.is_admin());

-- recordings : dossier personnel {uid}/...
create policy "recordings propriétaire" on storage.objects for all to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

-- submissions : dossier {uid}/... ; lecture par les enseignants du cours
create policy "submissions propriétaire" on storage.objects for all to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "submissions enseignants" on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and exists (
    select 1 from public.assignment_submissions s join public.assignments a on a.id = s.assignment_id
    where s.file_path = storage.objects.name and public.can_manage_course(a.course_id)));
