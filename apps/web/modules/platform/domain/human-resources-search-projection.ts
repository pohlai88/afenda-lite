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

export type RebuildHumanResourcesEmployeeSearchInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
};

export type HumanResourcesEmployeeSearchProjectionResult = {
	organizationId: string;
	projected: number;
	pruned: number;
	pages: number;
	documents: SearchDocument[];
};

export type HumanResourcesEmployeeSearchProjectionDeps = {
	list(input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		page: number;
		pageSize: number;
	}): Promise<Result<EmployeeListPage>>;
	upsert(input: SearchUpsertInput[]): Promise<Result<SearchDocument[]>>;
	listIds(input: {
		organizationId: string;
		entity: typeof HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY;
	}): Promise<Result<string[]>>;
	deleteDocument(
		input: SearchDeleteInput,
	): Promise<Result<{ deleted: boolean }>>;
};

export type SearchHumanResourcesEmployeesInput = {
	session: PermissionSession;
	query: string;
	limit?: number;
	offset?: number;
};

export type SearchHumanResourcesEmployeesDeps = {
	hasPermission(session: PermissionSession): Promise<boolean>;
	search(input: {
		organizationId: string;
		query: string;
		entity: typeof HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY;
		limit?: number;
		offset?: number;
	}): Promise<Result<SearchHit[]>>;
};

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
		limit: input.limit,
		offset: input.offset,
	});
	if (!searched.ok) return searched;

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
		const listed = await deps.list({
			...input,
			page,
			pageSize: SEARCH_PAGE_SIZE,
		});
		if (!listed.ok) {
			return listed;
		}
		totalCount = listed.data.totalCount;
		if (
			listed.data.employees.some(
				(employee) => employee.organizationId !== input.organizationId,
			)
		) {
			return fail(
				"INTERNAL_ERROR",
				"Human Resources search projection received a cross-tenant employee",
			);
		}

		if (listed.data.employees.length > 0) {
			for (const employee of listed.data.employees) liveIds.add(employee.id);
			const projected = await deps.upsert(
				listed.data.employees.map((employee) => ({
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
		visited += listed.data.employees.length;
		if (listed.data.employees.length === 0 && visited < totalCount) {
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
	if (!indexed.ok) return indexed;
	let pruned = 0;
	for (const documentId of indexed.data) {
		if (liveIds.has(documentId)) continue;
		const deleted = await deps.deleteDocument({
			organizationId: input.organizationId,
			entity: HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY,
			documentId,
		});
		if (!deleted.ok) return deleted;
		if (deleted.data.deleted) pruned += 1;
	}

	return ok({
		organizationId: input.organizationId,
		projected: documents.length,
		pruned,
		pages: page - 1,
		documents,
	});
}
