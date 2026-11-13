import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

/** Retour des liens e-mail Supabase (confirmation, réinitialisation, invitation). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("suivant") ?? searchParams.get("next"));
  const supabase = await createClient();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }
  if (!ok) {
    return NextResponse.redirect(`${origin}/connexion?erreur=${encodeURIComponent("Ce lien n’est plus valide. Connectez-vous ou demandez un nouveau lien.")}`);
  }
  const dest = type === "recovery" ? "/reinitialiser" : type === "invite" ? "/reinitialiser" : next;
  return NextResponse.redirect(`${origin}${dest}`);
}
