import {
	createOrganization,
	deleteOrganization,
	listOrganizations,
	provisionOrganization,
} from "./org";
import {
	createdOrganizationSchema,
	createOrganizationInputSchema,
	deletedOrganizationSchema,
	deleteOrganizationInputSchema,
	organizationSummarySchema,
	provisionOrganizationInputSchema,
	provisionOrganizationResultSchema,
} from "./schemas/org";
import {
	getOrganizationUsageInputSchema,
	organizationUsageMetricsSchema,
	usagePeriodSchema,
} from "./schemas/usage";
import { getOrganizationUsageMetrics, usagePeriodUtcBounds } from "./usage";
import { bandFor, USAGE_BANDS, USAGE_METRIC_KEYS } from "./usage-bands";
import { buildUsagePosition } from "./usage-position";

const organizations = Object.freeze({
	create: createOrganization,
	delete: deleteOrganization,
	list: listOrganizations,
	provision: provisionOrganization,
});

const schemas = Object.freeze({
	organizations: Object.freeze({
		createInput: createOrganizationInputSchema,
		created: createdOrganizationSchema,
		deleteInput: deleteOrganizationInputSchema,
		deleted: deletedOrganizationSchema,
		provisionInput: provisionOrganizationInputSchema,
		provisionResult: provisionOrganizationResultSchema,
		summary: organizationSummarySchema,
	}),
	usage: Object.freeze({
		input: getOrganizationUsageInputSchema,
		metrics: organizationUsageMetricsSchema,
		period: usagePeriodSchema,
	}),
});

const usage = Object.freeze({
	bands: USAGE_BANDS,
	buildPosition: buildUsagePosition,
	classifyBand: bandFor,
	get: getOrganizationUsageMetrics,
	metricKeys: USAGE_METRIC_KEYS,
	periodBounds: usagePeriodUtcBounds,
});

/** Permanent server-only organization administration capability. */
export const admin = Object.freeze({ organizations, schemas, usage });

export type AdminCapability = typeof admin;
