import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Auth route handlers write the new session themselves. Avoid refreshing an
  // existing cookie set on the same response as OTP/code verification.
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    return NextResponse.next({ request });
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
