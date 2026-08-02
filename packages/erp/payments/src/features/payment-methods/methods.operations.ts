import { errorResult, type Result } from "@afenda/errors";

import type {
	InstrumentRequirement,
	PaymentAccountKind,
	PaymentInstrumentKind,
	PaymentMethod,
	PaymentMethodKind,
} from "../../kernel/contracts/domain";
import {
	type PaymentsAuthorizationPort,
	requirePaymentsPermission,
} from "../../kernel/execution/authorization";
import type { PaymentsPermission } from "../../kernel/execution/permissions";
import {
	normalizedCode,
	parsePaymentsInput,
} from "../../kernel/validation/parse-input";
import {
	createPaymentMethodInputSchema,
	deactivatePaymentMethodInputSchema,
	listPaymentMethodsInputSchema,
	seedDefaultPaymentMethodsInputSchema,
	updatePaymentMethodInputSchema,
} from "./methods.schema";
import type { PaymentMethodsStore } from "./methods.store";

export interface PaymentMethodsOperationDeps {
	authorization?: PaymentsAuthorizationPort | undefined;
	store: PaymentMethodsStore;
}

function permit(
	deps: PaymentMethodsOperationDeps,
	input: { organizationId: string; actorUserId: string },
	permission: PaymentsPermission,
): Promise<Result<void>> {
	return requirePaymentsPermission(deps.authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export async function createPaymentMethodOperation(
	input: unknown,
	deps: PaymentMethodsOperationDeps,
): Promise<Result<PaymentMethod>> {
	const parsed = parsePaymentsInput(createPaymentMethodInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.method.manage");
	if (!allowed.ok) {
		return allowed;
	}
	const { data } = parsed;
	return deps.store.createPaymentMethod({
		organizationId: data.organizationId,
		code: data.code,
		normalizedCode: normalizedCode(data.code),
		name: data.name,
		kind: data.kind,
		instrumentRequirement: data.instrumentRequirement,
		allowedInstrumentKinds: data.allowedInstrumentKinds,
		allowedAccountKinds: data.allowedAccountKinds,
		active: data.active ?? true,
		createdBy: data.actorUserId,
		updatedBy: data.actorUserId,
	});
}

export async function updatePaymentMethodOperation(
	input: unknown,
	deps: PaymentMethodsOperationDeps,
): Promise<Result<PaymentMethod>> {
	const parsed = parsePaymentsInput(updatePaymentMethodInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.method.manage");
	if (!allowed.ok) {
		return allowed;
	}
	const { data } = parsed;
	return deps.store.updatePaymentMethod({
		organizationId: data.organizationId,
		id: data.id,
		...(data.name !== undefined ? { name: data.name } : {}),
		...(data.instrumentRequirement !== undefined
			? { instrumentRequirement: data.instrumentRequirement }
			: {}),
		...(data.allowedInstrumentKinds !== undefined
			? { allowedInstrumentKinds: data.allowedInstrumentKinds }
			: {}),
		...(data.allowedAccountKinds !== undefined
			? { allowedAccountKinds: data.allowedAccountKinds }
			: {}),
		updatedBy: data.actorUserId,
	});
}

export async function deactivatePaymentMethodOperation(
	input: unknown,
	deps: PaymentMethodsOperationDeps,
): Promise<Result<PaymentMethod>> {
	const parsed = parsePaymentsInput(deactivatePaymentMethodInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.method.manage");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.updatePaymentMethod({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
		active: false,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function listPaymentMethodsOperation(
	input: unknown,
	deps: PaymentMethodsOperationDeps,
): Promise<Result<PaymentMethod[]>> {
	const parsed = parsePaymentsInput(listPaymentMethodsInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.method.read");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.listPaymentMethods(parsed.data.organizationId);
}

interface DefaultPaymentMethodSeed {
	allowedAccountKinds: readonly PaymentAccountKind[];
	allowedInstrumentKinds: readonly PaymentInstrumentKind[];
	code: string;
	instrumentRequirement: InstrumentRequirement;
	kind: PaymentMethodKind;
	name: string;
}

/** Deterministic per-organization defaults (code → kind). */
const DEFAULT_PAYMENT_METHODS: readonly DefaultPaymentMethodSeed[] = [
	{
		code: "cash",
		name: "Cash",
		kind: "cash",
		instrumentRequirement: "forbidden",
		allowedInstrumentKinds: [],
		allowedAccountKinds: ["cash"],
	},
	{
		code: "bank-transfer",
		name: "Bank transfer",
		kind: "wire",
		instrumentRequirement: "optional",
		allowedInstrumentKinds: ["bank-transfer"],
		allowedAccountKinds: ["bank"],
	},
	{
		code: "check",
		name: "Check",
		kind: "check",
		instrumentRequirement: "required",
		allowedInstrumentKinds: ["check"],
		allowedAccountKinds: ["bank"],
	},
	{
		code: "other",
		name: "Other",
		kind: "other",
		instrumentRequirement: "optional",
		allowedInstrumentKinds: ["other"],
		allowedAccountKinds: ["bank", "cash", "gateway", "clearing"],
	},
];

/** Idempotent: creates only defaults whose code is absent; returns the created ones. */
export async function seedDefaultPaymentMethods(
	input: unknown,
	deps: PaymentMethodsOperationDeps,
): Promise<Result<PaymentMethod[]>> {
	const parsed = parsePaymentsInput(seedDefaultPaymentMethodsInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.method.manage");
	if (!allowed.ok) {
		return allowed;
	}
	const existing = await deps.store.listPaymentMethods(
		parsed.data.organizationId,
	);
	if (!existing.ok) {
		return existing;
	}
	const existingCodes = new Set(
		existing.data.map((method) => method.normalizedCode),
	);
	const created: PaymentMethod[] = [];
	for (const seed of DEFAULT_PAYMENT_METHODS) {
		if (existingCodes.has(normalizedCode(seed.code))) {
			continue;
		}
		const result = await deps.store.createPaymentMethod({
			organizationId: parsed.data.organizationId,
			code: seed.code,
			normalizedCode: normalizedCode(seed.code),
			name: seed.name,
			kind: seed.kind,
			instrumentRequirement: seed.instrumentRequirement,
			allowedInstrumentKinds: seed.allowedInstrumentKinds,
			allowedAccountKinds: seed.allowedAccountKinds,
			active: true,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		});
		if (!result.ok) {
			return result;
		}
		created.push(result.data);
	}
	return errorResult.ok(created);
}
