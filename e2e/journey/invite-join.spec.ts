import { resolveOperatorCredentials } from "@/testing/e2e/credentials";
import {
	assertN8InviteAccepted,
	prepareN8InviteeFixture,
	resolveN8InviteeCredentials,
} from "@/testing/e2e/invitee-fixture";
import { expect, test } from "@/testing/e2e/playwright-base";

/**
 * N8 — authenticated operator invite → `/join?invitationId=` accept (@journey).
 *
 * Mapped accept path (Neon Auth + UI):
 * 1. Operator invites a **verified non-member** (Neon rejects current members).
 * 2. Unauthenticated `/join` → `/auth/login?redirectTo=/join?invitationId=…`.
 * 3. Invitee **signs in** (not sign-up) — avoids hashed signup OTP in
 *    `neon_auth.verification`.
 * 4. AcceptInvitationCard accept → role home; invitation status=`accepted`.
 */

const operator = resolveOperatorCredentials();
const invitee = resolveN8InviteeCredentials();
const hasInviteJoinPair = Boolean(
	operator && invitee && process.env.DATABASE_URL?.trim(),
);

async function signIn(
	page: import("@playwright/test").Page,
	email: string,
	password: string,
): Promise<void> {
	await page.goto("/auth/login");
	await page.getByRole("textbox", { name: /email/i }).fill(email);
	await page.locator('input[type="password"]').first().fill(password);
	await page
		.getByRole("button", { name: /sign in|log in|login|continue/i })
		.first()
		.click();
}

test.describe("invite → join accept @journey", () => {
	test("operator invites verified non-member; invitee accepts at /join", async ({
		page,
	}) => {
		test.setTimeout(180_000);
		test.skip(
			!hasInviteJoinPair,
			"Operator + N8 invitee credentials + DATABASE_URL required",
		);

		const operatorEmail = operator?.email ?? "";
		const operatorPassword = operator?.password ?? "";
		const inviteeEmail = invitee?.email ?? "";
		const inviteePassword = invitee?.password ?? "";

		await prepareN8InviteeFixture(inviteeEmail);

		await signIn(page, operatorEmail, operatorPassword);
		await page.waitForURL(/\/admin(\/|$)/, { timeout: 45_000 });

		await page.goto("/admin");
		const inviteForm = page.locator("form").filter({
			has: page.getByRole("button", { name: /send invitation/i }),
		});
		await expect(inviteForm).toBeVisible({ timeout: 15_000 });
		await inviteForm.locator('input[name="email"]').fill(inviteeEmail);
		const roleSelect = inviteForm.locator('select[name="role"]');
		if (await roleSelect.count()) {
			await roleSelect.selectOption("client");
		}
		await inviteForm.getByRole("button", { name: /send invitation/i }).click();

		const status = inviteForm.getByRole("status");
		const formError = inviteForm.getByRole("alert");
		await Promise.race([
			status.waitFor({ state: "visible", timeout: 45_000 }),
			formError.waitFor({ state: "visible", timeout: 45_000 }),
		]).catch(async () => {
			const body = await page.locator("body").innerText();
			throw new Error(
				`Invite produced neither status nor form error. Body excerpt:\n${body.slice(0, 1200)}`,
			);
		});
		if (await formError.isVisible()) {
			throw new Error(
				`Invite failed: ${(await formError.innerText())?.trim() || "(empty alert)"}`,
			);
		}
		await expect(status).toContainText(inviteeEmail.toLowerCase());

		const joinLink = page.getByTestId("invite-join-url");
		await expect(joinLink).toBeVisible({ timeout: 15_000 });
		const joinHref = await joinLink.getAttribute("href");
		expect(joinHref).toMatch(/^\/join\?invitationId=/);
		const invitationId = new URL(
			joinHref ?? "",
			"http://localhost",
		).searchParams.get("invitationId");
		expect(invitationId).toBeTruthy();

		await page.context().clearCookies();
		await page.goto(`/join?invitationId=${invitationId}`);
		await page.waitForURL(/\/auth\/login/, { timeout: 30_000 });
		const loginUrl = new URL(page.url());
		expect(loginUrl.pathname).toBe("/auth/login");
		expect(
			decodeURIComponent(loginUrl.searchParams.get("redirectTo") ?? ""),
		).toBe(`/join?invitationId=${invitationId}`);

		await page.getByRole("textbox", { name: /email/i }).fill(inviteeEmail);
		await page.locator('input[type="password"]').first().fill(inviteePassword);
		await page
			.getByRole("button", { name: /sign in|log in|login|continue/i })
			.first()
			.click();

		await page.waitForURL(
			(url) =>
				url.pathname.startsWith("/join") ||
				url.pathname.startsWith("/client/dashboard") ||
				url.pathname.startsWith("/admin"),
			{ timeout: 45_000 },
		);

		if (new URL(page.url()).pathname.startsWith("/join")) {
			// Neon Auth UI: heading "Accept Invitation"; primary action label is "Accept".
			const acceptButton = page.getByRole("button", { name: /^accept$/i });
			await expect(acceptButton).toBeVisible({ timeout: 30_000 });
			await acceptButton.click();
		}

		await page.waitForURL(/\/(client\/dashboard|admin)(\/|$)/, {
			timeout: 60_000,
		});
		expect(new URL(page.url()).pathname).toMatch(
			/^\/(client\/dashboard|admin)/,
		);

		await assertN8InviteAccepted({
			inviteeEmail,
			invitationId: invitationId ?? "",
		});
	});
});
