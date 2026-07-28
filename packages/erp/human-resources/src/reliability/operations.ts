export const RELIABILITY_OPERATION_DEFINITIONS = {
	"attendance.pull-events": {
		connector: "attendance",
		operation: "pull-events",
		targetType: "connector_stream",
		acknowledgement: "synchronous",
	},
	"bulk.resume-import": {
		connector: "bulk",
		operation: "resume-import",
		targetType: "bulk_import_job",
		acknowledgement: "synchronous",
	},
	"bulk.run-export": {
		connector: "bulk",
		operation: "run-export",
		targetType: "bulk_export_job",
		acknowledgement: "synchronous",
	},
	"bulk.purge-import": {
		connector: "bulk",
		operation: "purge-import",
		targetType: "bulk_import_job",
		acknowledgement: "synchronous",
	},
	"bulk.purge-export": {
		connector: "bulk",
		operation: "purge-export",
		targetType: "bulk_export_job",
		acknowledgement: "synchronous",
	},
	"payroll.publish-delivery": {
		connector: "payroll",
		operation: "publish-delivery",
		targetType: "payroll_delivery",
		acknowledgement: "asynchronous",
	},
	"platform.dispatch-events": {
		connector: "platform",
		operation: "dispatch-events",
		targetType: "organization",
		acknowledgement: "synchronous",
	},
	"search.rebuild-employee-index": {
		connector: "search",
		operation: "rebuild-employee-index",
		targetType: "organization",
		acknowledgement: "synchronous",
	},
} as const;

export type ReliabilityOperationKey =
	keyof typeof RELIABILITY_OPERATION_DEFINITIONS;
export type ReliabilityOperationDefinition =
	(typeof RELIABILITY_OPERATION_DEFINITIONS)[ReliabilityOperationKey];
export type ReliabilityConnector = ReliabilityOperationDefinition["connector"];
export type ReliabilityOperation = ReliabilityOperationDefinition["operation"];
export type ReliabilityTargetType =
	ReliabilityOperationDefinition["targetType"];

export function resolveReliabilityOperation(input: {
	connector: string;
	operation: string;
	targetType: string;
}): ReliabilityOperationDefinition | null {
	const key =
		`${input.connector}.${input.operation}` as ReliabilityOperationKey;
	const definition = RELIABILITY_OPERATION_DEFINITIONS[key];
	return definition !== undefined && definition.targetType === input.targetType
		? definition
		: null;
}
