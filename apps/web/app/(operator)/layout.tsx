import { requireRole } from "@afenda/auth";
import type { ReactNode } from "react";

/** Operator route group — coarse shell gate via `@afenda/auth`. */
export default async function OperatorLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireRole("operator");
	return children;
}
