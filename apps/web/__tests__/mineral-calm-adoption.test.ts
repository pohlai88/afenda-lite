import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("Mineral Calm product adoption", () => {
	it("uses opaque semantic workspace surfaces without local color masks", () => {
		const clientHome = source("app/(client)/client/(workspace)/page.tsx");
		const chat = source("features/ai-the-machine/the-machine-chat.tsx");
		const establishment = source(
			"features/corporate-administration/legal-establishment-workspace.tsx",
		);

		expect(clientHome).not.toMatch(/gradient|to-muted\//);
		expect(chat).toContain("border-border bg-surface-sunken");
		expect(chat).not.toMatch(/border-border\/|bg-background\//);
		expect(establishment).toContain("text-success-subtle-foreground");
		expect(establishment).not.toMatch(/text-emerald-/);
	});

	it("adopts governed fields instead of visible native handrolls", () => {
		const fulfillment = source("features/fulfillment/fulfillment-forms.tsx");
		const importPanel = source(
			"features/master-data/master-data-import-panel.tsx",
		);
		const changeRequest = source(
			"features/master-data/change-request-panel.tsx",
		);

		expect(fulfillment).toContain("<NativeSelect");
		expect(fulfillment).not.toContain("<select");
		expect(importPanel).toContain("<NativeSelect");
		expect(importPanel).not.toContain("<select");
		expect(changeRequest).toMatch(/<Input\s+name="reviewNote"/);
		expect(changeRequest).not.toMatch(
			/<input\s+name="reviewNote"[^>]*className=/,
		);
	});

	it("uses semantic elevation utilities for focused and floating chrome", () => {
		const skipLink = source("features/auth/skip-to-main-content.tsx");
		const devFab = source("features/auth/dev-login-fab.tsx");

		expect(skipLink).toContain("focus:shadow-(--shadow-overlay)");
		expect(skipLink).not.toContain("focus:shadow-md");
		expect(devFab).toContain("shadow-(--shadow-raised)");
		expect(devFab).not.toContain("shadow-[var(--shadow-raised)]");
	});
});
