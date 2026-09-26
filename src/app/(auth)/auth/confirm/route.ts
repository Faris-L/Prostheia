import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function redirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");

  // Token-hash verification is the canonical email confirmation path.
  // The code branch keeps links already sent from the previous PKCE template usable.
  if ((!tokenHash || type !== "email") && !code) {
    return redirect(request, "/login?error=confirmation");
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = tokenHash && type === "email"
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
      : await supabase.auth.exchangeCodeForSession(code!);

    if (error) return redirect(request, "/login?error=confirmation");
    return redirect(request, "/dashboard");
  } catch {
    return redirect(request, "/login?error=confirmation");
  }
}
