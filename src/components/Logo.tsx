import Link from "next/link";
import { cn } from "@/lib/utils";

/** Emblème KARANG-DULAA : un livre ouvert (le savoir), orné de chevrons
 *  inspirés des textiles mandingues, sous un losange doré (l'étoile du
 *  savoir transmis). « Karang-dulaa » : le lieu où l'on apprend. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-10 w-10", className)} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#126B4B" />
      <path d="M32 7 41 16 32 25 23 16Z" fill="#D6A84B" />
      <path d="M32 12 36 16 32 20 28 16Z" fill="#126B4B" />
      <path d="M12 28c8-3.5 14.5-2.5 20 2 5.5-4.5 12-5.5 20-2v23c-8-3-14.5-2-20 2.5-5.5-4.5-12-5.5-20-2.5Z" fill="#F7F3E9" />
      <path d="M32 30v25.5" stroke="#126B4B" strokeWidth="2" />
      <path
        d="M17 35.5l3.5 3.5 3.5-3.5 3.5 3.5M37 35.5l3.5 3.5 3.5-3.5 3.5 3.5M17 43l3.5 3.5 3.5-3.5 3.5 3.5M37 43l3.5 3.5 3.5-3.5 3.5 3.5"
        fill="none" stroke="#D6A84B" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="KARANG-DULAA, accueil">
      <LogoMark className="h-9 w-9 shrink-0" />
      <span className="leading-tight">
        <span className={cn("block text-[15px] font-extrabold tracking-wide", light ? "text-white" : "text-forest-700")}>
          KARANG-DULAA
        </span>
        <span className={cn("block text-[10.5px] font-medium uppercase tracking-[0.12em]", light ? "text-gold-200" : "text-gold-600")}>
          École virtuelle du mandinka
        </span>
      </span>
    </Link>
  );
}
