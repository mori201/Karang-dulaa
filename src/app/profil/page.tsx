import type { Metadata } from "next";
import Link from "next/link";
import { Award, Flame, KeyRound, ScrollText, Star } from "lucide-react";
import { Badge, Card, Field, Input, PageHeader, ProgressBar, StatCard, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { LEVEL_LABELS, formatDate, xpLevel } from "@/lib/utils";
import { deleteAccountAction, submitTestimonialAction, updateProfileAction } from "./actions";

export const metadata: Metadata = { title: "Profil et progression" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/profil");
  const p = user.profile;
  const supabase = await createClient();
  const [{ data: badges }, { data: certs }, { data: teacher }, { data: xp }] = await Promise.all([
    supabase.from("student_achievements").select("awarded_at, achievements(title, description)").eq("student_id", user.id).order("awarded_at", { ascending: false }),
    supabase.from("certificates").select("code, course_title, issued_at, revoked").eq("student_id", user.id).order("issued_at", { ascending: false }),
    user.isTeacher ? supabase.from("teachers").select("title, is_public").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("xp_events").select("amount, reason, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
  ]);
  const lvl = xpLevel(p.xp);
  const REASONS: Record<string, string> = { lesson_completed: "Leçon terminée", exercise_passed: "Exercice réussi", exercise_attempt: "Exercice tenté", course_completed: "Cours terminé", flashcard: "Carte révisée", achievement: "Badge obtenu" };

  return (
    <div className="container-kd max-w-5xl py-8">
      <PageHeader title="Profil et progression" description={`Membre depuis le ${formatDate(p.created_at)} · ${user.email}`} />
      <Flash searchParams={sp} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Niveau" value={lvl.level} hint={`${p.xp} XP`} icon={<Star className="h-5 w-5" />} />
        <StatCard label="Niveau de langue" value={LEVEL_LABELS[p.level]} icon={<ScrollText className="h-5 w-5" />} />
        <StatCard label="Série actuelle" value={`${p.current_streak} j`} hint={`Record : ${p.longest_streak} j`} icon={<Flame className="h-5 w-5" />} />
        <StatCard label="Badges" value={(badges ?? []).length} icon={<Award className="h-5 w-5" />} />
      </div>
      <ProgressBar value={lvl.progress} className="mt-4" label="Progression vers le niveau suivant" />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="font-bold">Mes informations</h2>
          <form action={updateProfileAction} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" htmlFor="first_name" required><Input id="first_name" name="first_name" defaultValue={p.first_name} required maxLength={60} /></Field>
              <Field label="Nom complet (certificats)" htmlFor="full_name"><Input id="full_name" name="full_name" defaultValue={p.full_name} maxLength={140} /></Field>
            </div>
            <Field label="Présentation" htmlFor="bio"><Textarea id="bio" name="bio" defaultValue={p.bio ?? ""} maxLength={1000} /></Field>
            <Field label="Photo de profil" htmlFor="avatar" hint="JPG, PNG ou WebP, 5 Mo maximum."><input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="block text-sm" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Objectif hebdomadaire (minutes)" htmlFor="weekly_goal_minutes"><Input id="weekly_goal_minutes" name="weekly_goal_minutes" type="number" min={10} max={1200} defaultValue={p.weekly_goal_minutes} /></Field>
              <Field label="Objectif quotidien (XP)" htmlFor="daily_goal_xp"><Input id="daily_goal_xp" name="daily_goal_xp" type="number" min={5} max={500} defaultValue={p.daily_goal_xp} /></Field>
            </div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="show_in_leaderboard" defaultChecked={p.show_in_leaderboard} className="mt-1 accent-forest" /> Apparaître dans le classement (prénom et XP uniquement).</label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="recording_consent" defaultChecked={p.recording_consent} className="mt-1 accent-forest" /> Conserver mes enregistrements de prononciation dans mon espace privé.</label>
            {user.isTeacher && (
              <div className="rounded-xl bg-sand-100 p-4">
                <p className="mb-3 text-sm font-bold">Profil enseignant</p>
                <Field label="Titre affiché" htmlFor="teacher_title"><Input id="teacher_title" name="teacher_title" defaultValue={(teacher as { title?: string } | null)?.title ?? ""} placeholder="Ex. : Professeur de mandinka, Sédhiou" /></Field>
                <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="teacher_public" defaultChecked={(teacher as { is_public?: boolean } | null)?.is_public ?? true} className="accent-forest" /> Afficher mon profil sur la page d’accueil</label>
              </div>
            )}
            <SubmitButton>Enregistrer</SubmitButton>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-bold">Certificats</h2>
            {(certs ?? []).length === 0 ? <p className="mt-2 text-sm text-ink-500">Aucun certificat pour l’instant.</p> : (
              <ul className="mt-2 space-y-2 text-sm">{(certs ?? []).map((c) => <li key={c.code}><Link className="link" href={`/certificats/${c.code}`}>{c.course_title}</Link> <span className="text-xs text-ink-400">{formatDate(c.issued_at, { dateStyle: "short" })}</span> {c.revoked && <Badge tone="red">Révoqué</Badge>}</li>)}</ul>
            )}
          </Card>
          <Card>
            <h2 className="font-bold">Badges obtenus</h2>
            {(badges ?? []).length === 0 ? <p className="mt-2 text-sm text-ink-500">Terminez une leçon pour obtenir votre premier badge !</p> : (
              <ul className="mt-2 space-y-2 text-sm">{(badges ?? []).map((b, i) => { const a = b.achievements as unknown as { title: string; description: string }; return <li key={i}>🏅 <strong>{a.title}</strong><br /><span className="text-xs text-ink-500">{a.description}</span></li>; })}</ul>
            )}
          </Card>
          <Card>
            <h2 className="font-bold">Derniers points</h2>
            <ul className="mt-2 space-y-1 text-sm">{(xp ?? []).map((x, i) => <li key={i} className="flex justify-between"><span>{REASONS[x.reason] ?? x.reason}</span><span className="font-semibold text-forest">+{x.amount}</span></li>)}</ul>
          </Card>
          <Card>
            <Link href="/reinitialiser" className="link inline-flex items-center gap-2 text-sm"><KeyRound className="h-4 w-4" /> Changer mon mot de passe</Link>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <h2 className="font-bold">Partager mon expérience</h2>
        <p className="text-sm text-ink-500">Votre témoignage pourra apparaître sur la page d’accueil après relecture.</p>
        <form action={submitTestimonialAction} className="mt-3 space-y-3">
          <Textarea name="content" required minLength={10} maxLength={1000} aria-label="Votre témoignage" />
          <Input name="context" maxLength={120} placeholder="Ex. : Apprenant à Paris, diaspora de Sédhiou" aria-label="Contexte" />
          <SubmitButton variant="secondary">Envoyer</SubmitButton>
        </form>
      </Card>

      <details className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
        <summary className="cursor-pointer font-bold text-red-800">Supprimer mon compte</summary>
        <p className="mt-2 text-sm text-red-800">Cette action efface définitivement votre profil, votre progression, vos enregistrements et vos devoirs. Elle est irréversible.</p>
        <form action={deleteAccountAction} className="mt-3 flex flex-wrap gap-2">
          <Input name="confirm" placeholder="Tapez SUPPRIMER" className="max-w-xs" aria-label="Confirmation" />
          <SubmitButton variant="danger" confirm="Supprimer définitivement votre compte ?">Supprimer définitivement</SubmitButton>
        </form>
      </details>
    </div>
  );
}
