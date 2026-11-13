-- =====================================================================
-- KARANG-DULAA — Recherche dans la base de connaissances (RAG)
-- Exécutée avec les droits de l'appelant (SECURITY INVOKER) : la RLS
-- garantit que DULAA AI ne lit que ce que l'utilisateur peut lire.
-- =====================================================================
create or replace function public.search_knowledge(p_terms text[], p_limit int default 12)
returns table (kind text, ref_id uuid, title text, content text, source text, score int)
language sql stable security invoker set search_path = '' as $$
  with terms as (
    select distinct public.kd_fold(t) as t from unnest(p_terms) t where char_length(public.kd_fold(t)) >= 2 limit 12
  ),
  entries as (
    select 'dictionnaire'::text as kind, e.id as ref_id,
           e.headword as title,
           e.headword || coalesce(' (var. ' || nullif(array_to_string(e.variants, ', '), '') || ')', '') || ' : ' || e.translation_fr
             || coalesce(' — ' || e.definition, '') || coalesce(' [' || e.part_of_speech || ']', '')
             || coalesce(' Notes : ' || e.notes, '')
             || coalesce(' Exemples : ' || (select string_agg(x.mandinka || ' = « ' || coalesce(x.french, '?') || ' »', ' ; ' order by x.position)
                                            from public.dictionary_examples x where x.entry_id = e.id), '') as content,
           coalesce(s.author || ' ' || s.year || ', p. ' || e.source_page, 'Saisie KARANG-DULAA (orthographe : ' || e.orthography || ')') as source,
           (select max(case
              when e.headword_fold = tt.t or e.translation_fold = tt.t then 100
              when e.headword_fold like tt.t || '%' or e.variants_fold like '%' || tt.t || '%' then 60
              when e.translation_fold ~ ('(^|[^a-z])' || regexp_replace(tt.t, '([^a-z0-9 ])', '\\\1', 'g') || '([^a-z]|$)') then 50
              else 10 end) from terms tt
            where e.headword_fold like '%' || tt.t || '%' or e.variants_fold like '%' || tt.t || '%' or e.translation_fold like '%' || tt.t || '%') as score
    from public.dictionary_entries e
    left join public.dictionary_sources s on s.id = e.source_id
    where e.status = 'published'
      and exists (select 1 from terms tt where e.headword_fold like '%' || tt.t || '%' or e.variants_fold like '%' || tt.t || '%'
                                            or (char_length(tt.t) >= 3 and e.translation_fold like '%' || tt.t || '%'))
  ),
  lessons as (
    select 'leçon'::text as kind, l.id as ref_id, c.title || ' › ' || l.title as title,
           left(string_agg(lc.data::text, ' ' order by lc.position), 1500) as content,
           'Cours « ' || c.title || ' »' || case when c.is_demo then ' (démonstration, à valider)' else '' end as source,
           30 as score
    from public.lesson_contents lc
    join public.lessons l on l.id = lc.lesson_id
    join public.courses c on c.id = l.course_id
    where exists (select 1 from terms tt where char_length(tt.t) >= 3 and public.kd_fold(lc.data::text) like '%' || tt.t || '%')
    group by l.id, c.title, l.title, c.is_demo
  )
  select * from (select * from entries union all select * from lessons) u
  order by score desc nulls last, title
  limit least(greatest(p_limit, 1), 30);
$$;
revoke execute on function public.search_knowledge(text[], int) from public, anon;
grant execute on function public.search_knowledge(text[], int) to authenticated;
