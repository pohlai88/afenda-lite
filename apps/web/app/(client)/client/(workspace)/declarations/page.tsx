import type { Metadata } from "next";

import { DeclarationsShell } from "@/features/declarations/declarations-shell";

export const metadata: Metadata = {
	title: "Declarations",
};

export default function ClientDeclarationsPage() {
	return <DeclarationsShell />;
}
