import { redirect } from "next/navigation";

import { CLIENT_DASHBOARD_PATH } from "@/features/auth/client-paths";

/** Alias — bookmarks to `/client/dashboard` land on declarations home (N17). */
export default function ClientDashboardPage() {
	redirect(CLIENT_DASHBOARD_PATH);
}
