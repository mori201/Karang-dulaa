import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "gold" | "ghost" | "danger" | "outline";
const variants: Record<Variant, string> = {
  primary: "bg-forest text-white hover:bg-forest-600 focus-visible:ring-forest-300",
  secondary: "bg-forest-50 text-forest-700 hover:bg-forest-100 focus-visible:ring-forest-200",
  gold: "bg-gold text-ink hover:bg-gold-300 focus-visible:ring-gold-200",
  ghost: "text-ink-600 hover:bg-sand-300/60",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300",
  outline: "border border-sand-400 bg-white text-ink hover:bg-sand-100",
};
const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof sizes = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary", size = "md", className, ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary", size = "md", className, ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-sand-300 bg-white p-5 shadow-sm", className)} {...props} />;
}

export function Badge({ className, tone = "neutral", ...props }: ComponentProps<"span"> & { tone?: "neutral" | "green" | "gold" | "red" | "blue" }) {
  const tones = {
    neutral: "bg-sand-300 text-ink-600",
    green: "bg-forest-50 text-forest-700",
    gold: "bg-gold-50 text-gold-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-sky-50 text-sky-700",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} {...props} />;
}

const field = "w-full rounded-lg border border-sand-400 bg-white px-3 py-2 text-[15px] text-ink placeholder:text-ink-400 focus:border-forest focus:outline-none focus:ring-4 focus:ring-forest-100 disabled:bg-sand-100";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(field, "h-10", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-24", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(field, "h-10", className)} {...props} />;
}

export function Field({ label, hint, children, htmlFor, required }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink-600">
        {label} {required && <span className="text-red-600" aria-hidden>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ value, className, label }: { value: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-sand-300", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progression"}>
      <div className="h-full rounded-full bg-gradient-to-r from-forest to-forest-400 transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-1 text-xs font-bold uppercase tracking-widest text-gold-600">{eyebrow}</div>}
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-sand-400 bg-white/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-forest-400">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children, className }: { tone?: "info" | "success" | "warning" | "error"; children: ReactNode; className?: string }) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-forest-200 bg-forest-50 text-forest-800",
    warning: "border-gold-200 bg-gold-50 text-gold-700",
    error: "border-red-200 bg-red-50 text-red-800",
  };
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>{children}</div>;
}

export function StatCard({ label, value, icon, hint }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="flex items-start gap-3 p-4">
      {icon && <div className="rounded-xl bg-forest-50 p-2.5 text-forest">{icon}</div>}
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</div>
        <div className="text-2xl font-extrabold text-ink">{value}</div>
        {hint && <div className="text-xs text-ink-500">{hint}</div>}
      </div>
    </Card>
  );
}
