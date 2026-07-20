import { fail, type Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "./authorization";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import type { MasterFailureDetails } from "./contracts/reasons";
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
} from "./module-ids";
import { parseMasterInput } from "./parse-input";
import {
	createPaymentTermInputSchema,
	getByCodeInputSchema,
	getByIdInputSchema,
	masterListOptionsSchema,
	paymentTermLifecycleInputSchema,
	updatePaymentTermInputSchema,
} from "./schemas";
import {
	MASTER_SEARCH_ENTITY,
	syncMasterRootProjection,
} from "./search-projectors";
import { normalizeMasterCode } from "./shared/code";
import { assertLifecycleTransition } from "./shared/lifecycle";
import type { PaymentTerm } from "./types";

async function afterPaymentTermMutation(
	result: Result<PaymentTerm>,
	options: MasterCommandOptions,
): Promise<Result<PaymentTerm>> {
	if (result.ok) {
		await syncMasterRootProjection(
			MASTER_SEARCH_ENTITY.paymentTerm,
			result.data,
			options.searchStore,
		);
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
		return parsed;
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
	const result = await store.createPaymentTerm(
		{
			organizationId: parsed.data.organizationId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			name: parsed.data.name,
			netDays: parsed.data.netDays,
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
	const parsed = parseMasterInput(
		updatePaymentTermInputSchema,
		input,
		"Invalid payment term update input",
	);
	if (!parsed.ok) {
		return parsed;
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
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
	return afterPaymentTermMutation(result, options);
}

async function transitionPaymentTermStatus(
	input: unknown,
	toStatus: PaymentTerm["status"],
	eventSuffix: string,
	command: MasterCommandId,
	options: MasterCommandOptions,
): Promise<Result<PaymentTerm>> {
	const parsed = parseMasterInput(
		paymentTermLifecycleInputSchema,
		input,
		"Invalid payment term lifecycle input",
	);
	if (!parsed.ok) {
		return parsed;
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
		return fail("NOT_FOUND", "Payment term not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
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
			return fail("CONFLICT", "Payment term has dependency blockers", {
				reason: "MASTER_DEPENDENCY_BLOCKED",
				blockers,
			} satisfies MasterFailureDetails);
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

export async function activatePaymentTerm(
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

export async function inactivePaymentTerm(
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

export async function retirePaymentTerm(
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
	options: MasterCommandOptions = {},
): Promise<Result<PaymentTerm | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid payment term get-by-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
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
	options: MasterCommandOptions = {},
): Promise<Result<PaymentTerm | null>> {
	const parsed = parseMasterInput(
		getByCodeInputSchema,
		input,
		"Invalid payment term get-by-code input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
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

export async function listPaymentTerms(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PaymentTerm[]>> {
	const parsed = parseMasterInput(
		masterListOptionsSchema,
		input,
		"Invalid payment term list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
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
	});
}
