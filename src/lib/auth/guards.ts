import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthenticatedIdentity = {
  id: string;
  email: string | null;
};

export async function getAuthenticatedIdentity(): Promise<AuthenticatedIdentity | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const subject = claims?.sub;

  if (error || !claims || typeof subject !== "string") return null;

  return {
    id: subject,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}

export async function requireAuthenticatedUser() {
  const identity = await getAuthenticatedIdentity();
  if (!identity) redirect("/login");
  return identity;
}

export async function requireAdminUser() {
  const identity = await getAuthenticatedIdentity();
  if (!identity) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { data: isAdmin, error } = await supabase.rpc("is_admin");

  if (error) throw new Error("Could not verify administrative access.");
  if (isAdmin !== true) redirect("/dashboard?error=forbidden");

  return identity;
}

export async function getSessionSummary() {
  const identity = await getAuthenticatedIdentity();
  if (!identity) return null;

  const supabase = await createServerSupabaseClient();
  const [profileResult, roleResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", identity.id).maybeSingle(),
    supabase.rpc("is_admin"),
  ]);

  // Profile details and the navigation-only admin flag must not take down the
  // signed-in app shell. A failed role lookup always denies the admin affordance;
  // protected admin routes still fail closed in requireAdminUser().
  if (profileResult.error) {
    console.error("Unable to load signed-in profile", {
      code: profileResult.error.code,
      status: profileResult.status,
    });
  }
  if (roleResult.error) {
    console.error("Unable to load signed-in role summary", {
      code: roleResult.error.code,
      status: roleResult.status,
    });
  }

  return {
    ...identity,
    displayName: profileResult.data?.display_name ?? null,
    isAdmin: !roleResult.error && roleResult.data === true,
  };
}
