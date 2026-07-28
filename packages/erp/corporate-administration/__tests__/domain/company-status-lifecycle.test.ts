import { describe, expect, it } from "vitest";

import {
	legalCompanyStatusRequiresApproval,
	validateLegalCompanyStatusTransition,
} from "../../src/company";

describe("legal company status lifecycle", () => {
	it("allows the approved Phase 1 transition path", () => {
		expect(
			validateLegalCompanyStatusTransition({ from: "draft", to: "active" }).ok,
		).toBe(true);
		expect(
			validateLegalCompanyStatusTransition({
				from: "active",
				to: "suspended",
			}).ok,
		).toBe(true);
		expect(
			validateLegalCompanyStatusTransition({
				from: "suspended",
				to: "in_liquidation",
			}).ok,
		).toBe(true);
		expect(
			validateLegalCompanyStatusTransition({
				from: "in_liquidation",
				to: "dissolved",
			}).ok,
		).toBe(true);
		expect(
			validateLegalCompanyStatusTransition({
				from: "dissolved",
				to: "restored",
			}).ok,
		).toBe(true);
	});

	it("rejects no-op and archived transitions", () => {
		expect(
			validateLegalCompanyStatusTransition({ from: "active", to: "active" }).ok,
		).toBe(false);
		expect(
			validateLegalCompanyStatusTransition({
				from: "archived",
				to: "active",
			}).ok,
		).toBe(false);
	});

	it("requires approval for high-risk legal states", () => {
		expect(legalCompanyStatusRequiresApproval("active")).toBe(false);
		expect(legalCompanyStatusRequiresApproval("suspended")).toBe(false);
		expect(legalCompanyStatusRequiresApproval("struck_off")).toBe(true);
		expect(legalCompanyStatusRequiresApproval("in_liquidation")).toBe(true);
		expect(legalCompanyStatusRequiresApproval("dissolved")).toBe(true);
		expect(legalCompanyStatusRequiresApproval("restored")).toBe(true);
		expect(legalCompanyStatusRequiresApproval("archived")).toBe(true);
	});
});
