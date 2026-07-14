import type { Metadata } from "next";

import { OrgAdminShell } from "@/features/org-admin/org-admin-shell";

export const metadata: Metadata = {
	title: "Operator admin",
};

export default function OperatorAdminPage() {
	return <OrgAdminShell />;
}
