import type { CaLegalCompany, CaLegalCompanyListPage } from "../types";
import { normalizeCorporateCode } from "./code";
import {
	compareCompaniesForList,
	decodeCompanyListCursor,
	encodeCompanyListCursor,
	isAfterCompanyListCursor,
} from "./list-cursor";

function matchesCompanyQuery(company: CaLegalCompany, query: string): boolean {
	const normalizedQuery = normalizeCorporateCode(query);
	if (normalizedQuery.length === 0) return true;
	return (
		normalizeCorporateCode(company.code).includes(normalizedQuery) ||
		company.normalizedCode.includes(normalizedQuery)
	);
}

export function paginateLegalCompanies(
	companies: readonly CaLegalCompany[],
	filter: {
		status?: CaLegalCompany["status"];
		query?: string;
		normalizedQuery?: string;
		cursor?: string;
		limit: number;
	},
): CaLegalCompanyListPage {
	const searchQuery = filter.normalizedQuery ?? filter.query;
	const cursor = filter.cursor ? decodeCompanyListCursor(filter.cursor) : null;

	const filtered = companies
		.filter(
			(company) =>
				(filter.status === undefined || company.status === filter.status) &&
				(searchQuery === undefined ||
					matchesCompanyQuery(company, searchQuery)),
		)
		.filter((company) =>
			cursor ? isAfterCompanyListCursor(company, cursor) : true,
		)
		.sort(compareCompaniesForList);

	const pageItems = filtered.slice(0, filter.limit);
	const lastItem = pageItems.at(-1);
	const hasMore = filtered.length > filter.limit;

	return {
		items: pageItems,
		total: companies.filter(
			(company) =>
				(filter.status === undefined || company.status === filter.status) &&
				(searchQuery === undefined ||
					matchesCompanyQuery(company, searchQuery)),
		).length,
		nextCursor:
			hasMore && lastItem
				? encodeCompanyListCursor({
						createdAt: lastItem.createdAt.toISOString(),
						id: lastItem.id,
					})
				: null,
	};
}
