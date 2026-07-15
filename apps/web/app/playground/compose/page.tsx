import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { listReadyLabs } from "@/features/playground/lab-registry";

export const metadata: Metadata = {
	title: "Compose",
};

const ComposeBoard = dynamic(
	() =>
		import("@/features/playground/compose/compose-board").then(
			(mod) => mod.ComposeBoard,
		),
	{
		loading: () => (
			<div
				className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground"
				role="status"
			>
				Loading compose board…
			</div>
		),
	},
);

export default function PlaygroundComposePage() {
	return <ComposeBoard labs={listReadyLabs()} />;
}
