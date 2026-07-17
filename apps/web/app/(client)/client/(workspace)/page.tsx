import { redirect } from "next/navigation";

import { CLIENT_DASHBOARD_PATH } from "@/features/auth/client-paths";

/**
 * Workspace index — Target entry is `/client/declarations` (N17 · ARCH-012).
 * No sibling `loading`/`error` here: they soft-catch `redirect()` (same class as gate login).
 */
export default function ClientWorkspaceIndex() {
	redirect(CLIENT_DASHBOARD_PATH);
}
