import type { HumanResourcesPermission } from "../permissions";

export const HUMAN_RESOURCES_CAPABILITY_IDS = [
	"workforce-foundation",
	"organization",
	"recruitment",
	"employment-lifecycle",
	"leave-time",
	"compensation-benefits",
	"performance-talent",
	"learning",
	"compliance-employee-relations",
	"reporting-bulk-reliability",
] as const;

export type HumanResourcesCapabilityId =
	(typeof HUMAN_RESOURCES_CAPABILITY_IDS)[number];

export type HumanResourcesOperationKind = "command" | "query";

export interface HumanResourcesOperationDefinition {
	readonly authorizationPolicy: string;
	readonly id: `human-resources.${string}`;
	readonly kind: HumanResourcesOperationKind;
	readonly owner: HumanResourcesCapabilityId;
	readonly permission: HumanResourcesPermission;
	readonly publicName: string;
}

export type HumanResourcesOperationRegistry = Readonly<
	Record<string, HumanResourcesOperationDefinition>
>;
