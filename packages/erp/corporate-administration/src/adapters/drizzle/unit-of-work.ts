import { fail } from "@afenda/errors/result";
import type { CorporateAdministrationMutationMeta } from "../../store/company-store";
import type { CorporateAdministrationCompanyStore } from "../../store/company-store";
import {
	appendCompanyRegistryFacts,
	type CompanyRegistryFactsInput,
} from "../../shared/company-mutation-facts";
import {
	CORPORATE_ADMINISTRATION_STORE_ERROR_CODES,
	CorporateAdministrationStoreError,
	isCorporateAdministrationStoreError,
	mapCorporateAdministrationStoreError,
} from "../../store/store-errors";
import type {
	CorporateAdministrationAuditFact,
	CorporateAdministrationAuditPort,
	CorporateAdministrationOutboxEvent,
	CorporateAdministrationOutboxPort,
	CorporateAdministrationUnitOfWork,
	CorporateAdministrationUnitOfWorkContext,
} from "../../unit-of-work";
import { CorporateAdministrationUnitOfWorkError } from "../../unit-of-work";

const DRIZZLE_COMPANY_UOW = Symbol("drizzleCompanyUow");

type DrizzleCompanyUnitOfWorkState = {
	readonly auditFacts: CorporateAdministrationAuditFact[];
	readonly outboxEvents: CorporateAdministrationOutboxEvent[];
	readonly failAudit?: boolean;
	readonly failOutbox?: boolean;
};

export type DrizzleCompanyUnitOfWorkContext =
	CorporateAdministrationUnitOfWorkContext & {
		readonly [DRIZZLE_COMPANY_UOW]: DrizzleCompanyUnitOfWorkState;
	};

export type DrizzleCompanyUnitOfWorkOptions = {
	readonly failAudit?: boolean;
	readonly failOutbox?: boolean;
	readonly auditRecords?: CorporateAdministrationAuditFact[];
	readonly outboxRecords?: CorporateAdministrationOutboxEvent[];
};

function getDrizzleCompanyUnitOfWorkState(
	context: CorporateAdministrationUnitOfWorkContext,
): DrizzleCompanyUnitOfWorkState {
	const state = (context as DrizzleCompanyUnitOfWorkContext)[
		DRIZZLE_COMPANY_UOW
	];
	if (!state) {
		throw new CorporateAdministrationUnitOfWorkError(
			"Company registry mutations require a Drizzle unit of work context",
		);
	}
	return state;
}

export async function bufferCompanyRegistryFacts(
	context: CorporateAdministrationUnitOfWorkContext,
	meta: CorporateAdministrationMutationMeta,
	input: CompanyRegistryFactsInput,
): Promise<{
	readonly audit: CorporateAdministrationAuditFact;
	readonly outbox: CorporateAdministrationOutboxEvent;
}> {
	await appendCompanyRegistryFacts(context, meta, input);
	return readLatestCompanyRegistryFacts(context);
}

export function readLatestCompanyRegistryFacts(
	context: CorporateAdministrationUnitOfWorkContext,
): {
	readonly audit: CorporateAdministrationAuditFact;
	readonly outbox: CorporateAdministrationOutboxEvent;
} {
	const state = getDrizzleCompanyUnitOfWorkState(context);
	const audit = state.auditFacts.at(-1);
	const outbox = state.outboxEvents.at(-1);
	if (!audit || !outbox) {
		throw new CorporateAdministrationUnitOfWorkError(
			"Company registry mutation is missing buffered audit/outbox facts",
		);
	}
	return { audit, outbox };
}

export function createDrizzleCorporateAdministrationUnitOfWork(
	store: CorporateAdministrationCompanyStore,
	options: DrizzleCompanyUnitOfWorkOptions = {},
): CorporateAdministrationUnitOfWork {
	return {
		async run<TResult>(
			operation: (
				context: CorporateAdministrationUnitOfWorkContext,
			) => Promise<TResult>,
		): Promise<TResult> {
			const state: DrizzleCompanyUnitOfWorkState = {
				auditFacts: [],
				outboxEvents: [],
				failAudit: options.failAudit,
				failOutbox: options.failOutbox,
			};

			const audit: CorporateAdministrationAuditPort = {
				async append(fact) {
					if (state.failAudit) {
						throw new CorporateAdministrationUnitOfWorkError(
							"Injected audit failure",
						);
					}
					state.auditFacts.push(fact);
				},
			};

			const outbox: CorporateAdministrationOutboxPort = {
				async append(event) {
					if (state.failOutbox) {
						throw new CorporateAdministrationUnitOfWorkError(
							"Injected outbox failure",
						);
					}
					state.outboxEvents.push(event);
				},
			};

			const context = {
				store,
				audit,
				outbox,
				[DRIZZLE_COMPANY_UOW]: state,
			} satisfies DrizzleCompanyUnitOfWorkContext;

			try {
				const result = await operation(context);
				options.auditRecords?.push(...state.auditFacts);
				options.outboxRecords?.push(...state.outboxEvents);
				return result;
			} catch (error) {
				if (isCorporateAdministrationStoreError(error)) {
					return mapCorporateAdministrationStoreError(error) as TResult;
				}
				if (error instanceof CorporateAdministrationUnitOfWorkError) {
					return fail("INTERNAL_ERROR", error.message) as TResult;
				}
				return mapCorporateAdministrationStoreError(
					new CorporateAdministrationStoreError({
						code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.transactionFailed,
						message: "Company registry transaction failed",
						cause: error,
					}),
				) as TResult;
			}
		},
	};
}
