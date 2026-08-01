import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

interface StoryIndexEntry {
	id: string;
	tags?: string[];
	title: string;
	type: "docs" | "story";
}

interface StoryIndex {
	entries: Record<string, StoryIndexEntry>;
}

type Theme = "light" | "dark";

const VERIFIED_COMPONENT_STORY_IDS = [
	"ui-system-app-shell--enterprise-operations",
	"ui-system-button--overview",
	"ui-system-card--overview",
	"ui-system-chart--overview",
	"ui-system-data-table--overview",
	"ui-system-form-field--overview",
	"ui-system-page-header--overview",
	"ui-system-workspace-page--overview",
] as const;

async function openStory(page: Page, storyId: string, theme: Theme) {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(
		`/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story&globals=theme:${theme}`,
	);
	const root = page.locator("#storybook-root");
	await expect(root).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(500);
	await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
	return root;
}

test("all tagged UI-system stories match canonical screenshots @visual", async ({
	page,
	request,
}) => {
	test.setTimeout(600_000);
	const response = await request.get("/index.json");
	expect(response.ok()).toBe(true);
	const index = (await response.json()) as StoryIndex;
	const stories = Object.values(index.entries)
		.filter(
			(entry) =>
				entry.type === "story" &&
				entry.title.startsWith("UI System/") &&
				entry.tags?.includes("visual"),
		)
		.sort((left, right) => left.id.localeCompare(right.id));

	expect(stories).toHaveLength(75);

	for (const story of stories) {
		for (const theme of ["light", "dark"] as const) {
			// biome-ignore lint/performance/noAwaitInLoops: visual captures share one page and must remain serial.
			await test.step(`${story.id} · ${theme}`, async () => {
				await openStory(page, story.id, theme);
				await page.keyboard.press("Escape");
				await page.keyboard.press("Escape");
				await page.mouse.move(0, 0);
				await page.evaluate(() => {
					if (document.activeElement instanceof HTMLElement) {
						document.activeElement.blur();
					}
				});
				await page.waitForTimeout(100);
				await expect(page).toHaveScreenshot(`${story.id}-${theme}.png`);
			});
		}
	}
});

test("verified component stories have no accessibility violations", async ({
	page,
}) => {
	test.setTimeout(180_000);

	for (const storyId of VERIFIED_COMPONENT_STORY_IDS) {
		// biome-ignore lint/performance/noAwaitInLoops: one browser page preserves deterministic evidence order.
		await test.step(storyId, async () => {
			await openStory(page, storyId, "light");
			const accessibility = await new AxeBuilder({ page })
				.include("#storybook-root")
				.analyze();
			expect(accessibility.violations).toEqual([]);
		});
	}
});

test("verified component stories preserve 390px reflow", async ({ page }) => {
	test.setTimeout(180_000);

	for (const storyId of VERIFIED_COMPONENT_STORY_IDS) {
		// biome-ignore lint/performance/noAwaitInLoops: one browser page preserves deterministic evidence order.
		await test.step(storyId, async () => {
			await page.setViewportSize({ width: 390, height: 844 });
			await page.goto(
				`/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story&globals=theme:light`,
			);
			await expect(page.locator("#storybook-root")).toBeVisible();
			await page.evaluate(() => document.fonts.ready);
			await page.waitForLoadState("networkidle");

			const widths = await page.evaluate(() => {
				const viewport = document.documentElement.clientWidth;
				const offenders = [...document.body.querySelectorAll<HTMLElement>("*")]
					.map((element) => ({
						className: element.className.toString().slice(0, 160),
						clientWidth: element.clientWidth,
						right: Math.round(element.getBoundingClientRect().right),
						scrollWidth: element.scrollWidth,
						tag: element.tagName.toLowerCase(),
					}))
					.filter(
						({ clientWidth, right, scrollWidth }) =>
							right > viewport + 1 || scrollWidth > clientWidth + 1,
					)
					.sort(
						(left, right) =>
							right.scrollWidth -
							right.clientWidth -
							(left.scrollWidth - left.clientWidth),
					)
					.slice(0, 12);
				return {
					document: document.documentElement.scrollWidth,
					offenders,
					viewport,
				};
			});
			expect(
				widths.document,
				`Horizontal overflow: ${JSON.stringify(widths.offenders)}`,
			).toBeLessThanOrEqual(widths.viewport + 1);
		});
	}
});

test("open Drawer and Menubar portals preserve themed elevation @visual", async ({
	page,
}) => {
	test.setTimeout(120_000);
	const overlays = [
		{
			storyId: "ui-system-drawer--overview",
			trigger: { role: "button" as const, name: "Review posting batch" },
			openRole: "dialog" as const,
			openName: "Review posting batch",
		},
		{
			storyId: "ui-system-menubar--overview",
			trigger: { role: "menuitem" as const, name: "Record" },
			openRole: "menu" as const,
			openName: undefined,
		},
	] as const;

	for (const overlay of overlays) {
		for (const theme of ["light", "dark"] as const) {
			// biome-ignore lint/performance/noAwaitInLoops: overlay captures share one page and must remain serial.
			await test.step(`${overlay.storyId} · open · ${theme}`, async () => {
				await openStory(page, overlay.storyId, theme);
				await page
					.getByRole(overlay.trigger.role, {
						name: overlay.trigger.name,
					})
					.click();
				const openSurface = page.getByRole(overlay.openRole, {
					...(overlay.openName === undefined ? {} : { name: overlay.openName }),
				});
				await expect(openSurface).toBeVisible();
				await expect(page).toHaveScreenshot(
					`${overlay.storyId}-open-${theme}.png`,
				);
			});
		}
	}
});

test("Enterprise AppShell remains usable across desktop and mobile @visual", async ({
	page,
}) => {
	const viewports = [
		{ id: "desktop", width: 1440, height: 900 },
		{ id: "mobile", width: 390, height: 844 },
	] as const;

	for (const viewport of viewports) {
		for (const theme of ["light", "dark"] as const) {
			// biome-ignore lint/performance/noAwaitInLoops: viewport/theme evidence must be captured serially.
			await test.step(`${viewport.id} · ${theme}`, async () => {
				await page.setViewportSize(viewport);
				await page.goto(
					`/iframe.html?id=ui-system-app-shell--enterprise-operations&viewMode=story&globals=theme:${theme}`,
				);
				await expect(page.locator("#storybook-root")).toBeVisible();
				await page.evaluate(() => document.fonts.ready);
				await page.waitForLoadState("networkidle");
				await expect(page.locator("html")).toHaveClass(
					new RegExp(`\\b${theme}\\b`),
				);
				await expect(page).toHaveScreenshot(
					`ui-system-app-shell--enterprise-operations-${viewport.id}-${theme}.png`,
				);
			});
		}
	}
});

test("Enterprise AppShell utilities remain operable and accessible", async ({
	page,
}) => {
	await openStory(page, "ui-system-app-shell--enterprise-operations", "light");
	await expect(
		page.getByRole("link", { name: /Afenda Enterprise operations/ }),
	).toHaveAttribute("href", "/");

	await page.getByRole("button", { name: "Open command menu" }).click();
	const commandDialog = page.getByRole("dialog", { name: "Command menu" });
	await expect(commandDialog).toBeVisible();
	await page
		.getByRole("combobox", { name: "Search workspace commands" })
		.fill("exceptions");
	await page.getByRole("option", { name: "Open payment exceptions" }).click();
	await expect(
		page.getByText("Command selected: open-exceptions"),
	).toBeVisible();

	await page
		.getByRole("button", { name: "Open notifications (1 unread)" })
		.click();
	const notificationDialog = page.getByRole("dialog", {
		name: "Notifications",
	});
	await expect(notificationDialog).toBeVisible();
	await expect(
		notificationDialog.getByText("requested review of payment batch PAY-2048."),
	).toBeVisible();
	await page.keyboard.press("Escape");

	await page.getByRole("button", { name: "Customize appearance" }).click();
	const appearanceDialog = page.getByRole("dialog", {
		name: "Workspace appearance",
	});
	await expect(appearanceDialog).toBeVisible();
	await appearanceDialog.getByRole("radio", { name: "Compact" }).click();
	await expect(
		appearanceDialog.getByRole("radio", { name: "Compact" }),
	).toBeChecked();
	await page.keyboard.press("Escape");

	await page.getByRole("button", { name: "Use dark color mode" }).click();
	await expect(page.locator("html")).toHaveClass(/\bdark\b/);

	const accessibility = await new AxeBuilder({ page })
		.include("#storybook-root")
		.analyze();
	expect(accessibility.violations).toEqual([]);
});

test("Enterprise AppShell mobile utilities preserve priority and overflow access", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(
		"/iframe.html?id=ui-system-app-shell--enterprise-operations&viewMode=story&globals=theme:light",
	);
	await expect(page.locator("#storybook-root")).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
	await page.waitForLoadState("networkidle");

	const mobileUtilities = page.locator(
		'[data-slot="app-shell-mobile-utilities"]',
	);
	await expect(
		mobileUtilities.getByRole("button", { name: "Open command menu" }),
	).toBeVisible();
	const overflowTrigger = mobileUtilities.getByRole("button", {
		name: "Open workspace utilities (4 secondary)",
	});
	await overflowTrigger.click();
	const menu = page.getByRole("menu", {
		name: "Open workspace utilities (4 secondary)",
	});
	await expect(menu).toBeVisible();
	await menu
		.getByRole("menuitem", { name: "Notifications (1 unread)" })
		.click();
	await expect(
		page.getByRole("dialog", { name: "Notifications" }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(overflowTrigger).toBeFocused();

	await overflowTrigger.click();
	await page
		.getByRole("menu", {
			name: "Open workspace utilities (4 secondary)",
		})
		.getByRole("menuitem", { name: "Customize appearance" })
		.click();
	await expect(
		page.getByRole("dialog", { name: "Workspace appearance" }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(overflowTrigger).toBeFocused();

	await overflowTrigger.click();
	const localizedAction = page.getByRole("menuitem", {
		name: "Organisationsweite Profileinstellungen verwalten",
	});
	await expect(localizedAction).toBeVisible();
	const localizedBounds = await localizedAction.evaluate((element) => {
		const bounds = element.getBoundingClientRect();
		return {
			left: bounds.left,
			right: bounds.right,
			viewport: window.innerWidth,
		};
	});
	expect(localizedBounds.left).toBeGreaterThanOrEqual(0);
	expect(localizedBounds.right).toBeLessThanOrEqual(localizedBounds.viewport);
	await page.keyboard.press("Escape");
	await expect(overflowTrigger).toBeFocused();

	await page.setViewportSize({ width: 195, height: 422 });
	await expect(overflowTrigger).toBeVisible();
	const reflow = await page.evaluate(() => ({
		documentWidth: document.documentElement.scrollWidth,
		viewportWidth: window.innerWidth,
	}));
	expect(reflow.documentWidth).toBeLessThanOrEqual(reflow.viewportWidth + 2);

	const accessibility = await new AxeBuilder({ page })
		.include("#storybook-root")
		.analyze();
	expect(accessibility.violations).toEqual([]);
});

test("Button governed states and compositions remain visually explicit @visual", async ({
	page,
}) => {
	test.setTimeout(180_000);
	const staticEvidence = [
		{ story: "variants", label: "variants" },
		{ story: "sizes", label: "sizes" },
		{ story: "states-and-accessibility", label: "disabled-pending" },
		{ story: "navigation", label: "navigation" },
		{ story: "composition", label: "composition" },
	] as const;

	for (const theme of ["light", "dark"] as const) {
		for (const evidence of staticEvidence) {
			// biome-ignore lint/performance/noAwaitInLoops: button captures share one page and must remain serial.
			await test.step(`${evidence.label} · ${theme}`, async () => {
				await openStory(page, `ui-system-button--${evidence.story}`, theme);
				await expect(page).toHaveScreenshot(
					`ui-system-button--${evidence.label}-${theme}.png`,
				);
			});
		}

		await test.step(`hover and active · ${theme}`, async () => {
			await openStory(page, "ui-system-button--variants", theme);
			const primary = page.getByRole("button", {
				name: "Submit for approval",
			});
			await primary.hover();
			await expect(primary).toHaveScreenshot(
				`ui-system-button--hover-${theme}.png`,
			);
			await page.mouse.down();
			await expect(primary).toHaveScreenshot(
				`ui-system-button--active-${theme}.png`,
			);
			await page.mouse.up();
		});

		await test.step(`focus visible · ${theme}`, async () => {
			await openStory(
				page,
				"ui-system-button--states-and-accessibility",
				theme,
			);
			await page.locator("html").evaluate((element) => {
				element.setAttribute("data-preserve-focus", "true");
			});
			const approve = page.getByRole("button", { name: "Approve request" });
			await approve.focus();
			await expect(approve).toBeFocused();
			await expect(approve).toHaveScreenshot(
				`ui-system-button--focus-visible-${theme}.png`,
			);
		});
	}
});

test("Button Docs preserve governed typography and accessibility", async ({
	page,
}) => {
	await page.goto("/iframe.html?id=ui-system-button--docs&viewMode=docs");
	const docs = page.locator(".afenda-contract-docs");
	await expect(docs).toBeVisible();
	await page.evaluate(() => document.fonts.ready);

	const typography = await docs.evaluate((root) => {
		function stylesFor(element: Element | null) {
			if (!element) {
				throw new Error("Expected Docs typography element is missing.");
			}
			const styles = getComputedStyle(element);
			return {
				fontFamily: styles.fontFamily,
				fontSize: styles.fontSize,
				fontWeight: styles.fontWeight,
				lineHeight: styles.lineHeight,
				marginTop: styles.marginTop,
			};
		}

		return {
			title: stylesFor(root.querySelector("h1")),
			evidenceHeading: stylesFor(
				root.querySelector("#approved-evidence-stories"),
			),
			storyHeading: stylesFor(
				Array.from(root.querySelectorAll("h3")).find(
					(heading) => heading.textContent?.trim() === "Semantic Usage",
				) ?? null,
			),
			propsTable: stylesFor(root.querySelector(".docblock-argstable")),
		};
	});

	expect(typography.title).toMatchObject({
		fontSize: "24px",
		fontWeight: "600",
		lineHeight: "32px",
	});
	expect(typography.title.fontFamily).toContain("Geist Variable");
	for (const heading of [typography.evidenceHeading, typography.storyHeading]) {
		expect(heading).toMatchObject({
			fontSize: "18px",
			fontWeight: "500",
			lineHeight: "28px",
			marginTop: "0px",
		});
		expect(heading.fontFamily).toContain("Geist Variable");
	}
	expect(typography.propsTable).toMatchObject({
		fontSize: "14px",
		lineHeight: "20px",
	});
	expect(typography.propsTable.fontFamily).toContain("Geist Variable");

	const accessibility = await new AxeBuilder({ page })
		.include(".afenda-contract-docs")
		// Each rendered Story canvas is an isolated usage example. Storybook places
		// their internal headings in one Docs DOM, so cross-canvas heading order is
		// not a meaningful document-level failure; stories retain their own a11y gate.
		.disableRules(["heading-order"])
		.analyze();
	expect(accessibility.violations).toEqual([]);
});
