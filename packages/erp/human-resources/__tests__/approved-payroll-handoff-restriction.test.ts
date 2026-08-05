import { describe, expect, it } from "vitest";

import { createMemoryCurrencyLookup } from "../src/features/compensation-benefits/currency-lookup";
import { createPosition } from "../src/features/organization/position";
import { assembleApprovedPayrollHandoff } from "../src/features/payroll-handoff/approved-payroll-handoff";
import { restrictEmployeeData } from "../src/features/privacy/operations";
import { createAssignment } from "../src/features/workforce-records/employment/assignment";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/kernel/authorization/permissions";
import {
	createMemoryHumanResourcesStore,
	createMemoryOrganizationDimensionDirectory,
} from "../src/testing/index";
import {
	createTestHumanResourcesCommandOptions,
	TEST_ORGANIZATION_DIMENSION_KEYS,
} from "./helpers/command-options";
import {
	COMPENSATION_HANDOFF_PARITY_ACTOR,
	COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
	COMPENSATION_HANDOFF_PARITY_ORG,
	seedApprovedCompensationForHandoff,
} from "./helpers/compensation-handoff-parity";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { createHumanResourcesTestPrivacyPort } from "./helpers/privacy-options";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";

describe("assembleApprovedPayrollHandoff restriction (D0/D7)", () => {
	it("refuses assemble when the statutory subject is restriction-active", async () => {
		const ready = {
			authorization: createGrantingHumanResourcesAuthorization(
				HUMAN_RESOURCES_PERMISSION_CODES,
			),
			currency: createMemoryCurrencyLookup(),
			ports: createMemoryMutationPorts(),
			store: createMemoryHumanResourcesStore(),
		};
		const options = createTestHumanResourcesCommandOptions({
			...ready,
			organizationDimensions: createMemoryOrganizationDimensionDirectory(),
			privacy: createHumanResourcesTestPrivacyPort(),
		});
		const seeded = await seedApprovedCompensationForHandoff(ready, {
			idempotencySuffix: "restrict-assemble",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const orgSeed = await seedDepartmentAndJob(options, {
			actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
			organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
		});
		expect(orgSeed).not.toBeNull();
		if (orgSeed === null) {
			return;
		}

		const position = await createPosition(
			{
				actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
				code: "POS-HANDOFF-RESTRICT",
				correlationId: "corr-pos-handoff-restrict",
				departmentId: orgSeed.departmentId,
				jobId: orgSeed.jobId,
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				title: "Handoff Role",
			},
			options,
		);
		expect(position.ok).toBe(true);
		if (!position.ok) {
			return;
		}

		const assignment = await createAssignment(
			{
				actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
				correlationId: "corr-asg-handoff-restrict",
				employmentId: seeded.employment.id,
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				positionId: position.data.id,
				startsOn: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
			},
			options,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const beforeRestriction = await assembleApprovedPayrollHandoff(
			{
				actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
				correlationId: "corr-assemble-before-restrict",
				effectiveDate: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
				employeeId: seeded.employee.id,
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				periodEnd: "2025-01-31",
				periodStart: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
			},
			options,
		);
		expect(beforeRestriction.ok).toBe(true);
		if (beforeRestriction.ok) {
			expect(beforeRestriction.data).not.toBeNull();
		}

		const restricted = await restrictEmployeeData(
			{
				actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
				classifications: ["pay_and_benefits"],
				correlationId: "corr-restrict-assemble",
				legalBasis: "data_subject_request",
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				requestedAt: "2025-01-15T00:00:00.000Z",
				restrictionReference: "dsar-handoff",
				subjectEmployeeId: seeded.employee.id,
			},
			options,
		);
		expect(restricted.ok).toBe(true);

		const blocked = await assembleApprovedPayrollHandoff(
			{
				actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
				correlationId: "corr-assemble-after-restrict",
				effectiveDate: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
				employeeId: seeded.employee.id,
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				periodEnd: "2025-01-31",
				periodStart: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
			},
			options,
		);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.code).toBe("CONFLICT");
		}
	});
});
