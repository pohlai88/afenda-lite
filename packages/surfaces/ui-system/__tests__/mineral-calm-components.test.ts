import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const componentRoot = path.join(packageRoot, "src", "components", "ui");

const readComponent = (name: string) =>
	readFileSync(path.join(componentRoot, `${name}.tsx`), "utf8");

describe("@afenda/ui-system — Mineral Calm component consumption", () => {
	it("maps raised, overlay, and dialog elevation only to governed roles", () => {
		for (const name of ["card", "bulk-action-bar", "sidebar"]) {
			expect(readComponent(name), name).toContain("shadow-(--shadow-raised)");
		}
		for (const name of [
			"chart",
			"context-menu",
			"dropdown-menu",
			"hover-card",
			"menubar",
			"popover",
			"select",
			"tooltip",
		]) {
			expect(readComponent(name), name).toContain("shadow-(--shadow-overlay)");
		}
		for (const name of [
			"alert-dialog",
			"dialog",
			"drawer",
			"sheet",
		]) {
			expect(readComponent(name), name).toContain("shadow-(--shadow-dialog)");
		}
	});

	it("keeps controls, tables, tabs, slider thumbs, and base command flat", () => {
		for (const name of [
			"button",
			"command",
			"data-table",
			"input",
			"native-select",
			"slider",
			"tabs",
		]) {
			expect(readComponent(name), name).not.toMatch(/\bshadow-/);
		}
	});

	it("eliminates generic medium-to-large shadows from component source", () => {
		const offenders = readdirSync(componentRoot)
			.filter((name) => name.endsWith(".tsx"))
			.filter((name) => /\bshadow-(?:sm|md|lg|xl)\b/.test(readComponent(name.slice(0, -4))));

		expect(offenders).toEqual([]);
	});

	it("changes only micro Button sizes to the smaller radius", () => {
		const button = readComponent("button");
		expect(button).toMatch(/xs:\s*"[^"]*rounded-sm/);
		expect(button).toMatch(/"icon-xs":\s*"[^"]*rounded-sm/);
		expect(button).toMatch(/sm:\s*"[^"]*rounded-md/);
		expect(button).toMatch(/lg:\s*"[^"]*rounded-md/);
		expect(button).toMatch(/inline-flex[^\n]*rounded-md/);
	});
});
