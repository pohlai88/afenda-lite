import type { ReactNode } from "react";

import { AuthIslandLayout } from "@/features/auth/auth-island-layout";

import "../auth/auth-surface.css";
import "../auth/neon-auth-ui.css";

/** Join island shares Neon Auth CSS + provider with `/auth/*`. */
export default function JoinLayout({ children }: { children: ReactNode }) {
	return <AuthIslandLayout>{children}</AuthIslandLayout>;
}
