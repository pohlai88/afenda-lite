import { describe, expect, it, vi } from "vitest";

import { authorizeCorporateAdministrationCommand } from "../src/internal/durable-command";
import { caCommandOptions } from "./helpers/legal-company-test-kit";

describe("Corporate Administration command authorization kernel", () => {
	it("derives the command permission from the canonical operation registry", async () => {
		const can = vi.fn().mockResolvedValue(true);
		const options = {
			...caCommandOptions(),
			authorization: { can },
		};

		const result = await authorizeCorporateAdministrationCommand(
			"scheduleGovernanceMeeting",
			options,
		);

		expect(result.ok).toBe(true);
		expect(can).toHaveBeenCalledOnce();
		expect(can).toHaveBeenCalledWith({
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission: "corporate_administration.meeting.manage",
		});
	});

	it("fails closed without issuing an authorization token", async () => {
		const can = vi.fn().mockResolvedValue(false);
		const options = {
			...caCommandOptions(),
			authorization: { can },
		};

		const result = await authorizeCorporateAdministrationCommand(
			"registerLegalCompanyDraft",
			options,
		);

		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(can).toHaveBeenCalledOnce();
	});

	it("propagates authorization-provider failures without translating them", async () => {
		const failure = new Error("authorization provider unavailable");
		const options = {
			...caCommandOptions(),
			authorization: { can: vi.fn().mockRejectedValue(failure) },
		};

		await expect(
			authorizeCorporateAdministrationCommand(
				"registerLegalCompanyDraft",
				options,
			),
		).rejects.toBe(failure);
	});
});
