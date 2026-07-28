import { storybookEvidence } from "virtual:afenda-storybook-evidence";
import type { ReactNode } from "react";
import type { StorybookContractEvidence } from "../../.storybook/storybook-evidence";

export function contractEvidence(
	componentId: string,
): StorybookContractEvidence {
	const evidence = storybookEvidence[componentId];
	if (!evidence) {
		throw new Error(`Missing Storybook contract evidence for ${componentId}.`);
	}
	return evidence;
}

export function evidenceDescription(
	evidence: StorybookContractEvidence,
): string {
	return `${evidence.purpose} ${evidence.ownership.componentOwns[0]} Contract: ${evidence.contractId}.`;
}

export function StorySection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="grid gap-3">
			<h2 className="text-lg font-medium">{title}</h2>
			{children}
		</section>
	);
}
