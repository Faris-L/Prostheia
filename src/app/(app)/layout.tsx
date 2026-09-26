import type { ReactNode } from "react";
import { requireAuthenticatedUser } from "@/lib/auth/guards";

export default async function ProtectedAppLayout({ children }: { children: ReactNode }) {
  await requireAuthenticatedUser();
  return children;
}
