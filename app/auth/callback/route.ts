import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { bootstrapClientAfterSupabaseAuth } from "@/lib/auth/bootstrap-client-invite";
import { createClient } from "@/lib/supabase/server";
import { mapSupabaseUser } from "@/lib/supabase/session";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const nextParam = searchParams.get("next") ?? "/client/onboarding";
  const next = nextParam.startsWith("/") ? nextParam : "/client/onboarding";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const mapped = mapSupabaseUser(user);
        await bootstrapClientAfterSupabaseAuth({
          userId: mapped.id,
          email: mapped.email,
          userMetadata: user.user_metadata,
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const mapped = mapSupabaseUser(user);
        await bootstrapClientAfterSupabaseAuth({
          userId: mapped.id,
          email: mapped.email,
          userMetadata: user.user_metadata,
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
