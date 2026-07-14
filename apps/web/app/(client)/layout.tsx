import type { ReactNode } from "react";
import { requireRole } from "@afenda/auth";

/** Client route group — coarse shell gate via `@afenda/auth`. */
export default async function ClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("client");
  return children;
}
