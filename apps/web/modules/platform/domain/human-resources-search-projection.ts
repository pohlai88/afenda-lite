import { fail, ok, type Result } from "@afenda/errors/result";
import { type EmployeeListPage, listEmployees } from "@afenda/human-resources";
import {
	type SearchDocument,
	type SearchUpsertInput,
	upsertSearchDocuments,
} from "@afenda/search";

import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";

const SEARCH_PAGE_SIZE = 100;
const HUMAN_RESOURCES_EMPLOYEE_SEARCH_ENTITY = "human_resources_employee";

export type RebuildHumanResourcesEmployeeSearchInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
};

export type HumanResourcesEmployeeSearchProjectionResult = {
	organizationId: string;
	projected: number;
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
};

function productionDeps(): HumanResourcesEmployeeSearchProjectionDeps {
	return {
		list: (input) => listEmployees(input, createHumanResourcesCommandOptions()),
		upsert: (input) => upsertSearchDocuments(input),
	};
}

export async function rebuildHumanResourcesEmployeeSearch(
	input: RebuildHumanResourcesEmployeeSearchInput,
	deps: HumanResourcesEmployeeSearchProjectionDeps = productionDeps(),
): Promise<Result<HumanResourcesEmployeeSearchProjectionResult>> {
	let page = 1;
	let totalCount = 0;
	let visited = 0;
	const documents: SearchDocument[] = [];

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
						requiredPermission: "human-resources.employee.read",
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

	return ok({
		organizationId: input.organizationId,
		projected: documents.length,
		pages: page - 1,
		documents,
	});
}
