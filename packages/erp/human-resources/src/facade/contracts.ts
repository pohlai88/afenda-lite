import type { HumanResourcesStore } from "../composition/store/index";
import type { HumanResourcesBulkExportPorts } from "../features/bulk-export/types";
import type {
	PayrollDeliveryPorts,
	PayrollDeliveryProducerPort,
} from "../features/payroll-handoff/delivery/ports";
import type { HumanResourcesPrivacyPort } from "../features/privacy/contract";
import type { HumanResourcesPrivacyDeletionPort } from "../features/privacy/deletion-decision";
import type { HumanResourcesReportingSourcePort } from "../features/reporting/index";
import type { WorkCalendarPort } from "../features/time/work-calendar";
import type { HumanResourcesIdentityResolverPort } from "../features/workforce-records/identity-resolution/identity-resolver";
import type {
	HumanResourcesAuthorizationDecisionInput,
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceAwareAuthorizationPort,
} from "../kernel/authorization/authorization-types";
import type {
	ApprovedLeaveQueryPort,
	AttendanceSourcePort,
	CurrencyLookupPort,
	DocumentObjectResolverPort,
	DocumentReferencePort,
	OrganizationDimensionDirectoryPort,
} from "../kernel/execution/ports";
import type {
	HrObservabilityPort,
	HrObservabilityPorts,
} from "../kernel/observability/index";
import type {
	ReliabilityExecutorPort,
	ReliabilityKernelPorts,
	ReliabilityStorePort,
} from "../kernel/reliability/index";

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
