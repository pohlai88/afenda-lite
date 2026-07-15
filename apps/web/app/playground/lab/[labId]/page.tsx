import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { getLabById, hasLabHost } from "@/features/playground/lab-registry";

type LabPageProps = {
	params: Promise<{ labId: string }>;
};

export async function generateMetadata({
	params,
}: LabPageProps): Promise<Metadata> {
	const { labId } = await params;
	const lab = getLabById(labId);

	return {
		title: lab?.title ?? "Lab",
	};
}

const LabHost = dynamic(
	() => import("@/features/playground/lab-host").then((mod) => mod.LabHost),
	{
		loading: () => (
			<div
				className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground"
				role="status"
			>
				Loading lab…
			</div>
		),
	},
);

export default async function PlaygroundLabPage({ params }: LabPageProps) {
	const { labId } = await params;
	const lab = getLabById(labId);

	if (!lab || !hasLabHost(lab.id)) {
		notFound();
	}

	return <LabHost lab={lab} />;
}
