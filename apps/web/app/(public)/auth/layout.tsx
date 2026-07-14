import type { ReactNode } from "react";

import { AuthIslandLayout } from "@/features/auth/auth-island-layout";

import "./auth-surface.css";
import "./neon-auth-ui.css";

/** Public Neon Auth UI island — route-scoped CSS + provider only. */
export default function AuthLayout({ children }: { children: ReactNode }) {
	return <AuthIslandLayout>{children}</AuthIslandLayout>;
}
