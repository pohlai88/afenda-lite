import type { HumanResourcesResourceKind } from "../authorization/authorization-resource-kind";
import type { HumanResourcesPermission } from "../authorization/permissions";
import type { HrObservabilityArea } from "../observability/types";
import type { HumanResourcesOperationSensitivity } from "../privacy/sensitivity-types";

export const HUMAN_RESOURCES_CAPABILITY_IDS = [
	"workforce-foundation",
	"organization",
	"recruitment",
	"workforce-planning",
	"employment-lifecycle",
	"leave-time",
	"time-attendance",
	"compensation-benefits",
	"performance-talent",
	"learning",
	"compliance-employee-relations",
	"statutory-profile",
	"privacy",
	"reporting-bulk-reliability",
] as const;

export type HumanResourcesCapabilityId =
	(typeof HUMAN_RESOURCES_CAPABILITY_IDS)[number];

export const HUMAN_RESOURCES_CAPABILITY_OBSERVABILITY_AREAS = {
	"workforce-foundation": "workforce",
	organization: "workforce",
	recruitment: "workforce",
	"workforce-planning": "workforce",
	"employment-lifecycle": "workforce",
	"leave-time": "leave",
	"time-attendance": "time",
	"compensation-benefits": "compensation",
	"performance-talent": "talent",
	learning: "talent",
	"compliance-employee-relations": "compliance",
	"statutory-profile": "compliance",
	privacy: "privacy",
	"reporting-bulk-reliability": "integration",
} as const satisfies Record<HumanResourcesCapabilityId, HrObservabilityArea>;

export type HumanResourcesOperationKind = "command" | "query";

export interface HumanResourcesOperationDefinition {
	readonly authorizationPolicy: string;
	readonly id: `human-resources.${string}`;
	readonly kind: HumanResourcesOperationKind;
	readonly observabilityArea: HrObservabilityArea;
	readonly owner: HumanResourcesCapabilityId;
	readonly permission: HumanResourcesPermission;
	readonly publicName: string;
	readonly resourceKind: HumanResourcesResourceKind | null;
	readonly sensitivity: HumanResourcesOperationSensitivity | null;
}

export type HumanResourcesOperationDeclaration = Omit<
	HumanResourcesOperationDefinition,
	"observabilityArea" | "resourceKind" | "sensitivity"
> & {
	readonly observabilityArea?: HrObservabilityArea;
	readonly resourceKind?: HumanResourcesResourceKind | null;
	readonly sensitivity?: HumanResourcesOperationSensitivity | null;
};

export type HumanResourcesOperationDeclarationRegistry = Readonly<
	Record<string, HumanResourcesOperationDeclaration>
>;

export type HumanResourcesOperationRegistry = Readonly<
	Record<string, HumanResourcesOperationDefinition>
>;
