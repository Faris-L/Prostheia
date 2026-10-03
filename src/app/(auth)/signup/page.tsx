import { signup } from "@/app/(auth)/actions";
import { SignupForm } from "@/components/auth-forms";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <SignupForm action={signup} error={!!params.error} notice={params.message === "check-email"} />;
}
