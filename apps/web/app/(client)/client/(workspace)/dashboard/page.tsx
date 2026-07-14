import type { Metadata } from "next";

import { DeclarationsShell } from "@/features/declarations/declarations-shell";

export const metadata: Metadata = {
	title: "Client dashboard",
};

export default function ClientDashboardPage() {
	return <DeclarationsShell />;
}
