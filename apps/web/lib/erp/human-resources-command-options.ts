import type { HumanResourcesCommandOptions } from "@afenda/human-resources";
import { createProductionAssignmentContextQuery } from "@afenda/human-resources";
import { createDrizzleAssignmentContextQuery } from "@afenda/human-resources/adapters/drizzle";
import { createHumanResourcesApprovedLeaveQueryPort } from "@/lib/erp/human-resources-approved-leave-query-port";
import { createHumanResourcesAttendanceSourcePort } from "@/lib/erp/human-resources-attendance-source-port";
import {
	createHumanResourcesAuthorizationPort,
	createHumanResourcesResourceAwareAuthorizationPort,
} from "@/lib/erp/human-resources-authorization-port";
import { createHumanResourcesDocumentObjectResolverPort } from "@/lib/erp/human-resources-document-object-resolver-port";
import { createHumanResourcesDocumentReferencePort } from "@/lib/erp/human-resources-document-reference-port";
import { createHumanResourcesIdentityResolverPort } from "@/lib/erp/human-resources-identity-resolver-port";
import { createHumanResourcesOrganizationDimensionPort } from "@/lib/erp/human-resources-organization-dimension-port";
import { createHumanResourcesPrivacyPort } from "@/lib/erp/human-resources-privacy-port";
import { createHumanResourcesWorkCalendarPort } from "@/lib/erp/human-resources-work-calendar-port";
import { createProductionHrObservabilityPorts } from "@/modules/platform/observability/human-resources-observability";

/** Composition-root options for `@afenda/human-resources` public APIs. */
export function createHumanResourcesCommandOptions(): HumanResourcesCommandOptions {
	const documentObjectResolver =
		createHumanResourcesDocumentObjectResolverPort();
	const observability = createProductionHrObservabilityPorts();
	return {
		authorization: createHumanResourcesAuthorizationPort(),
		resourceAwareAuthorization:
			createHumanResourcesResourceAwareAuthorizationPort(),
		identityResolver: createHumanResourcesIdentityResolverPort(),
		organizationDimensions: createHumanResourcesOrganizationDimensionPort(),
		workCalendar: createHumanResourcesWorkCalendarPort(),
		approvedLeave: createHumanResourcesApprovedLeaveQueryPort(),
		assignmentContext: createProductionAssignmentContextQuery({
			query: createDrizzleAssignmentContextQuery(),
		}),
		attendanceSource: createHumanResourcesAttendanceSourcePort(observability),
		documentObjectResolver,
		documentReference: createHumanResourcesDocumentReferencePort(
			documentObjectResolver,
		),
		privacy: createHumanResourcesPrivacyPort(),
		observability,
	};
}
