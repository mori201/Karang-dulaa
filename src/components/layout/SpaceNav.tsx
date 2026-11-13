import Link from "next/link";

export function SpaceNav({ title, items }: { title: string; items: { href: string; label: string; badge?: number }[] }) {
  return (
    <nav aria-label={title} className="border-b border-sand-300 bg-white">
      <div className="container-kd flex items-center gap-1 overflow-x-auto py-2 text-sm">
        <span className="mr-2 shrink-0 font-extrabold text-forest">{title}</span>
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="shrink-0 rounded-lg px-3 py-1.5 font-semibold text-ink-600 hover:bg-sand-200 hover:text-forest">
            {i.label}{i.badge ? <span className="ml-1.5 rounded-full bg-gold px-1.5 text-xs text-ink">{i.badge}</span> : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
