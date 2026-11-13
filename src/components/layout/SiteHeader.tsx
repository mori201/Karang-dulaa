import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { Logo } from "@/components/Logo";
import { buttonClass } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";

const NAV = [
  { href: "/academie", label: "Académie" },
  { href: "/dictionnaire", label: "Dictionnaire" },
  { href: "/prononciation", label: "Prononciation" },
  { href: "/bibliotheque", label: "Bibliothèque" },
  { href: "/assistant", label: "DULAA AI" },
];

export async function SiteHeader() {
  const user = await getSessionUser();
  let unread = 0;
  if (user) {
    const supabase = await createClient();
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    unread = count ?? 0;
  }

  const userLinks = user
    ? [
        { href: "/tableau-de-bord", label: "Mon tableau de bord" },
        { href: "/cartes", label: "Cartes mémoire" },
        { href: "/profil", label: "Profil et progression" },
        ...(user.isStaff ? [{ href: "/enseignant", label: "Espace enseignant" }] : []),
        ...(user.isAdmin ? [{ href: "/admin", label: "Administration" }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-sand-300 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-kd flex h-16 items-center justify-between gap-3">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-sand-200 hover:text-forest">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/notifications" className="relative rounded-lg p-2 text-ink-600 hover:bg-sand-200" aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}>
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-gold px-1 text-center text-[11px] font-bold text-ink">{unread > 99 ? "99+" : unread}</span>
                )}
              </Link>
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sand-200">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-sm font-bold text-white">
                    {displayName({ ...user.profile, email: user.email }).slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden text-sm font-semibold sm:inline">{displayName({ ...user.profile, email: user.email })}</span>
                </summary>
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-sand-300 bg-white p-2 shadow-lg">
                  {userLinks.map((l) => (
                    <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-sand-100">{l.label}</Link>
                  ))}
                  <form action="/auth/deconnexion" method="post" className="mt-1 border-t border-sand-300 pt-1">
                    <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Se déconnecter</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/connexion" className={buttonClass("ghost", "sm", "hidden sm:inline-flex")}>Se connecter</Link>
              <Link href="/inscription" className={buttonClass("primary", "sm")}>Commencer</Link>
            </>
          )}
          <details className="relative lg:hidden">
            <summary className="list-none rounded-lg p-2 hover:bg-sand-200" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></summary>
            <nav aria-label="Menu mobile" className="absolute right-0 mt-2 w-64 rounded-xl border border-sand-300 bg-white p-2 shadow-lg">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2.5 text-[15px] font-semibold hover:bg-sand-100">{n.label}</Link>
              ))}
              {!user && <Link href="/connexion" className="block rounded-lg px-3 py-2.5 text-[15px] hover:bg-sand-100">Se connecter</Link>}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
