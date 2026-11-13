-- =====================================================================
-- KARANG-DULAA — Données initiales
-- =====================================================================
-- 1. Paramètres, catégories, badges : données de configuration réelles.
-- 2. Sources documentaires : les deux ouvrages de référence fournis.
--    Droits : « à vérifier ». Les entrées issues de ces sources ne sont
--    PAS affichées aux visiteurs anonymes tant que `public_display`
--    reste à false (voir docs/DROITS-ET-SOURCES.md).
-- 3. Dictionnaire : extraits saisis manuellement depuis Creissels (2012),
--    orthographe et tons conservés tels quels, avec page de référence.
-- 4. Cours « Initiation au mandinka » : DONNÉES DE DÉMONSTRATION
--    (is_demo = true), à valider par l'équipe pédagogique.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Paramètres
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, description) values
  ('site', '{"name": "KARANG-DULAA", "tagline": "Apprendre le mandinka, préserver notre héritage.", "contact_email": null}', 'Identité du site'),
  ('features', '{"ai_assistant": true, "leaderboard": true, "lexical_submissions": true, "recordings": true}', 'Fonctionnalités activées'),
  ('admin_bootstrap_emails', '[]', 'E-mails (en minuscules) qui reçoivent automatiquement le rôle administrateur à l''inscription')
on conflict (key) do nothing;

insert into public.course_categories (slug, name, description, position) values
  ('bases', 'Bases de la langue', 'Premiers pas : prononciation, salutations, vocabulaire essentiel.', 1),
  ('grammaire', 'Grammaire', 'Structure des mots et des phrases.', 2),
  ('conversation', 'Conversation', 'Dialogues et situations de la vie courante.', 3),
  ('culture', 'Culture et histoire', 'Histoire du Kaabu, traditions, proverbes.', 4)
on conflict (slug) do nothing;

insert into public.vocabulary_categories (slug, name) values
  ('politesse', 'Salutations et politesse'),
  ('famille', 'Famille et parenté'),
  ('temps', 'Temps et calendrier'),
  ('vie-quotidienne', 'Vie quotidienne'),
  ('alimentation', 'Alimentation'),
  ('societe', 'Société et traditions'),
  ('nature', 'Nature et animaux'),
  ('nombres', 'Nombres'),
  ('grammaire', 'Mots grammaticaux')
on conflict (slug) do nothing;

insert into public.achievements (code, title, description, icon, xp_reward) values
  ('first_word', 'Premier mot appris', 'Vous avez révisé votre premier mot avec les cartes mémoire.', 'sparkles', 5),
  ('first_lesson', 'Première leçon terminée', 'Vous avez terminé votre première leçon.', 'book-open-check', 10),
  ('words_50', '50 mots mémorisés', '50 mots révisés avec succès dans les cartes mémoire.', 'brain', 50),
  ('first_assessment', 'Première évaluation réussie', 'Vous avez réussi votre première évaluation.', 'badge-check', 20),
  ('beginner_mastery', 'Maîtrise du niveau débutant', 'Vous avez terminé un cours de niveau débutant.', 'graduation-cap', 100),
  ('streak_7', 'Une semaine d''assiduité', '7 jours d''apprentissage consécutifs.', 'flame', 30),
  ('first_course', 'Premier cours terminé', 'Vous avez terminé votre premier cours.', 'trophy', 50)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- Sources documentaires
-- ---------------------------------------------------------------------
insert into public.dictionary_sources (id, slug, title, author, year, publisher, url, orthography_notes, rights_status, rights_notes, public_display) values
  ('5a000000-0000-4000-8000-000000000001', 'creissels-2012',
   'Matériaux pour un dictionnaire mandinka (version du 8 février 2012)', 'Denis Creissels', 2012,
   'Université Lumière Lyon 2 (document de travail mis en ligne par l''auteur)', 'http://deniscreissels.fr',
   'Notation tonale complète dans les entrées (aigu = haut, grave = bas, circonflexe = descendant ou haut suivi de downstep, caron = montant). Dans les exemples, seuls les tons non bas sont notés. Nasales finales notées ŋ. Ordre alphabétique : ŋ, m, n, ñ. Voyelles longues notées par redoublement, le diacritique tonal sur le premier élément. Les verbes sont donnés à la forme nue (cités avec ka par les locuteurs) ; les noms à la forme nue (cités à la forme déterminée en -o).',
   'to_verify', 'Document de recherche en ligne. Autorisation de l''auteur à obtenir avant toute diffusion publique au-delà de courts extraits.', false),
  ('5a000000-0000-4000-8000-000000000002', 'drame-2003',
   'Parlons mandinka', 'Malal Lafi Dramé', 2003, 'L''Harmattan, collection « Parlons… » (ISBN 2-7475-4756-6)', null,
   'Alphabet de 18 consonnes et 5 voyelles (brèves et longues, longues notées par redoublement), dérivé du décret sénégalais 71-566 avec modifications (un seul e et un seul o). Tons généralement non notés. Attention : la copie numérique disponible provient d''un OCR imparfait (ŋ et ñ souvent mal reconnus) ; toute citation doit être vérifiée sur l''ouvrage imprimé.',
   'to_verify', 'Ouvrage publié sous droits (L''Harmattan, 2003). Seuls de courts extraits cités avec référence sont utilisés ; la reproduction de parties entières nécessite l''accord de l''éditeur et de l''auteur.', false)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Dictionnaire — extraits de Creissels (2012)
-- Saisie manuelle, orthographe et tons de la source conservés.
-- ---------------------------------------------------------------------
create temporary table seed_entries (
  id uuid, headword text, variants text[], translation text, pos text, page text, cat text, notes text
);

insert into seed_entries values
  ('e0000000-0000-4000-8000-000000000001', 'a', '{}', 'lui, elle, ça (forme non emphatique)', 'pronom', '5', 'grammaire', null),
  ('e0000000-0000-4000-8000-000000000002', 'àbáríká', '{}', 'merci', 'interjection', '5', 'politesse', null),
  ('e0000000-0000-4000-8000-000000000003', 'àbíyóŋ', '{}', 'avion', 'nom', '5', 'vie-quotidienne', null),
  ('e0000000-0000-4000-8000-000000000004', 'àdèréesí', '{dèréesí}', 'adresse', 'nom', '5', 'vie-quotidienne', null),
  ('e0000000-0000-4000-8000-000000000005', 'áadá', '{láadá}', 'coutume, tradition', 'nom', '5', 'societe', null),
  ('e0000000-0000-4000-8000-000000000006', 'ábádáŋ', '{}', 'jamais', 'adverbe', '5', 'grammaire', null),
  ('e0000000-0000-4000-8000-000000000007', 'àlàhádí', '{làhádí}', 'dimanche', 'nom', '6', 'temps', 'Creissels donne aussi dìmáasí « dimanche » (p. 47).'),
  ('e0000000-0000-4000-8000-000000000008', 'àlí', '{àlú}', 'vous (forme non emphatique)', 'pronom', '6', 'grammaire', 'Forme emphatique : àlìtélù et variantes (p. 7).'),
  ('e0000000-0000-4000-8000-000000000009', 'àlìfáa', '{}', 'ancien, parent à qui on doit le respect', 'nom', '6', 'famille', null),
  ('e0000000-0000-4000-8000-000000000010', 'àlìkáalí', '{}', 'chef de village', 'nom', '6', 'societe', null),
  ('e0000000-0000-4000-8000-000000000011', 'àlìmáamé', '{}', 'imam', 'nom', '6', 'societe', null),
  ('e0000000-0000-4000-8000-000000000012', 'àlìháalá', '{}', 'état', 'nom', '6', null, null),
  ('e0000000-0000-4000-8000-000000000013', 'àlìméetí', '{}', 'allumette', 'nom', '7', 'vie-quotidienne', null),
  ('e0000000-0000-4000-8000-000000000014', 'àrábá', '{}', 'mercredi', 'nom', '7', 'temps', null),
  ('e0000000-0000-4000-8000-000000000015', 'àràamísá', '{}', 'jeudi', 'nom', '7', 'temps', null),
  ('e0000000-0000-4000-8000-000000000016', 'àràjúmá', '{júmá}', 'vendredi', 'nom', '7', 'temps', null),
  ('e0000000-0000-4000-8000-000000000017', 'àràjáná', '{}', 'paradis', 'nom', '7', 'societe', null),
  ('e0000000-0000-4000-8000-000000000018', 'báa', '{}', 'mère ; forme d’adresse envers une femme âgée', 'nom', '8', 'famille', 'Homonyme de báa « fleuve, estuaire » (même page).'),
  ('e0000000-0000-4000-8000-000000000019', 'báamáa', '{}', 'mère', 'nom', '9', 'famille', null),
  ('e0000000-0000-4000-8000-000000000020', 'báandíŋ', '{}', 'soeur de la mère ou co-épouse plus jeune', 'nom', '9', 'famille', null),
  ('e0000000-0000-4000-8000-000000000021', 'báará', '{}', 'travailler ; travail', 'verbe', '9', 'vie-quotidienne', null),
  ('e0000000-0000-4000-8000-000000000022', 'báarámáaní', '{}', 'riz de production locale', 'nom', '9', 'alimentation', null),
  ('e0000000-0000-4000-8000-000000000023', 'báaríŋkée', '{}', 'frère de même mère', 'nom', '10', 'famille', null),
  ('e0000000-0000-4000-8000-000000000024', 'báarímmúsú', '{}', 'soeur de même mère', 'nom', '10', 'famille', null),
  ('e0000000-0000-4000-8000-000000000025', 'bènnàkíní', '{bènnàcíní}', 'riz cuit dans sa sauce', 'nom', '19', 'alimentation', null),
  ('e0000000-0000-4000-8000-000000000026', 'bété(kè)', '{}', 'bien ; (interj.) bien sûr !', 'adverbe', '20', 'politesse', null),
  ('e0000000-0000-4000-8000-000000000027', 'bǐi', '{}', 'aujourd’hui', 'adverbe', '20', 'temps', 'Homonyme de bǐi « puiser » (même page).'),
  ('e0000000-0000-4000-8000-000000000028', 'bìsímìlláayí', '{}', 'au nom de Dieu', 'interjection', '21', 'politesse', null),
  ('e0000000-0000-4000-8000-000000000029', 'bítáŋkée', '{}', 'beau-père, ou beau-frère plus âgé', 'nom', '22', 'famille', null),
  ('e0000000-0000-4000-8000-000000000030', 'bólóŋ', '{}', 'chenal d’eau salée qui débouche sur un bras du fleuve', 'nom', '23', 'nature', null),
  ('e0000000-0000-4000-8000-000000000031', 'búkú', '{}', 'livre', 'nom', '26', 'vie-quotidienne', null),
  ('e0000000-0000-4000-8000-000000000032', 'búŋ', '{}', 'case, maison, pièce', 'nom', '28', 'vie-quotidienne', 'Homonyme du verbe búŋ « lancer qc sur qq, viser, piquer, attaquer » (même page).'),
  ('e0000000-0000-4000-8000-000000000033', 'dáa kùntú', '{}', 'cesser de parler à qq’un', 'locution', '36', null, null),
  ('e0000000-0000-4000-8000-000000000034', 'díi', '{}', 'donner', 'verbe', '46', null, null),
  ('e0000000-0000-4000-8000-000000000035', 'dìmáasí', '{}', 'dimanche', 'nom', '47', 'temps', 'Voir aussi àlàhádí, làhádí (p. 6).'),
  ('e0000000-0000-4000-8000-000000000036', 'dìmbáa', '{}', 'feu', 'nom', '47', 'vie-quotidienne', null),
  ('e0000000-0000-4000-8000-000000000037', 'díndíŋ', '{}', 'enfant (par opposition à adulte)', 'nom', '48', 'famille', null),
  ('e0000000-0000-4000-8000-000000000038', 'dìyàamú', '{}', 'parler ; (tr.) discuter', 'verbe', '49', null, null),
  ('e0000000-0000-4000-8000-000000000039', 'dómó', '{}', 'manger, dépenser', 'verbe', '50', 'alimentation', null),
  ('e0000000-0000-4000-8000-000000000040', 'dóokée', '{}', 'petit frère', 'nom', '51', 'famille', null),
  ('e0000000-0000-4000-8000-000000000041', 'dòokúu', '{}', 'travail', 'nom', '51', 'vie-quotidienne', 'Homonyme de dòokúu « jeter un sort à quelqu’un » (même page).'),
  ('e0000000-0000-4000-8000-000000000042', 'dúníyáa', '{}', 'le monde, la vie', 'nom', '53', null, null),
  ('e0000000-0000-4000-8000-000000000043', 'dùutáláa', '{}', 'milieu de la nuit', 'nom', '55', 'temps', null),
  ('e0000000-0000-4000-8000-000000000044', 'fàadíŋ', '{}', 'frère de même père', 'nom', '56', 'famille', null),
  ('e0000000-0000-4000-8000-000000000045', 'fàlí', '{}', 'âne', 'nom', '58', 'nature', null),
  ('e0000000-0000-4000-8000-000000000046', 'Fàrànsìŋká', '{Fáránsée}', 'Français', 'nom', '62', null, null),
  ('e0000000-0000-4000-8000-000000000047', 'fàrànsìkáŋ', '{}', 'la langue française', 'nom', '62', null, null),
  ('e0000000-0000-4000-8000-000000000048', 'fó', '{}', 'dire, parler, mentionner', 'verbe', '70', null, null),
  ('e0000000-0000-4000-8000-000000000049', 'fùlá', '{}', 'deux', 'numeral', '74', 'nombres', null),
  ('e0000000-0000-4000-8000-000000000050', 'hàrìjée', '{}', 'chance ; avoir de la chance', 'nom', '80', null, null),
  ('e0000000-0000-4000-8000-000000000051', 'háwú', '{}', 'aboyer', 'verbe', '80', 'nature', null),
  ('e0000000-0000-4000-8000-000000000052', 'háwújí', '{}', 'être pressé ; hâte', 'verbe', '80', null, null);

insert into public.dictionary_entries (id, headword, variants, translation_fr, part_of_speech, orthography, source_id, source_page, status, notes)
select id, headword, variants, translation, pos, 'creissels_2012', '5a000000-0000-4000-8000-000000000001', page, 'published',
       coalesce(notes || ' ', '') || 'Saisie initiale KARANG-DULAA, à relire par un enseignant.'
from seed_entries
on conflict (id) do nothing;

insert into public.dictionary_entry_categories (entry_id, category_id)
select s.id, c.id from seed_entries s join public.vocabulary_categories c on c.slug = s.cat
on conflict do nothing;

drop table seed_entries;

insert into public.dictionary_examples (entry_id, mandinka, french, source_page, position) values
  ('e0000000-0000-4000-8000-000000000001', 'a táatá mintoo ?', 'où est-il parti ?', '5', 0),
  ('e0000000-0000-4000-8000-000000000001', 'í yé a jé bǎŋ ?', 'est-ce que tu l’as vu ?', '5', 1),
  ('e0000000-0000-4000-8000-000000000004', 'í lá aderéesôo díi ŋ na !', 'donne-moi ton adresse !', '5', 0),
  ('e0000000-0000-4000-8000-000000000005', 'áadóolu ñánta mutalá le', 'les coutumes doivent être maintenues', '5', 0),
  ('e0000000-0000-4000-8000-000000000008', 'ali bótá mintoo ?', 'd’où venez-vous ?', '6', 0),
  ('e0000000-0000-4000-8000-000000000008', 'ali lá alikáalóo be dǐi ?', 'comment va votre chef ?', '6', 1),
  ('e0000000-0000-4000-8000-000000000009', 'alifâa ñánta buuñaalá le', 'un ancien doit être respecté', '6', 0),
  ('e0000000-0000-4000-8000-000000000013', 'táa aliméetóo sǎŋ kumfáa to !', 'va acheter des allumettes à la boutique !', '7', 0),
  ('e0000000-0000-4000-8000-000000000016', 'arajúmoo, mǒolu ka táa jáaméŋo to', 'le vendredi, on va à la mosquée', '7', 0),
  ('e0000000-0000-4000-8000-000000000021', 'a yé a la kénôo báara', 'il a travaillé son champ', '9', 0),
  ('e0000000-0000-4000-8000-000000000022', 'báarámáanôo máŋ soto sáayiŋ', 'on ne trouve pas de riz local actuellement', '9', 0),
  ('e0000000-0000-4000-8000-000000000025', 'ŋ be bennakínôo tábílá bii', 'je vais préparer du bennakínôo aujourd’hui', '19', 0),
  ('e0000000-0000-4000-8000-000000000027', 'bii fáŋo', 'aujourd’hui même', '20', 0),
  ('e0000000-0000-4000-8000-000000000027', 'bii kóola', 'dorénavant', '20', 1),
  ('e0000000-0000-4000-8000-000000000032', 'a ye lúntáŋo tambindi búŋo kóno', 'il a fait passer l’invité dans la pièce', '28', 0),
  ('e0000000-0000-4000-8000-000000000033', 'a yé a dáa kuntu ŋ na le', 'il ne me parle plus', '36', 0),
  ('e0000000-0000-4000-8000-000000000034', 'a be dómórôo díilá díndíŋo la', 'il donnera à manger à l’enfant', '46', 0),
  ('e0000000-0000-4000-8000-000000000034', 'a yé jolú le díi í la ?', 'combien t’a-t’il donné ?', '46', 1),
  ('e0000000-0000-4000-8000-000000000036', 'dimbâa mála ! = dimbáa mutandi !', 'allume le feu !', '47', 0),
  ('e0000000-0000-4000-8000-000000000038', 'a ká diyaamú dǔuma', 'il parle à voix basse', '49', 0),
  ('e0000000-0000-4000-8000-000000000038', 'a ká diyaamu sánto', 'il parle fort', '49', 1),
  ('e0000000-0000-4000-8000-000000000039', 'a búka ñêe dómo', 'il ne mange pas de poisson', '50', 0),
  ('e0000000-0000-4000-8000-000000000041', 'ñǐŋ dookúwo koleyáata báake', 'ce travail est très difficile', '51', 0),
  ('e0000000-0000-4000-8000-000000000042', 'dúníyâa díyáatá le', 'la vie est belle', '54', 0),
  ('e0000000-0000-4000-8000-000000000043', 'duutáláa lǒŋ a naata', 'il est arrivé en pleine nuit', '55', 0),
  ('e0000000-0000-4000-8000-000000000048', 'tooñâa fo ŋ ye !', 'dis-moi la vérité !', '70', 0),
  ('e0000000-0000-4000-8000-000000000048', 'jumáa le yé a fó í ye ?', 'qui te l’a dit ?', '70', 1),
  ('e0000000-0000-4000-8000-000000000049', 'a yé bǎalu fulafulasíti', 'il a acheté les chèvres deux par deux', '74', 0),
  ('e0000000-0000-4000-8000-000000000050', 'a harijéetá paláasóo la', 'il a eu la chance de trouver un poste', '80', 0),
  ('e0000000-0000-4000-8000-000000000051', 'wulóo be háwóo la', 'le chien est en train d’aboyer', '80', 0),
  ('e0000000-0000-4000-8000-000000000052', 'ŋ be hawujiriŋ ne', 'je suis pressé', '80', 0);

-- ---------------------------------------------------------------------
-- COURS DE DÉMONSTRATION : Initiation au mandinka
-- ---------------------------------------------------------------------
insert into public.courses (id, slug, title, description, level, category_id, objectives, estimated_minutes, status,
  certificate_enabled, certificate_min_score, is_demo)
select 'c0000000-0000-4000-8000-000000000001', 'initiation-au-mandinka', 'Initiation au mandinka',
  'Un premier parcours pour découvrir la langue mandinka, son espace culturel, ses sons, ses premières expressions et la construction de phrases simples. Contenu de démonstration construit à partir des ouvrages de référence de KARANG-DULAA (Creissels 2012 ; Dramé 2003), à valider par l''équipe pédagogique et des locuteurs compétents.',
  'debutant', cc.id,
  array['Situer le mandinka et l''ancien royaume du Kaabu',
        'Connaître l''alphabet et les sons particuliers (ŋ, ñ, voyelles longues)',
        'Utiliser quelques expressions de politesse',
        'Nommer des jours de la semaine et des termes de parenté',
        'Comprendre la forme déterminée des noms et construire des questions simples'],
  180, 'published', true, 70, true
from public.course_categories cc where cc.slug = 'bases'
on conflict (id) do nothing;

insert into public.course_modules (id, course_id, title, description, position) values
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Module 1 : Découvrir le mandinka', 'La langue, son histoire, ses premières expressions.', 1),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Module 2 : Apprendre les bases', 'Salutations, pronoms, nombres, jours et périodes.', 2),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Module 3 : Construire des phrases', 'Noms, verbes, phrases, questions et réponses.', 3)
on conflict (id) do nothing;

insert into public.lessons (id, module_id, title, summary, position, estimated_minutes, is_preview, is_demo) values
  ('10000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000001', 'Présentation de la langue', 'Où parle-t-on mandinka ? Comment les locuteurs nomment-ils leur langue ?', 1, 10, true, true),
  ('10000000-0000-4000-8000-000000000102', 'd0000000-0000-4000-8000-000000000001', 'Origines et espace culturel', 'Le Kaabu, de Tiramakhan Traoré à la fédération des provinces.', 2, 15, false, true),
  ('10000000-0000-4000-8000-000000000103', 'd0000000-0000-4000-8000-000000000001', 'Les premières expressions', 'Alphabet, sons particuliers et premières formules.', 3, 15, false, true),
  ('10000000-0000-4000-8000-000000000201', 'd0000000-0000-4000-8000-000000000002', 'Les salutations', 'Saluer et répondre.', 1, 10, false, true),
  ('10000000-0000-4000-8000-000000000202', 'd0000000-0000-4000-8000-000000000002', 'Les pronoms personnels', 'Formes non emphatiques et emphatiques.', 2, 15, false, true),
  ('10000000-0000-4000-8000-000000000203', 'd0000000-0000-4000-8000-000000000002', 'Les nombres', 'Premiers nombres attestés dans les exemples.', 3, 10, false, true),
  ('10000000-0000-4000-8000-000000000204', 'd0000000-0000-4000-8000-000000000002', 'Les jours et les périodes', 'Jours de la semaine et moments de la journée.', 4, 15, false, true),
  ('10000000-0000-4000-8000-000000000301', 'd0000000-0000-4000-8000-000000000003', 'Les noms', 'La forme déterminée en -o.', 1, 15, false, true),
  ('10000000-0000-4000-8000-000000000302', 'd0000000-0000-4000-8000-000000000003', 'Les verbes', 'Forme de citation avec ka.', 2, 15, false, true),
  ('10000000-0000-4000-8000-000000000303', 'd0000000-0000-4000-8000-000000000003', 'La construction des phrases', 'Observer des phrases simples.', 3, 15, false, true),
  ('10000000-0000-4000-8000-000000000304', 'd0000000-0000-4000-8000-000000000003', 'Les questions et réponses', 'Mots interrogatifs et questions oui / non.', 4, 15, false, true)
on conflict (id) do nothing;

-- Blocs de contenu ------------------------------------------------------
insert into public.lesson_contents (lesson_id, position, block_type, data) values
-- M1 L1
('10000000-0000-4000-8000-000000000101', 0, 'note', $j${"variant": "warning", "text": "Contenu de démonstration. Les informations linguistiques proviennent des ouvrages cités ; elles doivent être relues par l'équipe pédagogique et des locuteurs compétents avant usage en classe."}$j$),
('10000000-0000-4000-8000-000000000101', 1, 'heading', $j${"text": "Le mandinka, une langue mandingue", "level": 2}$j$),
('10000000-0000-4000-8000-000000000101', 2, 'paragraph', $j${"text": "Le mandinka est la variété de la langue mandingue parlée sur un territoire qui correspond à peu près à celui de l'ancien royaume du Kaabu : la Gambie, la Moyenne Casamance (Sénégal) et la partie mandingophone de la Guinée-Bissau. Il est relativement homogène et bien distinct des autres variétés de mandingue."}$j$),
('10000000-0000-4000-8000-000000000101', 3, 'note', $j${"variant": "source", "text": "D'après D. Creissels, Matériaux pour un dictionnaire mandinka (2012), p. 1."}$j$),
('10000000-0000-4000-8000-000000000101', 4, 'vocabulary', $j${"title": "Comment les locuteurs se nomment", "items": [
  {"mandinka": "Mandiŋkôo", "french": "un Mandinka (singulier)"},
  {"mandinka": "Mandiŋkóolu", "french": "les Mandinkas (pluriel)"},
  {"mandinka": "mandiŋkakáŋo", "french": "la langue mandinka"}], "source": "Creissels 2012, p. 1"}$j$),
('10000000-0000-4000-8000-000000000101', 5, 'paragraph', $j${"text": "Langue de la famille mandé, le mandinka maintient un certain degré d'intercompréhension avec d'autres langues de la famille comme le bambara, le dioula, le malinké et le khassonké. Sa communauté de locuteurs s'étend principalement sur trois États (Gambie, Sénégal, Guinée-Bissau), avec des îlots en Guinée, en Sierra Leone et au Mali."}$j$),
('10000000-0000-4000-8000-000000000101', 6, 'note', $j${"variant": "source", "text": "D'après M. L. Dramé, Parlons mandinka (2003), avant-propos, p. 8."}$j$),
-- M1 L2
('10000000-0000-4000-8000-000000000102', 0, 'note', $j${"variant": "warning", "text": "Contenu de démonstration à valider. Résumé de la première partie de Parlons mandinka (Dramé 2003, p. 13-15), qui s'appuie sur S. M. Cissoko et Y. Person (1980)."}$j$),
('10000000-0000-4000-8000-000000000102', 1, 'heading', $j${"text": "Le Kaabu", "level": 2}$j$),
('10000000-0000-4000-8000-000000000102', 2, 'paragraph', $j${"text": "Selon la tradition orale et les historiens cités par Dramé, l'histoire du Kaabu remonte au XIIIe siècle et à l'expédition de Tiramakhan Traoré, général de l'empereur Soundiata Keita du Mali. Ses descendants, Sané et Mané, auraient conquis le Pacaana, le Sama et le Jumara, qui deviennent avec le Tumannaa les premiers établissements mandingues du Kaabu."}$j$),
('10000000-0000-4000-8000-000000000102', 3, 'paragraph', $j${"text": "Province de l'Empire du Mali, le Kaabu s'en émancipe progressivement à partir du XVIe siècle, avec le déclin du Mali. Il devient à son apogée une fédération de provinces s'étendant entre la Gambie, la Haute Casamance et le Haut Geba."}$j$),
('10000000-0000-4000-8000-000000000102', 4, 'note', $j${"variant": "culture", "text": "Pour approfondir : la bibliothèque pédagogique pourra accueillir, avec les autorisations nécessaires, des textes de référence sur l'histoire du Kaabu."}$j$),
-- M1 L3
('10000000-0000-4000-8000-000000000103', 0, 'note', $j${"variant": "warning", "text": "Contenu de démonstration à valider."}$j$),
('10000000-0000-4000-8000-000000000103', 1, 'heading', $j${"text": "L'alphabet en bref", "level": 2}$j$),
('10000000-0000-4000-8000-000000000103', 2, 'paragraph', $j${"text": "Dramé (2003) décrit pour le parler central 18 consonnes et 5 voyelles, chaque voyelle ayant une contrepartie longue notée par redoublement (a/aa, e/ee, i/ii, o/oo, u/uu). L'opposition entre voyelle brève et voyelle longue distingue des mots : elle doit donc toujours être écrite."}$j$),
('10000000-0000-4000-8000-000000000103', 3, 'table', $j${"caption": "Sons particuliers (d'après Dramé 2003, p. 28)", "headers": ["Lettre", "Valeur approximative"], "rows": [
  ["c", "comme « tch » (angl. church)"], ["j", "comme « dj » (Diouf)"], ["ñ", "comme « gn » (pagne)"], ["ŋ", "comme « ng » (parking)"]]}$j$),
('10000000-0000-4000-8000-000000000103', 4, 'note', $j${"variant": "info", "text": "Deux conventions coexistent dans nos sources : Creissels (2012) note les tons (á haut, à bas, â descendant, ǎ montant) ; Dramé (2003) ne les note généralement pas. KARANG-DULAA conserve toujours l'orthographe de chaque source sans les mélanger."}$j$),
('10000000-0000-4000-8000-000000000103', 5, 'heading', $j${"text": "Premières expressions", "level": 2}$j$),
('10000000-0000-4000-8000-000000000103', 6, 'vocabulary', $j${"items": [
  {"mandinka": "àbáríká", "french": "merci", "entry_id": "e0000000-0000-4000-8000-000000000002"},
  {"mandinka": "bìsímìlláayí", "french": "au nom de Dieu", "entry_id": "e0000000-0000-4000-8000-000000000028"},
  {"mandinka": "bété(kè)", "french": "bien ; bien sûr !", "entry_id": "e0000000-0000-4000-8000-000000000026"}], "source": "Creissels 2012, p. 5, 20, 21"}$j$),
-- M2 L1
('10000000-0000-4000-8000-000000000201', 0, 'note', $j${"variant": "warning", "text": "Contenu de démonstration à valider. Seules les répliques lisibles avec certitude dans la copie numérique de Parlons mandinka sont reprises ici."}$j$),
('10000000-0000-4000-8000-000000000201', 1, 'dialogue', $j${"title": "Saluer en arrivant", "lines": [
  {"speaker": "A", "mandinka": "Salaam aleekum !", "french": "Que la paix soit sur vous !"},
  {"speaker": "B", "mandinka": "Aleekum salaam !", "french": "Et sur vous la paix !"}], "source": "Dramé 2003, quatrième partie (conversations)"}$j$),
('10000000-0000-4000-8000-000000000201', 2, 'dialogue', $j${"title": "Prendre des nouvelles", "lines": [
  {"speaker": "A", "mandinka": "Haa !", "french": "Oui !"},
  {"speaker": "B", "mandinka": "I béé bi jaŋ !", "french": "Tout le monde va bien !"}], "source": "Dramé 2003, quatrième partie (conversations)"}$j$),
('10000000-0000-4000-8000-000000000201', 3, 'note', $j${"variant": "info", "text": "À compléter par l'enseignant : le dialogue complet « Bonjour au visiteur » de Parlons mandinka doit être transcrit à partir de l'ouvrage imprimé (la copie numérique ne permet pas de lire ŋ et ñ de façon fiable), puis enregistré par un locuteur."}$j$),
-- M2 L2
('10000000-0000-4000-8000-000000000202', 0, 'note', $j${"variant": "warning", "text": "Contenu de démonstration à valider. Le tableau complet des pronoms sera établi par l'équipe pédagogique."}$j$),
('10000000-0000-4000-8000-000000000202', 1, 'table', $j${"caption": "Pronoms attestés dans les entrées de Creissels (2012)", "headers": ["Mandinka", "Français", "Page"], "rows": [
  ["a", "lui, elle, ça (non emphatique)", "5"], ["àlí, àlú", "vous (non emphatique)", "6"], ["àlìtélù, alìtólù, alùtélù…", "vous (emphatique)", "7"]]}$j$),
('10000000-0000-4000-8000-000000000202', 2, 'example', $j${"mandinka": "ŋ ŋá alitélú le kúmándi", "french": "c'est vous que j'ai appelés", "source": "Creissels 2012, p. 7"}$j$),
('10000000-0000-4000-8000-000000000202', 3, 'example', $j${"mandinka": "ŋ be hawujiriŋ ne", "french": "je suis pressé", "source": "Creissels 2012, p. 80"}$j$),
('10000000-0000-4000-8000-000000000202', 4, 'note', $j${"variant": "info", "text": "Observation : dans ces exemples, ŋ correspond à « je / me » et í à « tu / te ». Dramé (2003, deuxième partie, syntaxe) donne aussi la forme emphatique ite (« c'est toi qui… »)."}$j$),
-- M2 L3
('10000000-0000-4000-8000-000000000203', 0, 'note', $j${"variant": "warning", "text": "Contenu de démonstration à valider. Seuls les nombres attestés dans la partie du lexique actuellement numérisée (lettres a à h) figurent ici ; la liste complète sera ajoutée après vérification."}$j$),
('10000000-0000-4000-8000-000000000203', 1, 'vocabulary', $j${"items": [
  {"mandinka": "fùlá", "french": "deux", "entry_id": "e0000000-0000-4000-8000-000000000049"}], "source": "Creissels 2012, p. 74"}$j$),
('10000000-0000-4000-8000-000000000203', 2, 'example', $j${"mandinka": "a yé bǎalu fulafulasíti", "french": "il a acheté les chèvres deux par deux", "source": "Creissels 2012, p. 74"}$j$),
-- M2 L4
('10000000-0000-4000-8000-000000000204', 0, 'note', $j${"variant": "warning", "text": "Contenu de démonstration à valider. Lundi, mardi et samedi relèvent de parties du lexique non encore saisies : voir le devoir associé."}$j$),
('10000000-0000-4000-8000-000000000204', 1, 'vocabulary', $j${"title": "Jours de la semaine", "items": [
  {"mandinka": "àlàhádí, làhádí", "french": "dimanche", "entry_id": "e0000000-0000-4000-8000-000000000007"},
  {"mandinka": "dìmáasí", "french": "dimanche", "entry_id": "e0000000-0000-4000-8000-000000000035"},
  {"mandinka": "àrábá", "french": "mercredi", "entry_id": "e0000000-0000-4000-8000-000000000014"},
  {"mandinka": "àràamísá", "french": "jeudi", "entry_id": "e0000000-0000-4000-8000-000000000015"},
  {"mandinka": "àràjúmá, júmá", "french": "vendredi", "entry_id": "e0000000-0000-4000-8000-000000000016"}], "source": "Creissels 2012, p. 6, 7, 47"}$j$),
('10000000-0000-4000-8000-000000000204', 2, 'vocabulary', $j${"title": "Moments", "items": [
  {"mandinka": "bǐi", "french": "aujourd'hui", "entry_id": "e0000000-0000-4000-8000-000000000027"},
  {"mandinka": "dùutáláa", "french": "milieu de la nuit", "entry_id": "e0000000-0000-4000-8000-000000000043"}], "source": "Creissels 2012, p. 20, 55"}$j$),
('10000000-0000-4000-8000-000000000204', 3, 'example', $j${"mandinka": "arajúmoo, mǒolu ka táa jáaméŋo to", "french": "le vendredi, on va à la mosquée", "source": "Creissels 2012, p. 7"}$j$),
-- M3 L1
('10000000-0000-4000-8000-000000000301', 0, 'note', $j${"variant": "warning", "text": "Contenu de démonstration à valider."}$j$),
('10000000-0000-4000-8000-000000000301', 1, 'paragraph', $j${"text": "Les mandingophones citent les noms à la forme déterminée, formée par l'ajout d'un suffixe -o à ton bas. Ce suffixe s'amalgame avec la voyelle finale du nom. Les noms terminés par -ŋ ne subissent que la resyllabation du ŋ (sáŋ « lièvre » → sáŋò)."}$j$),
('10000000-0000-4000-8000-000000000301', 2, 'table', $j${"caption": "Forme nue → forme déterminée (Creissels 2012, p. 4)", "headers": ["Forme nue", "Sens", "Forme déterminée"], "rows": [
  ["básá", "lézard", "básóo"], ["kèlé", "guerre", "kèlóo"], ["jàlí", "griot", "jàlóo"], ["bòotó", "sac", "bòotóo"], ["kúlú", "os", "kúlóo"], ["kùcáa", "oseille", "kùcáa"], ["sáŋ", "lièvre", "sáŋò"]]}$j$),
('10000000-0000-4000-8000-000000000301', 3, 'note', $j${"variant": "info", "text": "Dramé (2003) souligne que ce -o final à ton bas distingue le mandinka du bambara et du dioula, où la détermination est marquée par un ton flottant."}$j$),
-- M3 L2
('10000000-0000-4000-8000-000000000302', 0, 'note', $j${"variant": "warning", "text": "Contenu de démonstration à valider."}$j$),
('10000000-0000-4000-8000-000000000302', 1, 'paragraph', $j${"text": "Les locuteurs ne citent pas un verbe à sa forme nue : ils le font précéder du marqueur d'infinitif ka (par exemple ka dómó « manger »). Le dictionnaire, lui, donne la forme nue."}$j$),
('10000000-0000-4000-8000-000000000302', 2, 'vocabulary', $j${"items": [
  {"mandinka": "dómó", "french": "manger, dépenser", "entry_id": "e0000000-0000-4000-8000-000000000039"},
  {"mandinka": "díi", "french": "donner", "entry_id": "e0000000-0000-4000-8000-000000000034"},
  {"mandinka": "fó", "french": "dire, parler, mentionner", "entry_id": "e0000000-0000-4000-8000-000000000048"},
  {"mandinka": "dìyàamú", "french": "parler ; discuter", "entry_id": "e0000000-0000-4000-8000-000000000038"},
  {"mandinka": "báará", "french": "travailler", "entry_id": "e0000000-0000-4000-8000-000000000021"}], "source": "Creissels 2012, p. 4, 9, 46, 49, 50, 70"}$j$),
('10000000-0000-4000-8000-000000000302', 3, 'example', $j${"mandinka": "a búka ñêe dómo", "french": "il ne mange pas de poisson", "source": "Creissels 2012, p. 50"}$j$),
-- M3 L3
('10000000-0000-4000-8000-000000000303', 0, 'note', $j${"variant": "warning", "text": "Contenu de démonstration à valider. Observez les phrases : les règles seront formulées par l'équipe pédagogique à partir de la partie syntaxe de Dramé (2003)."}$j$),
('10000000-0000-4000-8000-000000000303', 1, 'example', $j${"mandinka": "a yé a la kénôo báara", "french": "il a travaillé son champ", "source": "Creissels 2012, p. 9"}$j$),
('10000000-0000-4000-8000-000000000303', 2, 'example', $j${"mandinka": "a be dómórôo díilá díndíŋo la", "french": "il donnera à manger à l'enfant", "source": "Creissels 2012, p. 46"}$j$),
('10000000-0000-4000-8000-000000000303', 3, 'paragraph', $j${"text": "Le mandinka n'a ni pronoms ni adjectifs possessifs : il utilise des périphrases. L'une d'elles a la forme « possesseur + la + terme possédé », où la (« de ») s'écrit séparé du pronom."}$j$),
('10000000-0000-4000-8000-000000000303', 4, 'example', $j${"mandinka": "ali lá alikáalóo be dǐi ?", "french": "comment va votre chef ?", "source": "Creissels 2012, p. 6"}$j$),
('10000000-0000-4000-8000-000000000303', 5, 'note', $j${"variant": "source", "text": "Dramé 2003, deuxième partie (morphologie), structures nominales possessives."}$j$),
-- M3 L4
('10000000-0000-4000-8000-000000000304', 0, 'note', $j${"variant": "warning", "text": "Contenu de démonstration à valider."}$j$),
('10000000-0000-4000-8000-000000000304', 1, 'paragraph', $j${"text": "Questions oui / non : selon Dramé (2003, p. 52), elles se construisent avec les particules interrogatives muna … ? ou kori … ?, dont la présence est facultative : souvent, l'intonation suffit."}$j$),
('10000000-0000-4000-8000-000000000304', 2, 'heading', $j${"text": "Questions avec mot interrogatif", "level": 3}$j$),
('10000000-0000-4000-8000-000000000304', 3, 'example', $j${"mandinka": "a táatá mintoo ?", "french": "où est-il parti ?", "source": "Creissels 2012, p. 5"}$j$),
('10000000-0000-4000-8000-000000000304', 4, 'example', $j${"mandinka": "ali bótá mintoo ?", "french": "d'où venez-vous ?", "source": "Creissels 2012, p. 6"}$j$),
('10000000-0000-4000-8000-000000000304', 5, 'example', $j${"mandinka": "jumáa le yé a fó í ye ?", "french": "qui te l'a dit ?", "source": "Creissels 2012, p. 70"}$j$),
('10000000-0000-4000-8000-000000000304', 6, 'example', $j${"mandinka": "a yé jolú le díi í la ?", "french": "combien t'a-t-il donné ?", "source": "Creissels 2012, p. 46"}$j$),
('10000000-0000-4000-8000-000000000304', 7, 'note', $j${"variant": "info", "text": "D'après les traductions, mintoo correspond à « où », jumáa à « qui » et jolú à « combien ». À confirmer avec un enseignant."}$j$);

-- Exercices ---------------------------------------------------------------
insert into public.exercises (id, course_id, module_id, lesson_id, title, description, kind, difficulty, pass_score, is_published) values
  ('ee000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000204',
   'Quiz : les jours', 'Vérifiez vos connaissances sur les jours et les moments.', 'quiz', 1, 70, true),
  ('ee000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', null,
   'Contrôle du module 1', 'La langue, le Kaabu et les premières expressions.', 'module_test', 1, 70, true),
  ('ee000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000304',
   'Exercice : construire des questions', 'Remettre les mots dans l''ordre et reconnaître les formes.', 'exercise', 2, 60, true),
  ('ee000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', null, null,
   'Évaluation finale', 'Évaluation de fin de cours, requise pour le certificat.', 'final_exam', 2, 70, true)
on conflict (id) do nothing;

insert into public.questions (id, exercise_id, position, type, prompt, explanation, points, data) values
  ('aa000000-0000-4000-8000-000000000101', 'ee000000-0000-4000-8000-000000000001', 1, 'mcq', 'Que signifie « àràjúmá » ?', 'Creissels (2012, p. 7) : àràjúmá, júmá « vendredi ».', 1, '{}'),
  ('aa000000-0000-4000-8000-000000000102', 'ee000000-0000-4000-8000-000000000001', 2, 'matching', 'Associez chaque mot à sa traduction.', 'Creissels (2012), p. 6, 7 et 20.', 2, '{}'),
  ('aa000000-0000-4000-8000-000000000103', 'ee000000-0000-4000-8000-000000000001', 3, 'translation', 'Traduisez en mandinka : « aujourd''hui »', 'Creissels (2012, p. 20) : bǐi « aujourd''hui ». Les tons ne sont pas exigés ici.', 1, '{"ignore_tones": true, "direction": "fr-mnk"}'),
  ('aa000000-0000-4000-8000-000000000104', 'ee000000-0000-4000-8000-000000000001', 4, 'true_false', '« dìmáasí » et « àlàhádí » sont tous deux donnés pour « dimanche » par Creissels (2012).', 'Vrai : p. 6 (àlàhádí, làhádí) et p. 47 (dìmáasí).', 1, '{}'),
  ('aa000000-0000-4000-8000-000000000201', 'ee000000-0000-4000-8000-000000000002', 1, 'mcq', 'Comment les locuteurs appellent-ils leur langue, selon Creissels (2012) ?', 'mandiŋkakáŋo désigne la langue ; Mandiŋkóolu désigne les locuteurs (p. 1).', 1, '{}'),
  ('aa000000-0000-4000-8000-000000000202', 'ee000000-0000-4000-8000-000000000002', 2, 'multi', 'Dans quels États le mandinka est-il principalement parlé ?', 'Gambie, Sénégal (Casamance) et Guinée-Bissau (Dramé 2003 ; Creissels 2012).', 2, '{}'),
  ('aa000000-0000-4000-8000-000000000203', 'ee000000-0000-4000-8000-000000000002', 3, 'mcq', 'Quel général de Soundiata Keita est présenté comme le fondateur du Kaabu ?', 'Dramé (2003, p. 13-15), d''après la tradition orale et S. M. Cissoko.', 1, '{}'),
  ('aa000000-0000-4000-8000-000000000204', 'ee000000-0000-4000-8000-000000000002', 4, 'fill_blank', 'Complétez : « merci » se dit ____ .', 'Creissels (2012, p. 5) : àbáríká.', 1, '{"ignore_tones": true}'),
  ('aa000000-0000-4000-8000-000000000301', 'ee000000-0000-4000-8000-000000000003', 1, 'word_order', 'Remettez les mots dans l''ordre pour dire « où est-il parti ? »', 'Creissels (2012, p. 5) : a táatá mintoo ?', 1, '{"tokens": ["a", "táatá", "mintoo"], "ignore_tones": true}'),
  ('aa000000-0000-4000-8000-000000000302', 'ee000000-0000-4000-8000-000000000003', 2, 'mcq', 'Dans « ali bótá mintoo ? » (d''où venez-vous ?), que signifie « ali » ?', 'àlí, àlú : vous, forme non emphatique (Creissels 2012, p. 6).', 1, '{}'),
  ('aa000000-0000-4000-8000-000000000303', 'ee000000-0000-4000-8000-000000000003', 3, 'fill_blank', 'Forme déterminée de « jàlí » (griot) : ____', 'jàlí + -o → jàlóo (Creissels 2012, p. 4).', 1, '{"ignore_tones": true}'),
  ('aa000000-0000-4000-8000-000000000401', 'ee000000-0000-4000-8000-000000000004', 1, 'mcq', 'Que signifie « báamáa » ?', 'Creissels (2012, p. 9).', 1, '{}'),
  ('aa000000-0000-4000-8000-000000000402', 'ee000000-0000-4000-8000-000000000004', 2, 'translation', 'Traduisez en français : « dómó »', 'Creissels (2012, p. 50) : manger, dépenser.', 1, '{"ignore_tones": true, "direction": "mnk-fr"}'),
  ('aa000000-0000-4000-8000-000000000403', 'ee000000-0000-4000-8000-000000000004', 3, 'matching', 'Associez les termes de parenté.', 'Creissels (2012), p. 10, 51 et 56.', 3, '{}'),
  ('aa000000-0000-4000-8000-000000000404', 'ee000000-0000-4000-8000-000000000004', 4, 'true_false', 'Dans Parlons mandinka, les voyelles longues sont notées par redoublement (aa, ee, ii, oo, uu).', 'Vrai (Dramé 2003, p. 29).', 1, '{}'),
  ('aa000000-0000-4000-8000-000000000405', 'ee000000-0000-4000-8000-000000000004', 5, 'fill_blank', 'Forme déterminée de « kúlú » (os) : ____', 'kúlú + -o → kúlóo (Creissels 2012, p. 4).', 1, '{"ignore_tones": true}')
on conflict (id) do nothing;

insert into public.answers (question_id, position, content, is_correct, match_key) values
  ('aa000000-0000-4000-8000-000000000101', 1, 'vendredi', true, null),
  ('aa000000-0000-4000-8000-000000000101', 2, 'jeudi', false, null),
  ('aa000000-0000-4000-8000-000000000101', 3, 'mercredi', false, null),
  ('aa000000-0000-4000-8000-000000000101', 4, 'dimanche', false, null),
  ('aa000000-0000-4000-8000-000000000102', 1, 'àrábá', false, 'mercredi'),
  ('aa000000-0000-4000-8000-000000000102', 2, 'àràamísá', false, 'jeudi'),
  ('aa000000-0000-4000-8000-000000000102', 3, 'àlàhádí', false, 'dimanche'),
  ('aa000000-0000-4000-8000-000000000102', 4, 'bǐi', false, 'aujourd’hui'),
  ('aa000000-0000-4000-8000-000000000103', 1, 'bǐi', true, null),
  ('aa000000-0000-4000-8000-000000000104', 1, 'Vrai', true, null),
  ('aa000000-0000-4000-8000-000000000104', 2, 'Faux', false, null),
  ('aa000000-0000-4000-8000-000000000201', 1, 'mandiŋkakáŋo', true, null),
  ('aa000000-0000-4000-8000-000000000201', 2, 'Mandiŋkóolu', false, null),
  ('aa000000-0000-4000-8000-000000000201', 3, 'Kaabu', false, null),
  ('aa000000-0000-4000-8000-000000000202', 1, 'Gambie', true, null),
  ('aa000000-0000-4000-8000-000000000202', 2, 'Sénégal', true, null),
  ('aa000000-0000-4000-8000-000000000202', 3, 'Guinée-Bissau', true, null),
  ('aa000000-0000-4000-8000-000000000202', 4, 'Mauritanie', false, null),
  ('aa000000-0000-4000-8000-000000000203', 1, 'Tiramakhan Traoré', true, null),
  ('aa000000-0000-4000-8000-000000000203', 2, 'Askia Daoud', false, null),
  ('aa000000-0000-4000-8000-000000000203', 3, 'Mansa Aboubacar II', false, null),
  ('aa000000-0000-4000-8000-000000000204', 1, 'àbáríká', true, null),
  ('aa000000-0000-4000-8000-000000000301', 1, 'a táatá mintoo', true, null),
  ('aa000000-0000-4000-8000-000000000302', 1, 'vous', true, null),
  ('aa000000-0000-4000-8000-000000000302', 2, 'nous', false, null),
  ('aa000000-0000-4000-8000-000000000302', 3, 'il / elle', false, null),
  ('aa000000-0000-4000-8000-000000000303', 1, 'jàlóo', true, null),
  ('aa000000-0000-4000-8000-000000000401', 1, 'mère', true, null),
  ('aa000000-0000-4000-8000-000000000401', 2, 'père', false, null),
  ('aa000000-0000-4000-8000-000000000401', 3, 'enfant', false, null),
  ('aa000000-0000-4000-8000-000000000402', 1, 'manger', true, null),
  ('aa000000-0000-4000-8000-000000000402', 2, 'manger, dépenser', true, null),
  ('aa000000-0000-4000-8000-000000000402', 3, 'dépenser', true, null),
  ('aa000000-0000-4000-8000-000000000403', 1, 'báaríŋkée', false, 'frère de même mère'),
  ('aa000000-0000-4000-8000-000000000403', 2, 'fàadíŋ', false, 'frère de même père'),
  ('aa000000-0000-4000-8000-000000000403', 3, 'dóokée', false, 'petit frère'),
  ('aa000000-0000-4000-8000-000000000404', 1, 'Vrai', true, null),
  ('aa000000-0000-4000-8000-000000000404', 2, 'Faux', false, null),
  ('aa000000-0000-4000-8000-000000000405', 1, 'kúlóo', true, null);

insert into public.lesson_contents (lesson_id, position, block_type, data) values
  ('10000000-0000-4000-8000-000000000204', 10, 'exercise_link', '{"exercise_id": "ee000000-0000-4000-8000-000000000001", "label": "Faire le quiz : les jours"}'),
  ('10000000-0000-4000-8000-000000000304', 10, 'exercise_link', '{"exercise_id": "ee000000-0000-4000-8000-000000000003", "label": "Exercice : construire des questions"}');

insert into public.assignments (id, course_id, lesson_id, title, instructions, max_score) values
  ('a5000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000204',
   'Enquête : les jours manquants',
   'Demandez à un locuteur mandinka comment se disent lundi, mardi et samedi. Notez : (1) le mot tel que vous l''entendez, (2) le nom et la région du locuteur (avec son accord), (3) une phrase d''exemple. Votre enseignant vérifiera et pourra proposer ces mots au dictionnaire.',
   20)
on conflict (id) do nothing;

insert into public.lesson_contents (lesson_id, position, block_type, data) values
  ('10000000-0000-4000-8000-000000000204', 11, 'assignment_link', '{"assignment_id": "a5000000-0000-4000-8000-000000000001", "label": "Devoir : les jours manquants"}');
