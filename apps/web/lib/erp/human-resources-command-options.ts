import { createHumanResourcesCapabilityOptions } from "@afenda/human-resources";
import { createHumanResourcesAttendanceSourcePort } from "@/lib/erp/human-resources-attendance-source-port";
import {
	createHumanResourcesAuthorizationPort,
	createHumanResourcesResourceAwareAuthorizationPort,
} from "@/lib/erp/human-resources-authorization-port";
import { createHumanResourcesCurrencyLookupPort } from "@/lib/erp/human-resources-currency-lookup-port";
import { createHumanResourcesDocumentObjectResolverPort } from "@/lib/erp/human-resources-document-object-resolver-port";
import { createHumanResourcesIdentityResolverPort } from "@/lib/erp/human-resources-identity-resolver-port";
import { createHumanResourcesOrganizationDimensionPort } from "@/lib/erp/human-resources-organization-dimension-port";
import { createHumanResourcesPrivacyPort } from "@/lib/erp/human-resources-privacy-port";
import { createProductionHrObservabilityPorts } from "@/modules/platform/observability/human-resources-observability";

/** Opaque composition-root context for `@afenda/human-resources` capabilities. */
export function createHumanResourcesCommandOptions() {
	const documentObjectResolver =
		createHumanResourcesDocumentObjectResolverPort();
	const observability = createProductionHrObservabilityPorts();
	return createHumanResourcesCapabilityOptions({
		authorization: createHumanResourcesAuthorizationPort(),
		currency: createHumanResourcesCurrencyLookupPort(),
		resourceAwareAuthorization:
			createHumanResourcesResourceAwareAuthorizationPort(),
		identityResolver: createHumanResourcesIdentityResolverPort(),
		organizationDimensions: createHumanResourcesOrganizationDimensionPort(),
		attendanceSource: createHumanResourcesAttendanceSourcePort(observability),
		documentObjectResolver,
		privacy: createHumanResourcesPrivacyPort(),
		observability,
	});
}
