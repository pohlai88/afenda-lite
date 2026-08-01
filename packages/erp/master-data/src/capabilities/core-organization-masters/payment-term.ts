import { errorResult, type Result } from "@afenda/errors";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import {
	type MasterCommandOptions,
	type MasterDataCapabilityOptions,
	resolveCommandDeps,
} from "../../command-options";
import {
	MASTER_COMMAND_PAYMENT_TERM_ACTIVATE,
	MASTER_COMMAND_PAYMENT_TERM_CREATE,
	MASTER_COMMAND_PAYMENT_TERM_INACTIVE,
	MASTER_COMMAND_PAYMENT_TERM_RETIRE,
	MASTER_COMMAND_PAYMENT_TERM_UPDATE,
	MASTER_QUERY_PAYMENT_TERM_GET_BY_CODE,
	MASTER_QUERY_PAYMENT_TERM_GET_BY_ID,
	MASTER_QUERY_PAYMENT_TERM_LIST,
	type MasterCommandId,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import { resolveAsync } from "../../resolve-async";
import type { PaymentTerm } from "../../types";
import {
	MASTER_SEARCH_ENTITY,
	syncMasterRootProjection,
} from "../integration-projections/search-projector-commands";
import { assertNoLifecycleControlledFieldMutation } from "../lifecycle-governance";
import type { PaymentTermLifecycleEventSuffix } from "./core-master-events";
import { assertLifecycleTransition } from "./lifecycle";
import { normalizeMasterCode } from "./normalized-code";
import { normalizePaymentTermRule } from "./payment-term-rule";
import {
	createPaymentTermInputSchema,
	getByCodeInputSchema,
	getByIdInputSchema,
	listByStatusInputSchema,
	listUpdatedSinceInputSchema,
	masterListOptionsSchema,
	paymentTermLifecycleInputSchema,
	updatePaymentTermInputSchema,
} from "./schemas";

async function afterPaymentTermMutation(
	result: Result<PaymentTerm>,
	options: MasterCommandOptions,
): Promise<Result<PaymentTerm>> {
	if (!result.ok) {
		return result;
	}
	try {
		await syncMasterRootProjection(
			MASTER_SEARCH_ENTITY.paymentTerm,
			result.data,
			options.searchCapability,
		);
	} catch {
		// Search is derived; committed mutation events and rebuilds provide recovery.
	}
	return result;
}

export async function createPaymentTerm(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PaymentTerm>> {
	const parsed = parseMasterInput(
		createPaymentTermInputSchema,
		input,
		"Invalid payment term create input",
	);
	if (!parsed.ok) {
		return Promise.resolve(parsed);
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PAYMENT_TERM_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	const ruleResult = normalizePaymentTermRule(parsed.data);
	if (!ruleResult.ok) {
		return ruleResult;
	}
	const result = await store.createPaymentTerm(
		{
			organizationId: parsed.data.organizationId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			name: parsed.data.name,
			...ruleResult.data,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
	return afterPaymentTermMutation(result, options);
}

export async function updatePaymentTerm(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PaymentTerm>> {
	const lifecycleFields = assertNoLifecycleControlledFieldMutation(input, {
		entityType: "payment_term",
	});
	if (!lifecycleFields.ok) {
		return lifecycleFields;
	}
	// Payment-term codes are immutable; documents snapshot the applied rule outcome.
	const parsed = parseMasterInput(
		updatePaymentTermInputSchema,
		input,
		"Invalid payment term update input",
	);
	if (!parsed.ok) {
		return Promise.resolve(parsed);
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PAYMENT_TERM_UPDATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const result = await store.updatePaymentTerm(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			name: parsed.data.name,
			netDays: parsed.data.netDays,
			discountDays: parsed.data.discountDays,
			discountPercent: parsed.data.discountPercent,
			dueDayRule: parsed.data.dueDayRule,
			endOfMonth: parsed.data.endOfMonth,
			installmentPolicy: parsed.data.installmentPolicy,
			installmentCount: parsed.data.installmentCount,
			validFrom: parsed.data.validFrom,
			validTo: parsed.data.validTo,
			currencyRestrictionId: parsed.data.currencyRestrictionId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
	return afterPaymentTermMutation(result, options);
}

async function transitionPaymentTermStatus(
	input: unknown,
	toStatus: "active" | "inactive" | "retired",
	eventSuffix: PaymentTermLifecycleEventSuffix,
	command: MasterCommandId,
	options: MasterCommandOptions,
): Promise<Result<PaymentTerm>> {
	const parsed = parseMasterInput(
		paymentTermLifecycleInputSchema,
		input,
		"Invalid payment term lifecycle input",
	);
	if (!parsed.ok) {
		return Promise.resolve(parsed);
	}
	const { store, ports, dependencyInspector, authorization } =
		resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const current = await store.getPaymentTermById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Payment term not found",
		});
	}
	const lifecycle = assertLifecycleTransition(current.data.status, toStatus);
	if (!lifecycle.ok) {
		return lifecycle;
	}
	if (toStatus === "retired") {
		const blockers = await dependencyInspector.listBlockers({
			organizationId: parsed.data.organizationId,
			entityType: "payment_term",
			entityId: parsed.data.id,
		});
		if (blockers.length > 0) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Payment term has dependency blockers",
			});
		}
	}
	const result = await store.transitionPaymentTerm(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus,
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix },
	);
	return afterPaymentTermMutation(result, options);
}

export function activatePaymentTerm(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PaymentTerm>> {
	return transitionPaymentTermStatus(
		input,
		"active",
		"activated",
		MASTER_COMMAND_PAYMENT_TERM_ACTIVATE,
		options,
	);
}

export function inactivePaymentTerm(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PaymentTerm>> {
	return transitionPaymentTermStatus(
		input,
		"inactive",
		"inactive",
		MASTER_COMMAND_PAYMENT_TERM_INACTIVE,
		options,
	);
}

export function retirePaymentTerm(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PaymentTerm>> {
	return transitionPaymentTermStatus(
		input,
		"retired",
		"retired",
		MASTER_COMMAND_PAYMENT_TERM_RETIRE,
		options,
	);
}

export async function getPaymentTermById(
	input: unknown,
	options: MasterDataCapabilityOptions = {},
): Promise<Result<PaymentTerm | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid payment term get-by-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store } = resolveCommandDeps(options);
	const { authorization } = options;
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PAYMENT_TERM_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getPaymentTermById(parsed.data.organizationId, parsed.data.id);
}

export async function getPaymentTermByCode(
	input: unknown,
	options: MasterDataCapabilityOptions = {},
): Promise<Result<PaymentTerm | null>> {
	const parsed = parseMasterInput(
		getByCodeInputSchema,
		input,
		"Invalid payment term get-by-code input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store } = resolveCommandDeps(options);
	const { authorization } = options;
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PAYMENT_TERM_GET_BY_CODE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	return store.getPaymentTermByCode(
		parsed.data.organizationId,
		codeResult.data.normalizedCode,
	);
}

export async function existsPaymentTermByCode(
	input: unknown,
	options: MasterDataCapabilityOptions = {},
): Promise<Result<boolean>> {
	const result = await getPaymentTermByCode(input, options);
	if (!result.ok) {
		return result;
	}
	return errorResult.ok(result.data !== null);
}

export async function listPaymentTerms(
	input: unknown,
	options: MasterDataCapabilityOptions = {},
): Promise<Result<PaymentTerm[]>> {
	const parsed = parseMasterInput(
		masterListOptionsSchema,
		input,
		"Invalid payment term list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store } = resolveCommandDeps(options);
	const { authorization } = options;
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PAYMENT_TERM_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listPaymentTerms({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		updatedSince: parsed.data.updatedSince,
	});
}

export function listActivePaymentTerms(
	input: unknown,
	options: MasterDataCapabilityOptions = {},
): Promise<Result<PaymentTerm[]>> {
	return resolveAsync(() => {
		const parsed = parseMasterInput(
			masterListOptionsSchema,
			input,
			"Invalid active payment term list input",
		);
		if (!parsed.ok) {
			return parsed;
		}
		return listPaymentTerms({ ...parsed.data, status: "active" }, options);
	});
}

export function listPaymentTermsByStatus(
	input: unknown,
	options: MasterDataCapabilityOptions = {},
): Promise<Result<PaymentTerm[]>> {
	return resolveAsync(() => {
		const parsed = parseMasterInput(
			listByStatusInputSchema,
			input,
			"Invalid payment term list-by-status input",
		);
		if (!parsed.ok) {
			return parsed;
		}
		return listPaymentTerms(parsed.data, options);
	});
}

export function listPaymentTermsUpdatedSince(
	input: unknown,
	options: MasterDataCapabilityOptions = {},
): Promise<Result<PaymentTerm[]>> {
	return resolveAsync(() => {
		const parsed = parseMasterInput(
			listUpdatedSinceInputSchema,
			input,
			"Invalid payment term updated-since list input",
		);
		if (!parsed.ok) {
			return parsed;
		}
		return listPaymentTerms(parsed.data, options);
	});
}
