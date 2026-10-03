import { login } from "@/app/(auth)/actions";
import { LoginForm } from "@/components/auth-forms";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const params = await searchParams;
  const error = params.error === "credentials" ? "credentials" : params.error === "confirmation" ? "confirmation" : params.error ? "other" : null;
  return <LoginForm action={login} next={params.next} error={error} notice={params.message === "signed-out"} />;
}
