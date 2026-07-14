import type { ReactNode } from "react";
import { requireRole } from "@afenda/auth";

/** Operator route group — coarse shell gate via `@afenda/auth`. */
export default async function OperatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("operator");
  return children;
}
