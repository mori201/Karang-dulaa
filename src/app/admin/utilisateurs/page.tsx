import { Badge, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { LEVEL_LABELS, formatDate } from "@/lib/utils";
import { inviteTeacherAction, setRoleAction, updateUserAction } from "../actions";

export const metadata = { title: "Utilisateurs" };
const ROLE_LABELS = { admin: "Administrateur", teacher: "Enseignant", student: "Apprenant" } as const;

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const me = await requireAdmin();
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page) || 1);
  let q = supabase.from("profiles").select("id, email, full_name, first_name, level, xp, is_active, created_at, users_roles!users_roles_user_id_fkey(role), teachers(can_publish_directly)", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * 30, page * 30 - 1);
  const term = (sp.q ?? "").replace(/[%,()]/g, "").trim();
  if (term) q = q.or(`email.ilike.%${term}%,full_name.ilike.%${term}%,first_name.ilike.%${term}%`);
  const { data: users, count } = await q;
  const back = `/admin/utilisateurs${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`;
  return (
    <div className="container-kd py-8">
      <PageHeader title="Utilisateurs et rôles" description={`${count ?? 0} compte(s)`} />
      <Flash searchParams={sp} />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">Créer un compte enseignant</h2>
          <form action={inviteTeacherAction} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Prénom"><Input name="first_name" required /></Field><Field label="Nom"><Input name="last_name" /></Field></div>
            <Field label="E-mail" hint="Un e-mail d’invitation permet à l’enseignant de choisir son mot de passe."><Input name="email" type="email" required /></Field>
            <SubmitButton pendingLabel="Envoi…">Inviter l’enseignant</SubmitButton>
          </form>
        </Card>
        <Card>
          <h2 className="font-bold">Rechercher</h2>
          <form className="mt-3 flex gap-2"><Input name="q" defaultValue={sp.q} placeholder="Nom ou e-mail" aria-label="Rechercher un utilisateur" /><button className="h-10 rounded-lg bg-forest px-4 text-sm font-semibold text-white">Chercher</button></form>
        </Card>
      </div>
      <div className="space-y-3">
        {(users ?? []).map((u) => {
          const roles = ((u.users_roles ?? []) as { role: keyof typeof ROLE_LABELS }[]).map((r) => r.role);
          const t = (u.teachers as unknown as { can_publish_directly: boolean } | { can_publish_directly: boolean }[] | null);
          const teacher = Array.isArray(t) ? t[0] : t;
          return (
            <Card key={u.id} className={u.is_active ? "" : "opacity-70"}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{u.full_name || u.first_name || "—"}</span>
                <span className="text-sm text-ink-500">{u.email}</span>
                {roles.map((r) => <Badge key={r} tone={r === "admin" ? "red" : r === "teacher" ? "gold" : "neutral"}>{ROLE_LABELS[r]}</Badge>)}
                {!u.is_active && <Badge tone="red">Suspendu</Badge>}
                <span className="ml-auto text-xs text-ink-400">Inscrit le {formatDate(u.created_at, { dateStyle: "short" })} · {u.xp} XP</span>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-sand-300 pt-3">
                <form action={updateUserAction} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="back" value={back} />
                  <Field label="Niveau"><Select name="level" defaultValue={u.level} className="h-9">{Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                  <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={u.is_active} className="accent-forest" /> Compte actif</label>
                  {roles.includes("teacher") && <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" name="can_publish_directly" defaultChecked={teacher?.can_publish_directly} className="accent-forest" /> Publie sans validation</label>}
                  <SubmitButton size="sm" variant="secondary" pendingLabel="…">Enregistrer</SubmitButton>
                </form>
                <div className="flex flex-wrap gap-2">
                  {(["teacher", "admin"] as const).map((r) => {
                    const has = roles.includes(r);
                    if (has && r === "admin" && u.id === me.id) return null;
                    return (
                      <form key={r} action={setRoleAction}>
                        <input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="role" value={r} /><input type="hidden" name="grant" value={has ? "0" : "1"} /><input type="hidden" name="back" value={back} />
                        <SubmitButton size="sm" variant={has ? "ghost" : "outline"} confirm={r === "admin" && !has ? "Donner les droits d’administration complets à cet utilisateur ?" : undefined} pendingLabel="…">
                          {has ? `Retirer « ${ROLE_LABELS[r]} »` : `Nommer ${ROLE_LABELS[r].toLowerCase()}`}
                        </SubmitButton>
                      </form>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {(count ?? 0) > 30 && (
        <div className="mt-6 flex justify-center gap-3 text-sm">
          {page > 1 && <a className="link" href={`/admin/utilisateurs?page=${page - 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}>← Précédent</a>}
          <span>Page {page}</span>
          {page * 30 < (count ?? 0) && <a className="link" href={`/admin/utilisateurs?page=${page + 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}>Suivant →</a>}
        </div>
      )}
    </div>
  );
}
