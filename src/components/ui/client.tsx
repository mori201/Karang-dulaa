"use client";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { buttonClass } from "./index";

/** Bouton d'envoi qui affiche un état de chargement pendant l'action serveur. */
export function SubmitButton({
  children, pendingLabel = "Enregistrement…", variant = "primary", size = "md", className, confirm, ...props
}: ComponentProps<"button"> & {
  pendingLabel?: string;
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={buttonClass(variant, size, className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      {...props}
    >
      {pending ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {pendingLabel}</>) : children}
    </button>
  );
}
