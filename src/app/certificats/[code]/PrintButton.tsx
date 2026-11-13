"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";

export function PrintButton({ children }: { children: ReactNode }) {
  return <Button variant="outline" onClick={() => window.print()}>{children}</Button>;
}
