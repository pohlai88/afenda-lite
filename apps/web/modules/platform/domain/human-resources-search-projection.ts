import { fail, ok, type Result } from "@afenda/errors/result";
import { type EmployeeListPage, listEmployees } from "@afenda/human-resources";
import {
	deleteSearchDocument,
	listSearchDocumentIds,
	type SearchDeleteInput,
	type SearchDocument,
	type SearchHit,
	type SearchStore,
	type SearchUpsertInput,
	searchDocuments,
	upsertSearchDocuments,
} from "@afenda/search";

import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type PermissionSession,
	sessionHasPermission,
} from "@/modules/identity/domain/session-permission";

const SEARCH_PAGE_SIZE = 100;
const HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY = "human_resources_employee";
const HUMAN_RESOURCES_EMPLOYEE_SEARCH_PERMISSION =
	"human-resources.employee.read" as const;

export interface RebuildHumanResourcesEmployeeSearchInput {
	actorUserId: string;
	correlationId: string;
	organizationId: string;
}

export interface HumanResourcesEmployeeSearchProjectionResult {
	documents: SearchDocument[];
	organizationId: string;
	pages: number;
	projected: number;
	pruned: number;
}

export interface HumanResourcesEmployeeSearchProjectionDeps {
	deleteDocument: (
		input: SearchDeleteInput,
	) => Promise<Result<{ deleted: boolean }>>;
	list: (input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		page: number;
		pageSize: number;
	}) => Promise<Result<EmployeeListPage>>;
	listIds: (input: {
		organizationId: string;
		entity: typeof HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY;
	}) => Promise<Result<string[]>>;
	upsert: (input: SearchUpsertInput[]) => Promise<Result<SearchDocument[]>>;
}

export interface SearchHumanResourcesEmployeesInput {
	limit?: number;
	offset?: number;
	query: string;
	session: PermissionSession;
}

export interface SearchHumanResourcesEmployeesDeps {
	hasPermission: (session: PermissionSession) => Promise<boolean>;
	search: (input: {
		organizationId: string;
		query: string;
		entity: typeof HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY;
		limit?: number;
		offset?: number;
	}) => Promise<Result<SearchHit[]>>;
}

function productionDeps(): HumanResourcesEmployeeSearchProjectionDeps {
	return {
		list: (input) => listEmployees(input, createHumanResourcesCommandOptions()),
		upsert: (input) => upsertSearchDocuments(input),
		listIds: (input) => listSearchDocumentIds(input),
		deleteDocument: (input) => deleteSearchDocument(input),
	};
}

function productionSearchDeps(
	store?: SearchStore,
): SearchHumanResourcesEmployeesDeps {
	return {
		hasPermission: (session) =>
			sessionHasPermission(session, HUMAN_RESOURCES_EMPLOYEE_SEARCH_PERMISSION),
		search: (input) => searchDocuments(input, store),
	};
}

/**
 * Permission-aware, tenant-bound consumer for the derived employee index.
 * The generic search package deliberately has no identity dependency, so the
 * product composition root must authorize before querying and verify every
 * returned document's policy metadata before releasing it.
 */
export async function searchHumanResourcesEmployees(
	input: SearchHumanResourcesEmployeesInput,
	deps: SearchHumanResourcesEmployeesDeps = productionSearchDeps(),
): Promise<Result<SearchHit[]>> {
	if (!(await deps.hasPermission(input.session))) {
		return fail(
			"FORBIDDEN",
			"You do not have permission to search Human Resources employees",
		);
	}

	const searched = await deps.search({
		organizationId: input.session.orgId,
		query: input.query,
		entity: HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY,
		...(input.limit === undefined ? {} : { limit: input.limit }),
		...(input.offset === undefined ? {} : { offset: input.offset }),
	});
	if (!searched.ok) {
		return searched;
	}

	const invalidHit = searched.data.some(
		(hit) =>
			hit.organizationId !== input.session.orgId ||
			hit.entity !== HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY ||
			hit.metadata?.requiredPermission !==
				HUMAN_RESOURCES_EMPLOYEE_SEARCH_PERMISSION,
	);
	if (invalidHit) {
		return fail(
			"INTERNAL_ERROR",
			"Human Resources search returned a document outside its authorization boundary",
		);
	}

	return ok(searched.data);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Projection pagination keeps tenant validation, upsert, and prune ordering explicit.
export async function rebuildHumanResourcesEmployeeSearch(
	input: RebuildHumanResourcesEmployeeSearchInput,
	deps: HumanResourcesEmployeeSearchProjectionDeps = productionDeps(),
): Promise<Result<HumanResourcesEmployeeSearchProjectionResult>> {
	let page = 1;
	let totalCount = 0;
	let visited = 0;
	const documents: SearchDocument[] = [];
	const liveIds = new Set<string>();

	do {
		// biome-ignore lint/performance/noAwaitInLoops: Cursor pagination depends on the preceding page's count and fail-fast result.
		const listed = await deps.list({
			...input,
			page,
			pageSize: SEARCH_PAGE_SIZE,
		});
		if (!listed.ok) {
			return listed;
		}
		const { employees, totalCount: listedTotalCount } = listed.data;
		totalCount = listedTotalCount;
		if (
			employees.some(
				(employee) => employee.organizationId !== input.organizationId,
			)
		) {
			return fail(
				"INTERNAL_ERROR",
				"Human Resources search projection received a cross-tenant employee",
			);
		}

		if (employees.length > 0) {
			for (const employee of employees) {
				liveIds.add(employee.id);
			}
			const projected = await deps.upsert(
				employees.map((employee) => ({
					organizationId: input.organizationId,
					entity: HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY,
					documentId: employee.id,
					title: employee.legalName,
					description: employee.employeeNumber,
					url: null,
					metadata: {
						employeeNumber: employee.employeeNumber,
						requiredPermission: HUMAN_RESOURCES_EMPLOYEE_SEARCH_PERMISSION,
						factVersion: 1,
					},
				})),
			);
			if (!projected.ok) {
				return projected;
			}
			documents.push(...projected.data);
		}
		visited += employees.length;
		if (employees.length === 0 && visited < totalCount) {
			return fail(
				"INTERNAL_ERROR",
				"Human Resources search projection pagination ended early",
			);
		}

		page += 1;
	} while (visited < totalCount);

	const indexed = await deps.listIds({
		organizationId: input.organizationId,
		entity: HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY,
	});
	if (!indexed.ok) {
		return indexed;
	}
	let pruned = 0;
	const staleDocumentIds = indexed.data.filter(
		(documentId) => !liveIds.has(documentId),
	);
	const deleteResults = await Promise.all(
		staleDocumentIds.map((documentId) =>
			deps.deleteDocument({
				organizationId: input.organizationId,
				entity: HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY,
				documentId,
			}),
		),
	);
	for (const deleted of deleteResults) {
		if (!deleted.ok) {
			return deleted;
		}
		if (deleted.data.deleted) {
			pruned += 1;
		}
	}

	return ok({
		organizationId: input.organizationId,
		projected: documents.length,
		pruned,
		pages: page - 1,
		documents,
	});
}
