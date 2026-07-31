import { errorResult, type Result } from "@afenda/errors";

import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../authorization";
import type { CorporateAdministrationQueryOptions } from "../command-options";
import { parseCorporateAdministrationInput } from "../parse-input";
import {
	calculateResolutionExecutionStatus,
	isResolutionActionOverdue,
} from "./rules";
import {
	getResolutionExecutionStatusInputSchema,
	getResolutionInputSchema,
	listOverdueResolutionActionsInputSchema,
	listResolutionsAsOfInputSchema,
} from "./schemas";
import type { ResolutionStore } from "./store";
import type {
	GetResolutionExecutionStatusInput,
	GetResolutionInput,
	ListOverdueResolutionActionsInput,
	ListResolutionsAsOfInput,
	Resolution,
	ResolutionAction,
	ResolutionExecutionStatus,
} from "./types";

export type ResolutionQueryDependencies = Readonly<{
	resolutionStore: ResolutionStore;
}>;

export async function getResolution(
	input: GetResolutionInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: ResolutionQueryDependencies,
): Promise<Result<Resolution | null>> {
	const parsed = parseCorporateAdministrationInput(
		getResolutionInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "getResolution");
	if (!authorized.ok) {
		return authorized;
	}
	return dependencies.resolutionStore.getResolution({
		organizationId: options.organizationId,
		resolutionId: parsed.data.resolutionId,
	});
}

export async function listResolutionsAsOf(
	input: ListResolutionsAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: ResolutionQueryDependencies,
): Promise<Result<readonly Resolution[]>> {
	const parsed = parseCorporateAdministrationInput(
		listResolutionsAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "listResolutionsAsOf");
	if (!authorized.ok) {
		return authorized;
	}
	return dependencies.resolutionStore.listResolutionsAsOf({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		asOf: parsed.data.asOf,
		status: parsed.data.status,
	});
}

export async function getResolutionExecutionStatus(
	input: GetResolutionExecutionStatusInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: ResolutionQueryDependencies,
): Promise<Result<ResolutionExecutionStatus>> {
	const parsed = parseCorporateAdministrationInput(
		getResolutionExecutionStatusInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "getResolutionExecutionStatus");
	if (!authorized.ok) {
		return authorized;
	}
	const resolution = await dependencies.resolutionStore.getResolution({
		organizationId: options.organizationId,
		resolutionId: parsed.data.resolutionId,
	});
	if (!resolution.ok) {
		return resolution;
	}
	if (resolution.data === null) {
		return notFound("resolution");
	}
	const actions = await dependencies.resolutionStore.listResolutionActions({
		organizationId: options.organizationId,
		resolutionId: parsed.data.resolutionId,
	});
	if (!actions.ok) {
		return actions;
	}
	return errorResult.ok(
		calculateResolutionExecutionStatus({
			resolution: resolution.data,
			actions: actions.data,
			asOf: resolution.data.effectiveFrom,
		}),
	);
}

export async function listOverdueResolutionActions(
	input: ListOverdueResolutionActionsInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: ResolutionQueryDependencies,
): Promise<Result<readonly ResolutionAction[]>> {
	const parsed = parseCorporateAdministrationInput(
		listOverdueResolutionActionsInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "listOverdueResolutionActions");
	if (!authorized.ok) {
		return authorized;
	}
	const actions =
		await dependencies.resolutionStore.listOverdueResolutionActions({
			organizationId: options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			asOf: parsed.data.asOf,
		});
	if (!actions.ok) {
		return actions;
	}
	return errorResult.ok(
		actions.data.filter((action) =>
			isResolutionActionOverdue({ action, asOf: parsed.data.asOf }),
		),
	);
}

function authorize(
	options: CorporateAdministrationQueryOptions,
	query: keyof typeof CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
) {
	return requireCorporateAdministrationPermission(options.authorization, {
		organizationId: options.organizationId,
		actorUserId: options.actorUserId,
		permission: CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS[query],
	});
}

function notFound(_entityType: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}
