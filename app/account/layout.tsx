import type { ReactNode } from "react";
import { requireAccountSession } from "@/lib/account-session";

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAccountSession();
  return children;
}
