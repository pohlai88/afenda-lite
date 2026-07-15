import { describe, expect, it } from "vitest";

import { buildAgentPrompt } from "../features/playground/compose/copy-agent-prompt";
import { createEmptyStage } from "../features/playground/compose/stage-types";

describe("buildAgentPrompt", () => {
	it("includes ready lab paths, inspector, and stage JSON", () => {
		const stage = createEmptyStage();
		stage.items.push({
			instanceId: "stage-1",
			labId: "profile-dropdown",
		});
		stage.inspector.mode = "dark";
		const prompt = buildAgentPrompt(stage);
		expect(prompt).toContain("profile-dropdown");
		expect(prompt).toContain(
			"packages/design-system/src/components/shared/ProfileDropdown.tsx",
		);
		expect(prompt).toContain("mode=dark");
		expect(prompt).toContain("Stage JSON:");
		expect(prompt).toContain('"labId":"profile-dropdown"');
		expect(prompt).toContain("Do not remount Storybook");
		expect(prompt).toContain("notification-dropdown");
		expect(prompt).toContain("activity-dialog");
	});
});
