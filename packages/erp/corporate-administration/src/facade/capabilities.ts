import type { Result } from "@afenda/errors";
import type { z } from "zod";
import {
	activateEstablishmentOperation,
	closeEstablishmentOperation,
	type EstablishmentsOperationDeps,
	getEstablishmentOperation,
	listEstablishmentsOperation,
	registerEstablishmentOperation,
	suspendEstablishmentOperation,
	updateEstablishmentOperation,
} from "../features/entity-administration/establishments/establishments.operations";
import type {
	ActivateEstablishmentInput,
	CloseEstablishmentInput,
	GetEstablishmentInput,
	ListEstablishmentInput,
	RegisterEstablishmentInput,
	SuspendEstablishmentInput,
	UpdateEstablishmentInput,
} from "../features/entity-administration/establishments/establishments.schema";
import type { Establishment } from "../kernel/contracts/domain";
import type { CorporateAdministrationPage } from "../kernel/pagination";
import {
	type CorporateAdministrationCommandOptions,
	resolveOpts,
} from "./contracts";

type Resolved = Extract<ReturnType<typeof resolveOpts>, { ok: true }>["data"];

function establishmentsDeps(resolved: Resolved): EstablishmentsOperationDeps {
	return {
		authorization: resolved.authorization,
		mutationReceipts: resolved.mutationReceipts,
		store: resolved.store,
		...(resolved.approval === undefined ? {} : { approval: resolved.approval }),
	};
}

export function registerEstablishment(
	input: z.infer<typeof RegisterEstablishmentInput>,
	options?: CorporateAdministrationCommandOptions,
): Promise<Result<Establishment>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return registerEstablishmentOperation(input, establishmentsDeps(opts.data));
}

export function updateEstablishment(
	input: z.infer<typeof UpdateEstablishmentInput>,
	options?: CorporateAdministrationCommandOptions,
): Promise<Result<Establishment>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return updateEstablishmentOperation(input, establishmentsDeps(opts.data));
}

export function activateEstablishment(
	input: z.infer<typeof ActivateEstablishmentInput>,
	options?: CorporateAdministrationCommandOptions,
): Promise<Result<Establishment>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return activateEstablishmentOperation(input, establishmentsDeps(opts.data));
}

export function suspendEstablishment(
	input: z.infer<typeof SuspendEstablishmentInput>,
	options?: CorporateAdministrationCommandOptions,
): Promise<Result<Establishment>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return suspendEstablishmentOperation(input, establishmentsDeps(opts.data));
}

export function closeEstablishment(
	input: z.infer<typeof CloseEstablishmentInput>,
	options?: CorporateAdministrationCommandOptions,
): Promise<Result<Establishment>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return closeEstablishmentOperation(input, establishmentsDeps(opts.data));
}

export function getEstablishment(
	input: z.infer<typeof GetEstablishmentInput>,
	options?: CorporateAdministrationCommandOptions,
): Promise<Result<Establishment | null>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return getEstablishmentOperation(input, establishmentsDeps(opts.data));
}

export function listEstablishments(
	input: z.infer<typeof ListEstablishmentInput>,
	options?: CorporateAdministrationCommandOptions,
): Promise<Result<CorporateAdministrationPage<Establishment>>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return listEstablishmentsOperation(input, establishmentsDeps(opts.data));
}
