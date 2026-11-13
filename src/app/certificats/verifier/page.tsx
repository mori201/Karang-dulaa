import { redirect } from "next/navigation";
import { Card, Input, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";

export const metadata = { title: "Vérifier un certificat" };

async function verify(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (code) redirect(`/certificats/${encodeURIComponent(code)}`);
}

export default function VerifyPage() {
  return (
    <div className="container-kd max-w-xl py-12">
      <PageHeader title="Vérifier un certificat" description="Saisissez l’identifiant inscrit sur le certificat (ex. KD-2026-XXXXXXXXXX) ou scannez son QR code." />
      <Card>
        <form action={verify} className="flex gap-2">
          <Input name="code" required placeholder="KD-2026-…" aria-label="Identifiant du certificat" className="font-mono uppercase" />
          <SubmitButton pendingLabel="…">Vérifier</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
