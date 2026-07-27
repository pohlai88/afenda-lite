import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import { HUMAN_RESOURCES_QUERY_COMPLIANCE_EXPIRY_OPERATIONS_DETECT } from "../module-ids";
import { detectComplianceExpiryOperationsInputSchema } from "../schemas/compliance";
import { runComplianceQuery } from "../shared/compliance-command";
import type { ComplianceExpiryOperations } from "../types";

const DEFAULT_WITHIN_DAYS = 30;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

export async function detectComplianceExpiryOperations(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ComplianceExpiryOperations>> {
	return runComplianceQuery(input, options, {
		schema: detectComplianceExpiryOperationsInputSchema,
		invalidMessage: "Invalid compliance expiry operations input",
		query: HUMAN_RESOURCES_QUERY_COMPLIANCE_EXPIRY_OPERATIONS_DETECT,
		execute: async (data, { store }) => {
			const withinDays = data.withinDays ?? DEFAULT_WITHIN_DAYS;
			const pageSize = data.pageSize ?? DEFAULT_PAGE_SIZE;

			const expiringDocuments = await store.listExpiringEmployeeDocuments({
				organizationId: data.organizationId,
				asOf: data.asOf,
				withinDays,
				page: DEFAULT_PAGE,
				pageSize,
			});
			if (!expiringDocuments.ok) return expiringDocuments;

			const workEligibilityRisks =
				await store.listEmployeesWithWorkEligibilityRisk({
					organizationId: data.organizationId,
					asOf: data.asOf,
					withinDays,
					page: DEFAULT_PAGE,
					pageSize,
				});
			if (!workEligibilityRisks.ok) return workEligibilityRisks;

			const overduePolicyAcknowledgements =
				await store.listOverduePolicyAcknowledgements({
					organizationId: data.organizationId,
					asOf: data.asOf,
					page: DEFAULT_PAGE,
					pageSize,
				});
			if (!overduePolicyAcknowledgements.ok) {
				return overduePolicyAcknowledgements;
			}

			const expiringCertifications = await store.listExpiringCertifications({
				organizationId: data.organizationId,
				asOf: data.asOf,
				withinDays,
				page: DEFAULT_PAGE,
				pageSize,
			});
			if (!expiringCertifications.ok) return expiringCertifications;

			return {
				ok: true,
				data: {
					asOf: data.asOf,
					withinDays,
					expiringDocuments: expiringDocuments.data,
					workEligibilityRisks: workEligibilityRisks.data,
					overduePolicyAcknowledgements: overduePolicyAcknowledgements.data,
					expiringCertifications: expiringCertifications.data,
				},
			};
		},
	});
}
