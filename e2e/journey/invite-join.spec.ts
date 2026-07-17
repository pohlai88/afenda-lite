import { loginAsOperator, signIn } from "@/testing/e2e/flows";
import { expect, test } from "@/testing/e2e/playwright-base";
import {
	assertInviteAccepted,
	prepareInviteeForOrg,
} from "@/testing/e2e/tenancy";

/**
 * N8 — authenticated operator invite → `/join?invitationId=` accept (@journey).
 *
 * N13 worker factory supplies a unique operator, invitee, and orgA. Seed
 * autofill accounts are never login subjects.
 *
 * Mapped accept path (Neon Auth + UI):
 * 1. Operator invites a **verified non-member** (Neon rejects current members).
 * 2. Unauthenticated `/join` → `/auth/login?redirectTo=/join?invitationId=…`.
 * 3. Invitee **signs in** (not sign-up) — avoids hashed signup OTP.
 * 4. AcceptInvitationCard accept → role home; invitation status=`accepted`.
 */

test.describe("invite → join accept @journey", () => {
	test("operator invites verified non-member; invitee accepts at /join", async ({
		page,
		workerTenant,
	}) => {
		test.setTimeout(180_000);

		test.skip(
			!workerTenant,
			"workerTenant factory required (E2E_FACTORY_PASSWORD + DATABASE_URL)",
		);
		if (!workerTenant) {
			return;
		}

		const { operator, invitee, orgA } = workerTenant;
		await prepareInviteeForOrg({
			inviteeEmail: invitee.email,
			organizationId: orgA.id,
		});

		await loginAsOperator(page, operator);

		await page.goto("/admin");
		const inviteForm = page.locator("form").filter({
			has: page.getByRole("button", { name: /send invitation/i }),
		});
		await expect(inviteForm).toBeVisible({ timeout: 15_000 });
		await inviteForm.locator('input[name="email"]').fill(invitee.email);
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
		await expect(status).toContainText(invitee.email.toLowerCase());

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

		await signIn(page, invitee.email, invitee.password);

		await page.waitForURL(
			(url) =>
				url.pathname.startsWith("/join") ||
				url.pathname.startsWith("/client/declarations") ||
				url.pathname.startsWith("/client/dashboard") ||
				url.pathname.startsWith("/admin"),
			{ timeout: 45_000 },
		);

		if (new URL(page.url()).pathname.startsWith("/join")) {
			const acceptButton = page.getByRole("button", { name: /^accept$/i });
			await expect(acceptButton).toBeVisible({ timeout: 30_000 });
			await acceptButton.click();
		}

		await page.waitForURL(/\/(client\/(declarations|dashboard)|admin)(\/|$)/, {
			timeout: 60_000,
		});
		expect(new URL(page.url()).pathname).toMatch(
			/^\/(client\/(declarations|dashboard)|admin)/,
		);

		await assertInviteAccepted({
			inviteeEmail: invitee.email,
			invitationId: invitationId ?? "",
			organizationId: orgA.id,
		});
	});
});
