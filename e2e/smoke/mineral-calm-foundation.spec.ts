import { loginAsClient, loginAsOperator } from "@/testing/e2e/flows";
import { expect, test } from "@/testing/e2e/playwright-base";

const THEMES = ["light", "dark"] as const;

async function forEachThemeSequentially(
	operation: (theme: (typeof THEMES)[number]) => Promise<void>,
	index = 0,
): Promise<void> {
	const theme = THEMES.at(index);
	if (theme === undefined) {
		return;
	}
	await operation(theme);
	return forEachThemeSequentially(operation, index + 1);
}

test.describe("Mineral Calm foundation @smoke", () => {
	test("operator workspace captures light and dark foundation evidence", async ({
		page,
		workerTenant,
	}, testInfo) => {
		// biome-ignore lint/suspicious/noSkippedTests: Local external evidence may be absent; CI fails closed.
		test.skip(
			!workerTenant,
			"E2E factory incomplete — authenticated foundation evidence requires DATABASE_URL and E2E_FACTORY_PASSWORD",
		);
		if (!workerTenant) {
			return;
		}

		await loginAsOperator(page, workerTenant.operator);
		await page.goto("/admin", { waitUntil: "networkidle" });
		await expect(
			page.getByRole("heading", { name: "Operator admin" }),
		).toBeVisible();

		await forEachThemeSequentially(async (theme) => {
			await applyFoundationTheme(theme);
			await assertFoundationDefaults(theme);
			await attachScreenshot(`admin-${theme}`);
		});

		async function applyFoundationTheme(theme: (typeof THEMES)[number]) {
			await page.evaluate((nextTheme) => {
				document.documentElement.classList.toggle("dark", nextTheme === "dark");
			}, theme);
			await page.evaluate(async () => {
				await document.fonts.ready;
				await new Promise<void>((resolve) =>
					requestAnimationFrame(() => resolve()),
				);
			});
		}

		async function assertFoundationDefaults(theme: (typeof THEMES)[number]) {
			const computed = await page.evaluate(() => {
				const probe = document.createElement("div");
				probe.className = "border";
				document.body.append(probe);
				const probeStyle = getComputedStyle(probe);
				const bodyStyle = getComputedStyle(document.body);
				const htmlStyle = getComputedStyle(document.documentElement);
				const result = {
					bodyBackground: bodyStyle.backgroundColor,
					bodyForeground: bodyStyle.color,
					borderColor: probeStyle.borderTopColor,
					colorScheme: htmlStyle.colorScheme,
				};
				probe.remove();
				return result;
			});

			expect(computed.bodyBackground).not.toBe("rgba(0, 0, 0, 0)");
			expect(computed.borderColor).not.toBe(computed.bodyForeground);
			expect(computed.colorScheme).toBe(theme);
		}

		async function attachScreenshot(name: string) {
			await page.addStyleTag({
				content:
					"*,::before,::after{animation-duration:0s!important;transition:none!important;caret-color:transparent!important}",
			});
			const body = await page.screenshot({
				animations: "disabled",
				caret: "hide",
				fullPage: true,
				mask: [page.locator('[data-slot="sidebar-footer"] p')],
			});
			await testInfo.attach(name, { body, contentType: "image/png" });
		}
	});

	test("client workspace captures light and dark foundation evidence", async ({
		page,
		workerTenant,
	}, testInfo) => {
		// biome-ignore lint/suspicious/noSkippedTests: Local external evidence may be absent; CI fails closed.
		test.skip(
			!workerTenant,
			"E2E factory incomplete — authenticated foundation evidence requires DATABASE_URL and E2E_FACTORY_PASSWORD",
		);
		if (!workerTenant) {
			return;
		}

		await loginAsClient(page, workerTenant.client);
		await page.goto("/client", { waitUntil: "networkidle" });
		await expect(
			page.getByRole("heading", {
				name: /Workspace modules|No modules available/,
			}),
		).toBeVisible();

		await forEachThemeSequentially(async (theme) => {
			await page.evaluate((nextTheme) => {
				document.documentElement.classList.toggle("dark", nextTheme === "dark");
			}, theme);
			await page.evaluate(async () => {
				await document.fonts.ready;
				await new Promise<void>((resolve) =>
					requestAnimationFrame(() => resolve()),
				);
			});
			await expect(page.locator("main")).toHaveClass(/bg-background/);
			const body = await page.screenshot({
				animations: "disabled",
				caret: "hide",
				fullPage: true,
			});
			await testInfo.attach(`client-${theme}`, {
				body,
				contentType: "image/png",
			});
		});
	});

	test("standalone 403 shell remains on the canvas in both themes", async ({
		page,
	}, testInfo) => {
		await page.goto("/403", { waitUntil: "networkidle" });
		await expect(
			page.getByRole("heading", { name: "Access denied" }),
		).toBeVisible();

		await forEachThemeSequentially(async (theme) => {
			await page.evaluate((nextTheme) => {
				document.documentElement.classList.toggle("dark", nextTheme === "dark");
			}, theme);
			await expect(page.locator("#main-content")).toHaveClass(/bg-canvas/);
			const body = await page.screenshot({
				animations: "disabled",
				caret: "hide",
				fullPage: true,
			});
			await testInfo.attach(`403-${theme}`, {
				body,
				contentType: "image/png",
			});
		});
	});
});
