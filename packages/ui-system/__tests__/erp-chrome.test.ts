import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pkgRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const uiDir = path.join(pkgRoot, "src", "components", "ui");
const readUi = (name: string) => readFileSync(path.join(uiDir, name), "utf8");
const readAllUiSources = () =>
	readdirSync(uiDir)
		.filter((name) => name.endsWith(".tsx"))
		.map((name) => readUi(name))
		.join("\n");

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

/**
 * Role-matched color-opacity aliases retired when ERP tokens ship an exact role.
 * Token CSS program CLOSED — do not reintroduce.
 */
const roleMatchedOpacityAliases = [
	"bg-destructive/10",
	"dark:data-[variant=destructive]:focus:bg-destructive/20",
	"text-foreground/60",
	"dark:bg-destructive/60",
	"bg-primary/5",
	"bg-primary/10",
	"bg-primary/20",
	"bg-black/50",
	"dark:bg-input/30",
	"dark:hover:bg-input/50",
	"dark:hover:bg-accent/50",
	"dark:bg-input/80",
	"text-destructive/90",
	"text-sidebar-foreground/70",
	"hover:bg-primary/90",
	"hover:bg-destructive/90",
	"hover:bg-secondary/80",
	"hover:bg-secondary/90",
	"ring-ring/50",
	"ring-destructive/20",
	"ring-destructive/40",
	"bg-background/20",
	"bg-background/10",
] as const;

/**
 * Permanently retained element-opacity only (not color-token debt).
 * Token CSS program CLOSED — color-opacity aliases forbidden above.
 */
const retainedElementOpacityAliases = [
	"disabled:opacity-50",
	"data-[disabled]:opacity-50",
	"opacity-50",
	"opacity-70",
] as const;

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
		expect(dataTable).not.toContain(
			'resolvedSelected.has(rowId) && "bg-muted/50"',
		);
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

	it("does not reintroduce role-matched color-opacity aliases in package UI", () => {
		const packageUi = readAllUiSources();
		const offenders = roleMatchedOpacityAliases.filter((cls) =>
			packageUi.includes(cls),
		);
		expect(offenders).toEqual([]);
	});

	it("Button / Badge destructive soft fill uses bg-destructive-soft in dark", () => {
		expect(readUi("button.tsx")).toContain("dark:bg-destructive-soft");
		expect(readUi("badge.tsx")).toContain("dark:bg-destructive-soft");
		expect(readUi("button.tsx")).not.toContain("dark:bg-destructive/60");
		expect(readUi("badge.tsx")).not.toContain("dark:bg-destructive/60");
	});

	it("Field checked wash uses bg-primary-subtle; Progress track uses bg-primary-track", () => {
		expect(readUi("field.tsx")).toContain(
			"has-data-[state=checked]:bg-primary-subtle",
		);
		expect(readUi("field.tsx")).not.toContain("bg-primary/5");
		expect(readUi("field.tsx")).not.toContain("bg-primary/10");
		expect(readUi("progress.tsx")).toContain("bg-primary-track");
		expect(readUi("progress.tsx")).not.toContain("bg-primary/20");
	});

	it("Dialog / Sheet / AlertDialog overlays use bg-overlay-scrim", () => {
		expect(readUi("dialog.tsx")).toContain("bg-overlay-scrim");
		expect(readUi("sheet.tsx")).toContain("bg-overlay-scrim");
		expect(readUi("alert-dialog.tsx")).toContain("bg-overlay-scrim");
		expect(readUi("dialog.tsx")).not.toContain("bg-black/50");
		expect(readUi("sheet.tsx")).not.toContain("bg-black/50");
		expect(readUi("alert-dialog.tsx")).not.toContain("bg-black/50");
	});

	it("control fills / press hover / rings / sidebar muted use named tokens", () => {
		expect(readUi("input.tsx")).toContain("dark:bg-control-fill");
		expect(readUi("button.tsx")).toContain("dark:hover:bg-control-fill-hover");
		expect(readUi("button.tsx")).toContain("dark:hover:bg-accent-fill-hover");
		expect(readUi("button.tsx")).toContain("hover:bg-primary-hover");
		expect(readUi("button.tsx")).toContain("hover:bg-destructive-hover");
		expect(readUi("button.tsx")).toContain("hover:bg-secondary-hover");
		expect(readUi("switch.tsx")).toContain(
			"dark:data-[state=unchecked]:bg-control-fill-strong",
		);
		expect(readUi("alert.tsx")).toContain(
			"*:data-[slot=alert-description]:text-destructive",
		);
		expect(readUi("alert.tsx")).not.toContain("text-destructive/90");
		expect(readUi("sidebar.tsx")).toContain("text-sidebar-muted-foreground");
		expect(readUi("button.tsx")).toContain("focus-visible:ring-ring-focus");
		expect(readUi("button.tsx")).toContain(
			"aria-invalid:ring-ring-destructive-focus",
		);
		expect(readUi("kbd.tsx")).toContain("bg-kbd-tooltip-fill");
	});

	it("retains audited element-opacity aliases only (token CSS program closed)", () => {
		const packageUi = readAllUiSources();
		const missing = retainedElementOpacityAliases.filter(
			(cls) => !packageUi.includes(cls),
		);
		expect(missing).toEqual([]);
	});
});
