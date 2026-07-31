import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import {
	type HumanResourcesEmployeeId,
	humanResourcesBenefitEnrollmentDependentIdSchema,
	humanResourcesBenefitEnrollmentIdSchema,
	humanResourcesCompensationReviewIdSchema,
	humanResourcesEmployeeCompensationIdSchema,
	humanResourcesEmployeeIdSchema,
} from "../brands";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../module-ids";
import type { HumanResourcesPermission } from "../permissions";
import { HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ } from "../permissions";
import type { CurrencyLookupPort, MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";
import type { HumanResourcesResourceContext } from "./authorization-types";
import { assertHumanResourcesSupplementalAuthorization } from "./contextual-authorization";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "./domain-runner";
import { applySensitivityProjection } from "./field-projection";
import type { HumanResourcesAuthorizedActorInput } from "./run-authorized-operation";

type ActorScoped = HumanResourcesAuthorizedActorInput;

interface CommandDeps {
	currency: CurrencyLookupPort;
	ports: MutationPorts;
	store: HumanResourcesStore;
}

interface QueryDeps {
	store: HumanResourcesStore;
}

const COMPENSATION_RESOURCE_ID_FIELDS = [
	"compensationId",
	"reviewId",
	"cycleId",
	"proposalId",
	"enrollmentId",
	"dependentId",
	"gradeId",
	"progressionRuleId",
	"salaryBandId",
	"planId",
	"employeeId",
	"applicationId",
] as const;

interface CompensationSubjectResolution {
	organizationId: string;
	subjectEmployeeId?: HumanResourcesEmployeeId | undefined;
}

function readStringField(input: object, field: string): string | undefined {
	const descriptor = Object.getOwnPropertyDescriptor(input, field);
	return typeof descriptor?.value === "string" ? descriptor.value : undefined;
}

function parseIdField<TSchema extends z.ZodType>(
	input: object,
	field: string,
	schema: TSchema,
): z.output<TSchema> | undefined {
	const value = readStringField(input, field);
	if (value === undefined) {
		return;
	}
	const parsed = schema.safeParse(value);
	return parsed.success ? parsed.data : undefined;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The domain workflow keeps ordered invariant validation and Result mapping explicit.
async function resolveCompensationSubject(
	input: ActorScoped,
	store: HumanResourcesStore,
): Promise<Result<CompensationSubjectResolution>> {
	const compensationId = parseIdField(
		input,
		"compensationId",
		humanResourcesEmployeeCompensationIdSchema,
	);
	if (compensationId !== undefined) {
		const compensation = await store.getEmployeeCompensation({
			organizationId: input.organizationId,
			compensationId,
		});
		if (!compensation.ok) {
			return compensation;
		}
		if (compensation.data !== null) {
			return errorResult.ok({
				organizationId: compensation.data.organizationId,
				subjectEmployeeId: compensation.data.employeeId,
			});
		}
	}

	const reviewId = parseIdField(
		input,
		"reviewId",
		humanResourcesCompensationReviewIdSchema,
	);
	if (reviewId !== undefined) {
		const review = await store.getCompensationReview({
			organizationId: input.organizationId,
			reviewId,
		});
		if (!review.ok) {
			return review;
		}
		if (review.data !== null) {
			return errorResult.ok({
				organizationId: review.data.organizationId,
				subjectEmployeeId: review.data.employeeId,
			});
		}
	}

	const enrollmentId = parseIdField(
		input,
		"enrollmentId",
		humanResourcesBenefitEnrollmentIdSchema,
	);
	if (enrollmentId !== undefined) {
		const enrollment = await store.getBenefitEnrollment({
			organizationId: input.organizationId,
			enrollmentId,
		});
		if (!enrollment.ok) {
			return enrollment;
		}
		if (enrollment.data !== null) {
			return errorResult.ok({
				organizationId: enrollment.data.organizationId,
				subjectEmployeeId: enrollment.data.employeeId,
			});
		}
	}

	const dependentId = parseIdField(
		input,
		"dependentId",
		humanResourcesBenefitEnrollmentDependentIdSchema,
	);
	if (dependentId !== undefined) {
		const dependent = await store.getBenefitEnrollmentDependent({
			organizationId: input.organizationId,
			dependentId,
		});
		if (!dependent.ok) {
			return dependent;
		}
		if (dependent.data !== null) {
			const enrollment = await store.getBenefitEnrollment({
				organizationId: input.organizationId,
				enrollmentId: dependent.data.enrollmentId,
			});
			if (!enrollment.ok) {
				return enrollment;
			}
			if (enrollment.data !== null) {
				return errorResult.ok({
					organizationId: enrollment.data.organizationId,
					subjectEmployeeId: enrollment.data.employeeId,
				});
			}
		}
	}

	const subjectEmployeeId = parseIdField(
		input,
		"employeeId",
		humanResourcesEmployeeIdSchema,
	);
	return errorResult.ok({
		organizationId: input.organizationId,
		...(subjectEmployeeId === undefined ? {} : { subjectEmployeeId }),
	});
}

async function resolveManagerEmployeeId(input: {
	data: ActorScoped;
	options: HumanResourcesCommandOptions;
	store: HumanResourcesStore;
	subjectEmployeeId: HumanResourcesEmployeeId;
}): Promise<Result<HumanResourcesEmployeeId | undefined>> {
	const asOf = new Date().toISOString().slice(0, 10);
	const { identityResolver } = input.options;
	if (identityResolver !== undefined) {
		const reports = await identityResolver.resolveManagerEmployeesForActor({
			organizationId: input.data.organizationId,
			actorUserId: input.data.actorUserId,
			asOf,
		});
		if (!reports.ok) {
			return reports;
		}
		if (reports.data.includes(input.subjectEmployeeId)) {
			const identity = await identityResolver.resolveEmployeeForActor({
				organizationId: input.data.organizationId,
				actorUserId: input.data.actorUserId,
				asOf,
			});
			if (!identity.ok) {
				return identity;
			}
			if (identity.data !== null) {
				return errorResult.ok(identity.data.employeeId);
			}
		}
	}

	const primaryManager = await input.store.getPrimaryManagerForEmployee({
		organizationId: input.data.organizationId,
		employeeId: input.subjectEmployeeId,
		asOf,
	});
	if (!primaryManager.ok) {
		return primaryManager;
	}
	return errorResult.ok(primaryManager.data ?? undefined);
}

async function resolveCompensationResource(
	data: ActorScoped,
	options: HumanResourcesCommandOptions,
	store: HumanResourcesStore,
): Promise<Result<HumanResourcesResourceContext>> {
	const subject = await resolveCompensationSubject(data, store);
	if (!subject.ok) {
		return subject;
	}
	const resourceId = COMPENSATION_RESOURCE_ID_FIELDS.map((field) =>
		readStringField(data, field),
	).find((value) => value !== undefined);
	let managerEmployeeId: HumanResourcesEmployeeId | undefined;
	if (subject.data.subjectEmployeeId !== undefined) {
		const manager = await resolveManagerEmployeeId({
			data,
			options,
			store,
			subjectEmployeeId: subject.data.subjectEmployeeId,
		});
		if (!manager.ok) {
			return manager;
		}
		managerEmployeeId = manager.data;
	}
	return errorResult.ok({
		organizationId: subject.data.organizationId,
		kind: "compensation",
		...(resourceId === undefined ? {} : { resourceId }),
		...(subject.data.subjectEmployeeId === undefined
			? {}
			: { subjectEmployeeId: subject.data.subjectEmployeeId }),
		...(managerEmployeeId === undefined ? {} : { managerEmployeeId }),
	});
}

/** Apply highly_restricted compensation projection when resource-aware port is wired. */
export async function projectCompensationRecord<
	T extends Record<string, unknown>,
>(
	record: T,
	input: {
		organizationId: string;
		actorUserId: string;
		resourceId?: string | undefined;
		operationId: HumanResourcesCommandId | HumanResourcesQueryId;
		operationKind: "command" | "query";
		options: HumanResourcesCommandOptions;
		actorPermissions: Set<HumanResourcesPermission>;
	},
): Promise<Result<Partial<T>>> {
	const { resourceAwareAuthorization } = resolveCommandDeps(input.options);
	if (!resourceAwareAuthorization) {
		const projected = applySensitivityProjection(
			record,
			"highly_restricted",
			input.actorPermissions,
		);
		return { ok: true, data: projected.data };
	}

	const resource: HumanResourcesResourceContext = {
		organizationId: input.organizationId,
		kind: "compensation",
		...(input.resourceId === undefined ? {} : { resourceId: input.resourceId }),
	};

	const decision = await assertHumanResourcesSupplementalAuthorization(
		{
			operationId: input.operationId,
			operationKind: input.operationKind,
			requiredPermission: HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			actor: {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: "",
			},
			resource,
		},
		input.options,
	);
	if (!decision.ok) {
		return decision;
	}

	const projected = applySensitivityProjection(
		record,
		"highly_restricted",
		input.actorPermissions,
	);
	return { ok: true, data: projected.data };
}

export async function assertCurrencyExists(
	currency: CurrencyLookupPort,
	currencyCode: string,
): Promise<Result<void>> {
	const exists = await currency.exists(currencyCode);
	if (!exists.ok) {
		return exists;
	}
	if (!exists.data) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return { ok: true, data: undefined };
}

export async function runCompensationCommand<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		command: HumanResourcesCommandId;
		execute: (
			data: z.infer<TSchema>,
			deps: CommandDeps,
		) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		resolveResource: (data, opts, { store }) =>
			resolveCompensationResource(data, opts, store),
		resolveDeps: (opts) => {
			const { store, ports, currency } = resolveCommandDeps(opts);
			return errorResult.ok({ store, ports, currency });
		},
		execute: config.execute,
	});
}

export async function runCompensationQuery<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		query: HumanResourcesQueryId;
		resolveRequestedFields?: (
			data: z.infer<TSchema>,
		) => readonly string[] | undefined;
		project?: (
			value: TOut,
			projection:
				| import("./authorization-types").HumanResourcesFieldProjection
				| undefined,
		) => TProjected;
		execute: (data: z.infer<TSchema>, deps: QueryDeps) => Promise<Result<TOut>>;
	},
): Promise<Result<TProjected>> {
	return await runParsedAuthorizedQuery(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		resolveResource: (data, opts, { store }) =>
			resolveCompensationResource(data, opts, store),
		resolveRequestedFields: config.resolveRequestedFields,
		project: config.project,
		resolveDeps: (opts) => {
			const { store } = resolveCommandDeps(opts);
			return errorResult.ok({ store });
		},
		execute: config.execute,
	});
}
