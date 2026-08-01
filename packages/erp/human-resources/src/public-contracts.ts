import type { HumanResourcesBulkExportPorts } from "./bulk-export/types";
import type { HumanResourcesIdentityResolverPort } from "./identity-resolver";
import type {
	PayrollDeliveryPorts,
	PayrollDeliveryProducerPort,
} from "./integrations/payroll-delivery/ports";
import type {
	HrObservabilityPort,
	HrObservabilityPorts,
} from "./observability";
import type {
	ApprovedLeaveQueryPort,
	AttendanceSourcePort,
	CurrencyLookupPort,
	DocumentObjectResolverPort,
	DocumentReferencePort,
	OrganizationDimensionDirectoryPort,
} from "./ports";
import type { HumanResourcesPrivacyPort } from "./privacy";
import type { HumanResourcesPrivacyDeletionPort } from "./privacy/deletion-decision";
import type {
	ReliabilityExecutorPort,
	ReliabilityKernelPorts,
	ReliabilityStorePort,
} from "./reliability";
import type { HumanResourcesReportingSourcePort } from "./reporting";
import type {
	HumanResourcesAuthorizationDecisionInput,
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
} from "./shared/authorization-types";
import type { HumanResourcesStore } from "./store";
import type { WorkCalendarPort } from "./time/work-calendar";

/** Stable integration capabilities. Internal implementations retain package-private port names. */
export type ApprovedLeaveQueryCapability = ApprovedLeaveQueryPort;
export type AttendanceSourceCapability = AttendanceSourcePort;
export type CurrencyLookupCapability = CurrencyLookupPort;
export type DocumentObjectResolverCapability = DocumentObjectResolverPort;
export type DocumentReferenceCapability = DocumentReferencePort;
export type HrObservabilityCapability = HrObservabilityPort;
export type HrObservabilityCapabilities = HrObservabilityPorts;
export type HumanResourcesAuthorizationCapability =
	HumanResourcesAuthorizationPort;
export type HumanResourcesResourceAuthorizationCapability =
	HumanResourcesResourceAwareAuthorizationPort;
export type HumanResourcesResourceAuthorizationRequest =
	HumanResourcesAuthorizationDecisionInput;
export type HumanResourcesIdentityResolverCapability =
	HumanResourcesIdentityResolverPort;
export type HumanResourcesBulkExportCapabilities =
	HumanResourcesBulkExportPorts;
export type HumanResourcesPrivacyCapability = HumanResourcesPrivacyPort;
export type HumanResourcesPrivacyDeletionCapability =
	HumanResourcesPrivacyDeletionPort;
export type HumanResourcesReportingSourceCapability =
	HumanResourcesReportingSourcePort;
export type OrganizationDimensionDirectoryCapability =
	OrganizationDimensionDirectoryPort;
export type PayrollDeliveryCapabilities = PayrollDeliveryPorts;
export type PayrollDeliveryProducerCapability = PayrollDeliveryProducerPort;
export type ReliabilityExecutorCapability = ReliabilityExecutorPort;
export type ReliabilityKernelCapabilities = ReliabilityKernelPorts;
export type ReliabilityStoreCapability = ReliabilityStorePort;
export type WorkCalendarCapability = WorkCalendarPort;

export type HumanResourcesBulkExportDataCapability = Pick<
	HumanResourcesStore,
	| "listEmployees"
	| "listEmploymentsByEmployee"
	| "listAssignmentsByEmployment"
	| "listLeaveEntitlements"
>;
