import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="bg-kd-pattern">
      <div className="container-kd flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
        <div className="w-full max-w-md rounded-3xl border border-sand-300 bg-white p-6 shadow-sm sm:p-8">
          <LogoMark className="mx-auto h-12 w-12" />
          <h1 className="mt-4 text-center text-2xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-1 text-center text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
