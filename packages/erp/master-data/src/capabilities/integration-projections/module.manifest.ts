import {
	MASTER_DATA_EVENT_TYPES,
	type MasterDataEventType,
} from "./integration/event-types";

export type IntegrationProjectionCapabilityId =
	"master-data.integration-projections";

export type PlatformCapabilityId =
	| "platform.audit"
	| "platform.outbox"
	| "platform.search";

export type ForbiddenDependencyRoot =
	| "next"
	| "apps/*"
	| "@afenda/ui-system"
	| "nats"
	| "kafkajs"
	| "redis";

export type IntegrationProjectionAtomicWrite =
	| "authoritative_master_state"
	| "audit_fact"
	| "outbox_event";

export type IntegrationProjectionManifest = Readonly<{
	manifestVersion: 1;
	capability: IntegrationProjectionCapabilityId;
	emits: readonly MasterDataEventType[];
	uses: readonly PlatformCapabilityId[];
	dependencyPolicy: Readonly<{
		forbiddenDependencyRoots: readonly ForbiddenDependencyRoot[];
		matcherSemantics: "package_root_and_subpaths_unless_glob";
	}>;
	transactionContract: Readonly<{
		atomicWrites: readonly IntegrationProjectionAtomicWrite[];
		failureSemantics: "rollback_all";
	}>;
	deliveryContract: Readonly<{
		publication: "at_least_once";
		idempotencyKey: "eventId";
		ordering: "aggregate_version_guarded";
	}>;
	searchContract: Readonly<{
		authority: "non_authoritative";
		mutationAuthority: false;
		authorizationAuthority: false;
		rebuildable: true;
		versionGuarded: true;
	}>;
}>;

export const INTEGRATION_PROJECTIONS_MODULE_MANIFEST = {
	manifestVersion: 1,
	capability: "master-data.integration-projections",
	emits: MASTER_DATA_EVENT_TYPES,
	uses: ["platform.audit", "platform.outbox", "platform.search"],
	dependencyPolicy: {
		forbiddenDependencyRoots: [
			"next",
			"apps/*",
			"@afenda/ui-system",
			"nats",
			"kafkajs",
			"redis",
		],
		matcherSemantics: "package_root_and_subpaths_unless_glob",
	},
	transactionContract: {
		atomicWrites: ["authoritative_master_state", "audit_fact", "outbox_event"],
		failureSemantics: "rollback_all",
	},
	deliveryContract: {
		publication: "at_least_once",
		idempotencyKey: "eventId",
		ordering: "aggregate_version_guarded",
	},
	searchContract: {
		authority: "non_authoritative",
		mutationAuthority: false,
		authorizationAuthority: false,
		rebuildable: true,
		versionGuarded: true,
	},
} as const satisfies IntegrationProjectionManifest;
