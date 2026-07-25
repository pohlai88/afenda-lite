import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { HumanResourcesQueryId } from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import type { HumanResourcesFieldProjection } from "../shared/authorization-types";
import { authorizeHumanResourcesOperation } from "../shared/contextual-authorization";
import { requireEmployeeRelationsIdentityResolver } from "../shared/employee-relations-command";
import { resolveManifestOperationPermission } from "../shared/manifest-permission";
import type { HumanResourcesAuthorizedActorInput } from "../shared/run-authorized-operation";
import { runDomainAuthorizedOperation } from "../shared/run-authorized-operation";
import type { HumanResourcesStore } from "../store";
import { employeeCaseToResourceContext } from "./case-authorization-policy";
import { projectEmployeeCaseFromDecision } from "./case-field-projection";
import type {
	EmployeeCase,
	EmployeeCaseListPage,
	ProjectedEmployeeCase,
} from "./types";

type CaseScopedInput = HumanResourcesAuthorizedActorInput & {
	caseId: EmployeeCase["id"];
};

/**
 * Load case (NOT_FOUND if missing) → facade authorize with resource facts → execute.
 * Shared by get / timeline / outcome so ACL and deny codes stay one path.
 */
export async function runAuthorizedEmployeeCaseReadQuery<
	TSchema extends z.ZodType<CaseScopedInput>,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		query: HumanResourcesQueryId;
		execute: (ctx: {
			data: z.infer<TSchema>;
			employeeCase: EmployeeCase;
			store: HumanResourcesStore;
		}) => Promise<Result<TOut>>;
		project?: (
			value: TOut,
			projection: HumanResourcesFieldProjection | undefined,
		) => TProjected;
	},
): Promise<Result<TProjected>> {
	const parsed = parseHumanResourcesInput(
		config.schema,
		input,
		config.invalidMessage,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store } = resolveCommandDeps(options);
	const loaded = await store.findEmployeeCaseInOrganization({
		organizationId: parsed.data.organizationId,
		caseId: parsed.data.caseId,
	});
	if (!loaded.ok) {
		return loaded;
	}
	if (loaded.data === null) {
		return fail(
			"NOT_FOUND",
			"Employee case not found",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}

	const employeeCase = loaded.data;
	return runDomainAuthorizedOperation({
		operationId: config.query,
		operationKind: "query",
		data: parsed.data,
		options,
		resolveResource: async () => employeeCaseToResourceContext(employeeCase),
		execute: () =>
			config.execute({
				data: parsed.data,
				employeeCase,
				store,
			}),
		project: config.project,
	});
}

/** Facade-mediated list: per-row ER policy + field projection, same path as get. */
export async function runAuthorizedEmployeeCaseListQuery(
	data: {
		organizationId: string;
		actorUserId: string;
		correlationId?: string;
		page?: number;
		pageSize?: number;
		queryId: HumanResourcesQueryId;
	},
	options: HumanResourcesCommandOptions,
	loadCandidates: () => Promise<Result<EmployeeCase[]>>,
): Promise<Result<EmployeeCaseListPage>> {
	const identityResolver = await requireEmployeeRelationsIdentityResolver(
		options.identityResolver,
	);
	if (!identityResolver.ok) {
		return identityResolver;
	}

	const requiredPermission = resolveManifestOperationPermission(
		data.queryId,
		"query",
	);
	if (requiredPermission === undefined) {
		return fail("FORBIDDEN", "Human Resources authorization denied", {
			...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED),
			operationId: data.queryId,
			denyCode: "permission_denied",
			policyId: "hr.manifest-permission",
		});
	}

	const actorIdentity = await identityResolver.data.resolveEmployeeForActor({
		organizationId: data.organizationId,
		actorUserId: data.actorUserId,
	});
	if (!actorIdentity.ok) {
		return actorIdentity;
	}
	if (!actorIdentity.data) {
		return fail(
			"FORBIDDEN",
			"Actor is not an employee",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}

	const candidates = await loadCandidates();
	if (!candidates.ok) {
		return candidates;
	}

	const sorted = [...candidates.data]
		.filter(
			(employeeCase) => employeeCase.organizationId === data.organizationId,
		)
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	const authorizedProjected: ProjectedEmployeeCase[] = [];

	for (const employeeCase of sorted) {
		const authResult = await authorizeHumanResourcesOperation(
			{
				operationId: data.queryId,
				operationKind: "query",
				requiredPermission,
				actor: {
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId ?? "",
					actorEmployeeId: actorIdentity.data.employeeId,
				},
				resource: employeeCaseToResourceContext(employeeCase),
			},
			options,
		);
		if (!authResult.ok || !authResult.data.allowed) {
			continue;
		}

		authorizedProjected.push(
			projectEmployeeCaseFromDecision(employeeCase, authResult.data.projection),
		);
	}

	const page = data.page ?? 1;
	const pageSize = data.pageSize ?? 20;
	const offset = (page - 1) * pageSize;

	return ok({
		cases: authorizedProjected.slice(offset, offset + pageSize),
		totalCount: authorizedProjected.length,
		page,
		pageSize,
	});
}
