import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pkgRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const readUi = (name: string) =>
	readFileSync(path.join(pkgRoot, "src", "components", "ui", name), "utf8");

/** Opacity-faked status/table chrome — forbidden after ERP subtle/table promote. */
const opacityChrome = [
	"bg-success/10",
	"bg-warning/10",
	"bg-destructive/10",
	"bg-info/10",
	"border-success/25",
	"border-warning/25",
	"border-destructive/25",
	"border-info/25",
	"hover:bg-muted/50",
	"has-aria-expanded:bg-muted/50",
	"bg-muted/40",
	"bg-muted/50",
] as const;

/** Role-matched color-opacity aliases retired when ERP tokens ship an exact role. */
const roleMatchedOpacityAliases = [
	"bg-destructive/10",
	"dark:data-[variant=destructive]:focus:bg-destructive/20",
	"text-foreground/60",
] as const;

/**
 * Intentionally retained (no exact ERP role token — do not purge):
 * - disabled / data-disabled opacity-50 — disabled state
 * - ring-ring/50 · ring-destructive/20|/40 — focus-ring behavior
 * - hover:bg-primary/90 · hover:bg-destructive/90 · hover:bg-secondary/80 — press/hover solid
 * - dark:bg-input/30 · dark:hover:bg-input/50 · dark:bg-accent/50 — control fill (no input-fill token)
 * - dark:bg-destructive/60 — soft solid destructive button (not destructive-subtle chip fill)
 * - bg-primary/5|/10 · bg-primary/20 — primary-subtle / progress-track gap
 * - bg-black/50 — overlay scrim
 * - text-destructive/90 — description emphasis on card (not subtle-foreground on subtle fill)
 * - text-sidebar-foreground/70 — sidebar label emphasis (no sidebar muted token)
 * - calendar outside/disabled opacity-50 · dialog close opacity-70 — hidden/emphasis state
 */

describe("@afenda/ui-system — ERP status/table chrome (UI-CAP-05 consume)", () => {
	const statusBadge = readUi("status-badge.tsx");
	const table = readUi("table.tsx");
	const dataTable = readUi("data-table.tsx");
	const dropdownMenu = readUi("dropdown-menu.tsx");
	const contextMenu = readUi("context-menu.tsx");
	const tabs = readUi("tabs.tsx");

	it("StatusBadge maps roles to subtle/border tokens (no opacity aliases)", () => {
		expect(statusBadge).toContain(
			"border-success-border bg-success-subtle text-success-subtle-foreground",
		);
		expect(statusBadge).toContain(
			"border-warning-border bg-warning-subtle text-warning-subtle-foreground",
		);
		expect(statusBadge).toContain(
			"border-destructive-border bg-destructive-subtle text-destructive-subtle-foreground",
		);
		expect(statusBadge).toContain(
			"border-info-border bg-info-subtle text-info-subtle-foreground",
		);
		expect(statusBadge).toContain(
			'inactive: "border-border bg-muted text-muted-foreground"',
		);
		for (const cls of opacityChrome) {
			expect(statusBadge, cls).not.toContain(cls);
		}
	});

	it("TableRow hover/expanded use table-row-hover; selected uses surface-sunken", () => {
		expect(table).toContain("hover:bg-table-row-hover");
		expect(table).toContain("has-aria-expanded:bg-table-row-hover");
		expect(table).toContain("data-[state=selected]:bg-surface-sunken");
		expect(table).not.toContain("hover:bg-muted/50");
		expect(table).not.toContain("has-aria-expanded:bg-muted/50");
		expect(table).not.toContain("data-[state=selected]:bg-muted");
	});

	it("DataTable stripes odd rows with bg-table-stripe; header uses surface-sunken", () => {
		expect(dataTable).toContain("bg-surface-sunken sticky top-0 z-10");
		expect(dataTable).toContain("bg-table-stripe");
		expect(dataTable).toMatch(
			/index % 2 === 1 &&\s*!resolvedSelected\.has\(rowId\) &&\s*"bg-table-stripe"/,
		);
		expect(dataTable).not.toContain("bg-muted/40");
		expect(dataTable).not.toContain('resolvedSelected.has(rowId) && "bg-muted/50"');
	});

	it("does not reintroduce opacity chrome in StatusBadge / Table / DataTable", () => {
		const chrome = `${statusBadge}\n${table}\n${dataTable}`;
		const offenders = opacityChrome.filter((cls) => chrome.includes(cls));
		expect(offenders).toEqual([]);
	});

	it("DropdownMenu destructive focus uses bg-destructive-subtle (not opacity fill)", () => {
		expect(dropdownMenu).toContain(
			"data-[variant=destructive]:focus:bg-destructive-subtle",
		);
		expect(dropdownMenu).not.toContain(
			"data-[variant=destructive]:focus:bg-destructive/10",
		);
		expect(dropdownMenu).not.toContain(
			"dark:data-[variant=destructive]:focus:bg-destructive/20",
		);
	});

	it("ContextMenu destructive focus uses bg-destructive-subtle (not opacity fill)", () => {
		expect(contextMenu).toContain(
			"data-[variant=destructive]:focus:bg-destructive-subtle",
		);
		expect(contextMenu).not.toContain(
			"data-[variant=destructive]:focus:bg-destructive/10",
		);
		expect(contextMenu).not.toContain(
			"dark:data-[variant=destructive]:focus:bg-destructive/20",
		);
	});

	it("Tabs inactive trigger uses text-muted-foreground (not text-foreground/60)", () => {
		expect(tabs).toContain("text-muted-foreground");
		expect(tabs).not.toContain("text-foreground/60");
		expect(tabs).toContain("hover:text-foreground");
		expect(tabs).toContain("data-[state=active]:text-foreground");
	});

	it("does not reintroduce role-matched color-opacity aliases in menu/tabs surfaces", () => {
		const surfaces = `${dropdownMenu}\n${contextMenu}\n${tabs}`;
		const offenders = roleMatchedOpacityAliases.filter((cls) =>
			surfaces.includes(cls),
		);
		expect(offenders).toEqual([]);
	});
});
