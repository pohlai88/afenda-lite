import { describe, expect, it } from "vitest";

import {
	renderOnboardingInviteEmail,
	renderPasswordResetEmail,
} from "../src/index";

describe("@afenda/emails render", () => {
	it("renders onboarding invite HTML with invitee and org", async () => {
		const html = await renderOnboardingInviteEmail({
			inviteeName: "Ada",
			organizationName: "Afenda",
			inviteUrl: "https://afenda-lite.vercel.app/join?invitationId=test",
		});
		expect(html).toContain("Ada");
		expect(html).toContain("Afenda");
		expect(html).toContain("invitationId=test");
	});

	it("renders password-reset HTML with reset URL", async () => {
		const html = await renderPasswordResetEmail({
			recipientName: "Ada",
			resetUrl: "https://afenda-lite.vercel.app/auth/reset-password?token=test",
		});
		expect(html).toContain("Ada");
		expect(html).toContain("reset-password?token=test");
	});
});
