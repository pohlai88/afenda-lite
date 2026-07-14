import type { Metadata } from "next";

import { PreviewUnavailableShell } from "@/features/auth/preview-unavailable-shell";

export const metadata: Metadata = {
	title: "Preview unavailable",
};

export default function ClientPreviewUnavailablePage() {
	return <PreviewUnavailableShell />;
}
