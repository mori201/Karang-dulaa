import Link from "next/link";
import {
  BookOpenText, Bot, Brain, GraduationCap, Headphones, Library, Mic, ScrollText, ShieldCheck, Sparkles, Trophy, Users,
} from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import { CourseCard } from "@/components/course/CourseCard";
import { LogoMark } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

async function loadHome() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const [stats, courses, teachers, testimonials] = await Promise.all([
    supabase.rpc("public_stats"),
    supabase.from("courses").select("id, slug, title, description, level, cover_url, estimated_minutes, is_demo, lessons(count)")
      .eq("status", "published").order("published_at", { ascending: false }).limit(3),
    supabase.from("teachers").select("user_id, title, bio, specialties, profiles(full_name, first_name, avatar_url)").eq("is_public", true).limit(6),
    supabase.from("testimonials").select("id, author_name, author_context, content").eq("approved", true).order("created_at", { ascending: false }).limit(3),
  ]);
  return {
    stats: (stats.data ?? null) as null | { learners: number; courses: number; lessons: number; entries: number; lessons_completed: number },
    courses: courses.data ?? [],
    teachers: teachers.data ?? [],
    testimonials: testimonials.data ?? [],
  };
}

const FEATURES = [
  { icon: GraduationCap, title: "Académie des cours", text: "Des cours structurés en modules et leçons, du niveau débutant au niveau avancé.", href: "/academie" },
  { icon: BookOpenText, title: "Dictionnaire sourcé", text: "Mandinka-français et français-mandinka, avec la source et la page de chaque entrée.", href: "/dictionnaire" },
  { icon: Brain, title: "Exercices interactifs", text: "QCM, association, phrases à compléter, mots à remettre en ordre, traductions, corrigés expliqués.", href: "/academie" },
  { icon: Headphones, title: "Laboratoire de prononciation", text: "Écoutez des locuteurs, ralentissez l’enregistrement, enregistrez-vous et comparez.", href: "/prononciation" },
  { icon: Sparkles, title: "Cartes mémoire", text: "Révisez le vocabulaire avec la répétition espacée.", href: "/cartes" },
  { icon: Bot, title: "DULAA AI", text: "Un assistant qui s’appuie d’abord sur la base documentaire validée et signale ses incertitudes.", href: "/assistant" },
  { icon: Library, title: "Bibliothèque", text: "Fiches, textes de lecture, dialogues et supports de cours.", href: "/bibliotheque" },
  { icon: Trophy, title: "Motivation", text: "Points d’expérience, badges, séries de jours, objectifs et certificats vérifiables.", href: "/inscription" },
];

const FAQ = [
  { q: "Faut-il connaître le mandinka pour commencer ?", a: "Non. Le parcours « Initiation » part de zéro : présentation de la langue, alphabet, premières expressions." },
  { q: "L’inscription est-elle gratuite ?", a: "Oui, la création d’un compte apprenant est gratuite. Elle permet de suivre les cours, d’enregistrer sa progression et d’accéder à l’ensemble du dictionnaire." },
  { q: "D’où viennent les mots du dictionnaire ?", a: "Chaque entrée indique sa source (par exemple D. Creissels, 2012, ou M. L. Dramé, 2003) et la page de référence. Les propositions des utilisateurs sont vérifiées par un enseignant avant publication." },
  { q: "Pourquoi certains mots portent-ils des accents ?", a: "Le mandinka est une langue à tons. Certains ouvrages, comme celui de Creissels, notent les tons (á haut, à bas…), d’autres non. Nous conservons l’écriture de chaque source sans la modifier, et la recherche fonctionne avec ou sans accents." },
  { q: "L’assistant DULAA AI peut-il se tromper ?", a: "Oui. Il privilégie la base documentaire validée, cite ses sources et distingue ce qui est documenté de ce qui est suggéré. Pour toute question importante, vérifiez auprès d’un enseignant." },
  { q: "L’application fonctionne-t-elle avec une connexion lente ?", a: "Oui : les pages sont légères, n’utilisent pas de polices téléchargées et les médias ne se chargent qu’à la demande." },
];

export default async function HomePage() {
  const data = await loadHome();
  const stats = data?.stats;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-forest text-white">
        <div className="absolute inset-0 bg-kd-pattern opacity-60" aria-hidden />
        <div className="container-kd relative grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold-200">
              L’école virtuelle de la langue mandinka
            </p>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
              Apprendre le mandinka, <span className="text-gold-300">préserver notre héritage.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-forest-100">
              Découvrez la richesse de la langue mandinka grâce à une expérience d’apprentissage moderne, interactive et accessible à tous.
              Apprenez à parler, comprendre, lire et écrire le mandinka à votre rythme.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/inscription" variant="gold" size="lg">Commencer à apprendre</ButtonLink>
              <ButtonLink href="/academie" size="lg" className="border border-white/30 bg-white/10 hover:bg-white/20">Découvrir les cours</ButtonLink>
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-3xl bg-white/95 p-6 text-ink shadow-2xl">
              <div className="flex items-center gap-3">
                <LogoMark className="h-12 w-12" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gold-600">Mot du jour</div>
                  <div className="mnk text-2xl font-extrabold text-forest">àbáríká</div>
                </div>
              </div>
              <p className="mt-3 text-lg font-semibold">« merci »</p>
              <p className="mt-1 text-xs text-ink-400">D. Creissels, <i>Matériaux pour un dictionnaire mandinka</i>, 2012, p. 5. Tons notés selon l’auteur.</p>
              <div className="mt-4 rounded-xl bg-sand p-3 text-sm">
                <div className="mnk font-semibold">ali bótá mintoo ?</div>
                <div className="text-ink-500">« d’où venez-vous ? » <span className="text-xs text-ink-400">(ibid., p. 6)</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTIQUES (réelles) */}
      {stats && (
        <section aria-label="L’école en chiffres" className="border-b border-sand-300 bg-white">
          <div className="container-kd grid grid-cols-2 gap-4 py-6 text-center sm:grid-cols-4">
            {[
              { v: stats.learners, l: "apprenants inscrits" },
              { v: stats.courses, l: "cours publiés" },
              { v: stats.entries, l: "entrées au dictionnaire" },
              { v: stats.lessons_completed, l: "leçons terminées" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-3xl font-extrabold text-forest">{s.v.toLocaleString("fr-FR")}</div>
                <div className="text-sm text-ink-500">{s.l}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LA LANGUE */}
      <section className="container-kd grid gap-8 py-16 lg:grid-cols-2" id="langue">
        <div>
          <h2 className="text-2xl font-extrabold sm:text-3xl">La langue mandinka</h2>
          <p className="mt-4 text-ink-600">
            Le mandinka est la variété de la langue mandingue parlée sur le territoire de l’ancien royaume du Kaabu : la Gambie, la Moyenne
            Casamance au Sénégal et la partie mandingophone de la Guinée-Bissau. Ses locuteurs se nomment <span className="mnk font-semibold">Mandiŋkóolu</span> et
            appellent leur langue <span className="mnk font-semibold">mandiŋkakáŋo</span>.
          </p>
          <p className="mt-3 text-ink-600">
            Langue de la grande famille mandé, elle partage un certain degré d’intercompréhension avec le bambara, le dioula, le malinké et le khassonké,
            et porte une culture orale d’une grande richesse : récits du Kaabu, proverbes, chants des griots.
          </p>
          <p className="mt-3 text-xs text-ink-400">Sources : D. Creissels (2012), p. 1 ; M. L. Dramé, <i>Parlons mandinka</i> (2003), avant-propos.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { t: "18 consonnes, 5 voyelles", d: "Chaque voyelle a une forme brève et une forme longue (a / aa) qui distinguent des mots." },
            { t: "Une langue à tons", d: "La hauteur de la voix distingue des mots ; certains ouvrages la notent par des accents." },
            { t: "Des sons particuliers", d: "ŋ comme dans « parking », ñ comme dans « pagne », c proche de « tch »." },
            { t: "Gambie, Sénégal, Guinée-Bissau", d: "Et des communautés en Guinée, en Sierra Leone, au Mali et dans la diaspora." },
          ].map((x) => (
            <Card key={x.t} className="bg-sand-100">
              <div className="font-bold text-forest">{x.t}</div>
              <p className="mt-1 text-sm text-ink-500">{x.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section className="bg-white py-16">
        <div className="container-kd">
          <h2 className="text-center text-2xl font-extrabold sm:text-3xl">Tout pour apprendre, au même endroit</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Link key={f.title} href={f.href} className="group rounded-2xl border border-sand-300 p-5 transition hover:border-forest-200 hover:bg-forest-50/40">
                <f.icon className="h-7 w-7 text-gold-500" aria-hidden />
                <h3 className="mt-3 font-bold group-hover:text-forest">{f.title}</h3>
                <p className="mt-1 text-sm text-ink-500">{f.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* COURS */}
      <section className="container-kd py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Cours disponibles</h2>
          <Link href="/academie" className="link text-sm">Voir tous les cours →</Link>
        </div>
        {data && data.courses.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.courses.map((c) => (
              <CourseCard key={c.id} course={c} lessons={(c.lessons as unknown as { count: number }[])?.[0]?.count ?? 0} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-ink-500">Les premiers cours sont en préparation par l’équipe pédagogique.</p>
        )}
      </section>

      {/* ENSEIGNANTS */}
      {data && data.teachers.length > 0 && (
        <section className="bg-white py-16">
          <div className="container-kd">
            <h2 className="text-2xl font-extrabold sm:text-3xl">L’équipe pédagogique</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.teachers.map((t) => {
                const p = t.profiles as unknown as { full_name: string; first_name: string } | null;
                return (
                  <Card key={t.user_id} className="flex gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-forest text-lg font-bold text-white">
                      {(p?.full_name || p?.first_name || "?").slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-bold">{p?.full_name || p?.first_name}</div>
                      {t.title && <div className="text-sm text-gold-600">{t.title}</div>}
                      {t.bio && <p className="mt-1 line-clamp-3 text-sm text-ink-500">{t.bio}</p>}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* TÉMOIGNAGES (uniquement s'il en existe de validés) */}
      {data && data.testimonials.length > 0 && (
        <section className="container-kd py-16">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Ils apprennent avec KARANG-DULAA</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {data.testimonials.map((t) => (
              <Card key={t.id}>
                <p className="text-ink-600">« {t.content} »</p>
                <p className="mt-3 text-sm font-bold">{t.author_name}</p>
                {t.author_context && <p className="text-xs text-ink-400">{t.author_context}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ENGAGEMENTS */}
      <section className="bg-forest-800 py-14 text-white">
        <div className="container-kd grid gap-6 md:grid-cols-3">
          {[
            { icon: ScrollText, t: "Des sources citées", d: "Chaque mot et chaque exemple renvoient à leur ouvrage et à leur page." },
            { icon: Users, t: "Validé par des humains", d: "Enseignants et locuteurs vérifient les contenus et les propositions." },
            { icon: ShieldCheck, t: "Respect des droits", d: "Les ouvrages importés restent privés tant que leur diffusion n’est pas autorisée." },
          ].map((x) => (
            <div key={x.t} className="flex gap-3">
              <x.icon className="h-7 w-7 shrink-0 text-gold-300" aria-hidden />
              <div>
                <div className="font-bold">{x.t}</div>
                <p className="text-sm text-forest-200">{x.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container-kd py-16" id="faq">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Questions fréquentes</h2>
        <div className="mt-6 divide-y divide-sand-300 rounded-2xl border border-sand-300 bg-white">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="mr-2 text-gold-500 group-open:hidden">+</span>
                <span className="mr-2 hidden text-gold-500 group-open:inline">–</span>
                {f.q}
              </summary>
              <p className="mt-2 text-ink-500">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 rounded-3xl bg-gold-50 p-8 text-center">
          <Mic className="mx-auto h-8 w-8 text-gold-600" aria-hidden />
          <h2 className="mt-2 text-xl font-extrabold">Vous parlez mandinka ?</h2>
          <p className="mx-auto mt-1 max-w-xl text-ink-500">
            Proposez des mots, des exemples ou des enregistrements : vos contributions, validées par l’équipe pédagogique, enrichissent l’école pour tous.
          </p>
          <ButtonLink href="/dictionnaire/proposer" className="mt-4">Proposer un mot</ButtonLink>
        </div>
      </section>
    </>
  );
}
