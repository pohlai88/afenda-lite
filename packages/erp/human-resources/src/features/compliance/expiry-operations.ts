import type { Result } from "@afenda/errors";
import type { ComplianceExpiryOperations } from "../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import { HUMAN_RESOURCES_QUERY_COMPLIANCE_EXPIRY_OPERATIONS_DETECT } from "../../kernel/operations/module-ids";
import { runComplianceCapabilityQuery } from "./run-operation";
import { detectComplianceExpiryOperationsInputSchema } from "./schema";

const DEFAULT_WITHIN_DAYS = 30;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

export function detectComplianceExpiryOperations(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ComplianceExpiryOperations>> {
	return runComplianceCapabilityQuery(input, options, {
		schema: detectComplianceExpiryOperationsInputSchema,
		invalidMessage: "Invalid compliance expiry operations input",
		query: HUMAN_RESOURCES_QUERY_COMPLIANCE_EXPIRY_OPERATIONS_DETECT,
		storeMethods: [
			"listExpiringEmployeeDocuments",
			"listEmployeesWithWorkEligibilityRisk",
			"listOverduePolicyAcknowledgements",
			"listExpiringCertifications",
		],
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
			if (!expiringDocuments.ok) {
				return expiringDocuments;
			}

			const workEligibilityRisks =
				await store.listEmployeesWithWorkEligibilityRisk({
					organizationId: data.organizationId,
					asOf: data.asOf,
					withinDays,
					page: DEFAULT_PAGE,
					pageSize,
				});
			if (!workEligibilityRisks.ok) {
				return workEligibilityRisks;
			}

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
			if (!expiringCertifications.ok) {
				return expiringCertifications;
			}

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
