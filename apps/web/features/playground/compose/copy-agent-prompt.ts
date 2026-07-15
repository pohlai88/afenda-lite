import { serializeStageDocument } from "@/features/playground/compose/stage-document";
import type { ComposeStageDocument } from "@/features/playground/compose/stage-types";
import { getLabById, listReadyLabs } from "@/features/playground/lab-registry";

export function buildAgentPrompt(stage: ComposeStageDocument): string {
	const lines = [
		"Afenda playground compose session — iterate these AdminCN UI subjects:",
		"",
		`Inspector: sidebarOpen=${stage.inspector.sidebarOpen}, viewport=${stage.inspector.viewport}, mode=${stage.inspector.mode}`,
		"",
		"Stage items (order matters):",
	];

	let knownCount = 0;
	for (const [index, item] of stage.items.entries()) {
		const lab = getLabById(item.labId);
		if (!lab) {
			lines.push(`${index + 1}. UNKNOWN labId=${item.labId}`);
			continue;
		}
		knownCount += 1;
		lines.push(
			`${index + 1}. ${lab.title} (${lab.id})`,
			`   path: ${lab.packagePath}`,
			`   mount: ${lab.mount}`,
			`   interactions: ${lab.interactions.map((step) => step.label).join("; ")}`,
			`   seeds: ${lab.vibePromptSeeds.join(" ")}`,
			"",
		);
	}

	if (knownCount === 0) {
		lines.push("(empty stage — add ready labs from /playground)", "");
	}

	lines.push(
		"Stage JSON:",
		serializeStageDocument(stage),
		"",
		"Constraints:",
		"- Edit sources under packages/design-system and apps/web/features/playground only as needed.",
		"- Do not remount Storybook. Keep PLAYGROUND_* off Vercel production.",
		`- Ready lab ids: ${listReadyLabs()
			.map((lab) => lab.id)
			.join(", ")}`,
	);

	return lines.join("\n");
}
