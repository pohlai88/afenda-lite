import { AUTH_LOGIN_PATH } from "@afenda/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
	title: "Client sign-in",
};

/**
 * Legacy client gate entry (ARCH-012) — Neon Auth UI lives at `/auth/login`.
 * Session-gate bypasses this path so anonymous traffic can reach the redirect.
 */
export default function ClientLoginGatePage() {
	redirect(AUTH_LOGIN_PATH);
}
