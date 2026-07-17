import type { Metadata } from "next";

import { DeclarationDetailShell } from "@/features/declarations/declaration-detail-shell";

type DeclarationDetailPageProps = {
	params: Promise<{ assignmentId: string }>;
};

export const metadata: Metadata = {
	title: "Declaration",
};

export default async function ClientDeclarationDetailPage({
	params,
}: DeclarationDetailPageProps) {
	const { assignmentId } = await params;
	return <DeclarationDetailShell assignmentId={assignmentId} />;
}
