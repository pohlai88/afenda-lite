import type { HumanResourcesCommandOptions } from "@afenda/human-resources";
import { createProductionAssignmentContextQuery } from "@afenda/human-resources";
import { createDrizzleAssignmentContextQuery } from "@afenda/human-resources/adapters/drizzle";
import { createHumanResourcesApprovedLeaveQueryPort } from "@/lib/erp/human-resources-approved-leave-query-port";
import { createHumanResourcesAttendanceSourcePort } from "@/lib/erp/human-resources-attendance-source-port";
import {
	createHumanResourcesAuthorizationPort,
	createHumanResourcesResourceAwareAuthorizationPort,
} from "@/lib/erp/human-resources-authorization-port";
import { createHumanResourcesDocumentReferencePort } from "@/lib/erp/human-resources-document-reference-port";
import { createHumanResourcesIdentityResolverPort } from "@/lib/erp/human-resources-identity-resolver-port";
import { createHumanResourcesWorkCalendarPort } from "@/lib/erp/human-resources-work-calendar-port";

/** Composition-root options for `@afenda/human-resources` public APIs. */
export function createHumanResourcesCommandOptions(): HumanResourcesCommandOptions {
	return {
		authorization: createHumanResourcesAuthorizationPort(),
		resourceAwareAuthorization:
			createHumanResourcesResourceAwareAuthorizationPort(),
		identityResolver: createHumanResourcesIdentityResolverPort(),
		workCalendar: createHumanResourcesWorkCalendarPort(),
		approvedLeave: createHumanResourcesApprovedLeaveQueryPort(),
		assignmentContext: createProductionAssignmentContextQuery({
			query: createDrizzleAssignmentContextQuery(),
		}),
		attendanceSource: createHumanResourcesAttendanceSourcePort(),
		documentReference: createHumanResourcesDocumentReferencePort(),
	};
}
