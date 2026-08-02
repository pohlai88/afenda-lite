import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import type { HumanResourcesFieldProjection } from "../../kernel/authorization/authorization-types";
import { authorizeHumanResourcesOperation } from "../../kernel/authorization/contextual-authorization";
import { resolveManifestOperationPermission } from "../../kernel/authorization/manifest-permission";
import type { HumanResourcesAuthorizedActorInput } from "../../kernel/authorization/run-authorized-operation";
import { runDomainAuthorizedOperation } from "../../kernel/authorization/run-authorized-operation";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import { parseHumanResourcesInput } from "../../kernel/validation/parse-input";
import { employeeCaseToResourceContext } from "./case-authorization-policy";
import { projectEmployeeCaseFromDecision } from "./case-field-projection";
import type { HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERY_IDS } from "./operation-registry";
import { requireEmployeeRelationsIdentityResolver } from "./run-operation";
import type {
	HumanResourcesEmployeeRelationsCapabilityStore,
	HumanResourcesEmployeeRelationsStoreMethod,
} from "./store";
import type {
	EmployeeCase,
	EmployeeCaseListPage,
	ProjectedEmployeeCase,
} from "./types";

type CaseScopedInput = HumanResourcesAuthorizedActorInput & {
	caseId: EmployeeCase["id"];
};
type AuthorizedCaseReadStore<
	TMethods extends readonly HumanResourcesEmployeeRelationsStoreMethod[],
> = Pick<
	HumanResourcesEmployeeRelationsCapabilityStore,
	"findEmployeeCaseInOrganization" | TMethods[number]
>;

/**
 * Load case (NOT_FOUND if missing) → facade authorize with resource facts → execute.
 * Shared by get / timeline / outcome so ACL and deny codes stay one path.
 */
export async function runAuthorizedEmployeeCaseReadQuery<
	const TMethods extends readonly HumanResourcesEmployeeRelationsStoreMethod[],
	TSchema extends z.ZodType<CaseScopedInput>,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		query: (typeof HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERY_IDS)[number];
		storeMethods: TMethods;
		execute: (ctx: {
			data: z.infer<TSchema>;
			employeeCase: EmployeeCase;
			store: AuthorizedCaseReadStore<TMethods>;
		}) => Promise<Result<TOut>>;
		project?:
			| ((
					value: TOut,
					projection: HumanResourcesFieldProjection | undefined,
			  ) => TProjected)
			| undefined;
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
	const projectedStore: AuthorizedCaseReadStore<TMethods> = store;
	const loaded = await projectedStore.findEmployeeCaseInOrganization({
		organizationId: parsed.data.organizationId,
		caseId: parsed.data.caseId,
	});
	if (!loaded.ok) {
		return loaded;
	}
	if (loaded.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
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
				store: projectedStore,
			}),
		...(config.project === undefined ? {} : { project: config.project }),
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
		queryId: (typeof HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERY_IDS)[number];
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
		return errorResult.fail("FORBIDDEN", {
			internalContext: {
				...humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
				),
				operationId: data.queryId,
				denyCode: "permission_denied",
				policyId: "hr.manifest-permission",
			},
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
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
	}
	const actorEmployeeId = actorIdentity.data.employeeId;
	const permission = requiredPermission;

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
	async function collectAuthorizedAtIndex(index: number): Promise<void> {
		const employeeCase = sorted[index];
		if (employeeCase === undefined) {
			return;
		}
		const authResult = await authorizeHumanResourcesOperation(
			{
				operationId: data.queryId,
				operationKind: "query",
				requiredPermission: permission,
				actor: {
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId ?? "",
					actorEmployeeId,
				},
				resource: employeeCaseToResourceContext(employeeCase),
			},
			options,
		);
		if (authResult.ok && authResult.data.allowed) {
			authorizedProjected.push(
				projectEmployeeCaseFromDecision(
					employeeCase,
					authResult.data.projection,
				),
			);
		}
		return collectAuthorizedAtIndex(index + 1);
	}
	await collectAuthorizedAtIndex(0);

	const page = data.page ?? 1;
	const pageSize = data.pageSize ?? 20;
	const offset = (page - 1) * pageSize;

	return errorResult.ok({
		cases: authorizedProjected.slice(offset, offset + pageSize),
		totalCount: authorizedProjected.length,
		page,
		pageSize,
	});
}
