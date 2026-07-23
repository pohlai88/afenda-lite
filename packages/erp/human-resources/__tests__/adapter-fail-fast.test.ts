import { describe, expect, it } from "vitest";

import { registerEmployeeDocument } from "../src/compliance/employee-document";
import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
} from "../src/error-codes";
import { createDraftLeaveRequest } from "../src/leave/leave-request";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";

describe("P0-04 fail-fast missing adapters", () => {
	it("rejects leave commands without a work calendar adapter", async () => {
		const result = await createDraftLeaveRequest(
			{
				organizationId: "org-ff",
				actorUserId: "user-ff",
				correlationId: "corr-ff-leave",
				idempotencyKey: "idem-ff-leave",
				employeeId: "00000000-0000-4000-8000-000000000001",
				entitlementId: "00000000-0000-4000-8000-000000000002",
				startDate: "2025-01-06",
				endDate: "2025-01-07",
				requestedQuantity: "2",
			},
			{
				store: createMemoryHumanResourcesStore(),
				ports: createMemoryMutationPorts(),
				authorization: createGrantingHumanResourcesAuthorization(
					HUMAN_RESOURCES_PERMISSION_CODES,
				),
			},
		);
		expect(result.ok).toBe(false);
		expect(humanResourcesCodeFromResult(result)).toBe(
			HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
		);
	});

	it("rejects compliance document registration without a document reference adapter", async () => {
		const result = await registerEmployeeDocument(
			{
				organizationId: "org-ff",
				actorUserId: "user-ff",
				correlationId: "corr-ff-doc",
				idempotencyKey: "idem-ff-doc",
				employeeId: "00000000-0000-4000-8000-000000000001",
				documentType: "passport",
				issuedOn: "2024-01-01",
				documentRef: "vault://organizations/org-ff/passport/doc-1",
			},
			{
				store: createMemoryHumanResourcesStore(),
				ports: createMemoryMutationPorts(),
				authorization: createGrantingHumanResourcesAuthorization(
					HUMAN_RESOURCES_PERMISSION_CODES,
				),
			},
		);
		expect(result.ok).toBe(false);
		expect(humanResourcesCodeFromResult(result)).toBe(
			HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
		);
	});
});
